import {
  type ButtonHTMLAttributes,
  Component,
  type ErrorInfo,
  type InputHTMLAttributes,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

export const WORKSPACE_HEADER = 'x-moldable-workspace'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface WorkspaceContextValue {
  workspaceId: string
  fetchWithWorkspace: (input: string, init?: RequestInit) => Promise<Response>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

function urlParam(name: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceId] = useState(
    () => urlParam('workspace') ?? 'personal',
  )

  useEffect(() => {
    const handleUrlChange = () => {
      const next = urlParam('workspace')
      if (next) setWorkspaceId(next)
    }
    window.addEventListener('popstate', handleUrlChange)
    return () => window.removeEventListener('popstate', handleUrlChange)
  }, [])

  const fetchWithWorkspace = useCallback(
    (input: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      headers.set(WORKSPACE_HEADER, workspaceId)
      return fetch(input, { ...init, headers })
    },
    [workspaceId],
  )

  const value = useMemo(
    () => ({ workspaceId, fetchWithWorkspace }),
    [workspaceId, fetchWithWorkspace],
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function storedTheme(): Theme {
  const fromUrl = urlParam('theme')
  if (fromUrl === 'light' || fromUrl === 'dark' || fromUrl === 'system') {
    return fromUrl
  }
  const stored = localStorage.getItem('moldable-theme')
  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => storedTheme())

  useEffect(() => {
    const resolved = theme === 'system' ? systemTheme() : theme
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(resolved)
    localStorage.setItem('moldable-theme', theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => {
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(systemTheme())
    }
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: theme === 'system' ? systemTheme() : theme,
      setTheme,
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

const ThemeContext = createContext<{
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
} | null>(null)

export function isInMoldable() {
  return typeof window !== 'undefined' && window.parent !== window
}

export function sendToMoldable(message: Record<string, unknown>) {
  if (isInMoldable()) window.parent.postMessage(message, '*')
}

export function pushMoldableNavigation(entry: Record<string, unknown> = {}) {
  const id =
    typeof entry.id === 'string'
      ? entry.id
      : `nav-${Date.now()}-${Math.random().toString(36).slice(2)}`
  sendToMoldable({ type: 'moldable:navigation-push', entry: { ...entry, id } })
  return id
}

export function popMoldableNavigation(entryId?: string) {
  sendToMoldable({ type: 'moldable:navigation-pop', entryId })
}

export function resetMoldableNavigation() {
  sendToMoldable({ type: 'moldable:navigation-reset' })
}

export function useMoldableNavigationPop(handler: () => void) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'moldable:navigation-pop') handlerRef.current()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])
}

export function installMoldableFrameLifecycle() {
  sendToMoldable({ type: 'moldable:frame-ready' })
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
}

export function Button({
  variant = 'default',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const styles = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline:
      'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive:
      'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  }
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'inline-flex h-5 w-9 cursor-pointer items-center rounded-full border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'bg-background block size-4 rounded-full shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

export class AppErrorBoundary extends Component<
  { appName: string; children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.appName}]`, error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="bg-background text-foreground flex h-screen items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h1 className="text-lg font-semibold">
              {this.props.appName} crashed
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {this.state.error.message}
            </p>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
