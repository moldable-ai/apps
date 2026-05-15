import { useQuery } from '@tanstack/react-query'
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import { parseJson } from './lib/api'
import { SceneViewer } from './components/scene-viewer'
import type {
  Exploration,
  GeneratedExploration,
  LibraryResponse,
} from '../shared/types'

type SceneBoundaryProps = {
  children: ReactNode
  resetKey: string
}

type SceneBoundaryState = {
  crashed: boolean
}

class SceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  state: SceneBoundaryState = { crashed: false }

  static getDerivedStateFromError(): SceneBoundaryState {
    return { crashed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Microscope widget scene failed:', error, info)
  }

  componentDidUpdate(previous: SceneBoundaryProps): void {
    if (previous.resetKey !== this.props.resetKey && this.state.crashed) {
      this.setState({ crashed: false })
    }
  }

  render() {
    if (this.state.crashed) return null
    return this.props.children
  }
}

function hasGeneratedModel(exploration: GeneratedExploration) {
  return (
    exploration.status === 'ready' &&
    exploration.modelStatus === 'ready' &&
    Boolean(exploration.modelUrl)
  )
}

function useCyclingIndex(count: number) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const fadeTimer = useRef<number | null>(null)

  useEffect(() => {
    setIndex(0)
    setVisible(true)
  }, [count])

  useEffect(() => {
    if (count < 2) return undefined

    const interval = window.setInterval(() => {
      setVisible(false)
      if (fadeTimer.current !== null) {
        window.clearTimeout(fadeTimer.current)
      }
      fadeTimer.current = window.setTimeout(() => {
        setIndex((current) => (current + 1) % count)
        setVisible(true)
        fadeTimer.current = null
      }, 550)
    }, 10_000)

    return () => {
      window.clearInterval(interval)
      if (fadeTimer.current !== null) {
        window.clearTimeout(fadeTimer.current)
        fadeTimer.current = null
      }
    }
  }, [count])

  return { index, visible }
}

export function Widget() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const libraryQuery = useQuery({
    queryKey: ['microscope-widget', workspaceId],
    queryFn: async () =>
      parseJson<LibraryResponse>(
        await fetchWithWorkspace('/api/library'),
        'Microscope library could not be loaded.',
      ),
    refetchInterval: (query) =>
      query.state.data?.generated.some((item) => item.status === 'generating')
        ? 3000
        : false,
  })

  const generated = libraryQuery.data?.generated
  const models: Exploration[] = useMemo(
    () => (generated ?? []).filter(hasGeneratedModel),
    [generated],
  )
  const { index, visible } = useCyclingIndex(models.length)
  const active = models[index % models.length]

  return (
    <div className="bg-background relative h-full overflow-hidden">
      {active ? (
        <div
          key={active.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <SceneBoundary resetKey={active.id}>
            <SceneViewer
              exploration={active}
              autoRotate
              cameraFov={34}
              cameraPosition={[0, 0.12, 3.35]}
              enableControls={false}
              rotationMode="widget"
              sceneScale={2.35}
              showGround={false}
              viewMode="3d"
            />
          </SceneBoundary>
        </div>
      ) : null}
    </div>
  )
}
