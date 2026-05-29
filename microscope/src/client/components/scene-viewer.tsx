/* eslint-disable react/no-unknown-property */
import { OrbitControls, RoundedBox, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { ImageOff, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { cn } from '@moldable-ai/ui'
import type { Exploration, ModelRecipe } from '../../shared/types'
import * as THREE from 'three'
import { AsciiEffect } from 'three/examples/jsm/effects/AsciiEffect.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

type SceneViewerProps = {
  exploration: Exploration
  autoRotate: boolean
  viewMode: '2d' | '3d'
  cameraFov?: number
  cameraPosition?: [number, number, number]
  enableControls?: boolean
  rotationMode?: 'standard' | 'preview'
  sceneScale?: number
  showGround?: boolean
  lighting?: SceneLighting
}

export type SceneLighting = {
  brightness: number
  warmth: number
  direction: number
  height: number
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

const MIN_IMAGE_SCALE = 1
const MAX_IMAGE_SCALE = 8
const IMPORTED_MODEL_MAX_DIMENSION = 2.45
const IMPORTED_MODEL_BOTTOM_Y = -0.95

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function temperatureColor(warmth: number) {
  const clamped = clamp(warmth, -1, 1)
  const cool = new THREE.Color('#b9d6ff')
  const neutral = new THREE.Color('#ffffff')
  const warm = new THREE.Color('#ffd5a1')
  return clamped >= 0
    ? neutral.clone().lerp(warm, clamped)
    : neutral.clone().lerp(cool, Math.abs(clamped))
}

function CameraFillLight({
  intensity,
  color,
}: {
  intensity: number
  color: THREE.ColorRepresentation
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const target = useMemo(() => new THREE.Object3D(), [])
  const { camera, scene } = useThree()

  useEffect(() => {
    scene.add(target)
    return () => {
      scene.remove(target)
    }
  }, [scene, target])

  useFrame(() => {
    if (!lightRef.current) return
    lightRef.current.position.copy(camera.position)
    lightRef.current.target = target
    target.position.set(0, 0.1, 0)
    target.updateMatrixWorld()
  })

  return <directionalLight ref={lightRef} intensity={intensity} color={color} />
}

function seeded(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function color(recipe: ModelRecipe, index: number) {
  return recipe.palette[index % recipe.palette.length] ?? '#84c7d9'
}

function prepareImportedModel(object: THREE.Object3D) {
  const scene = object.clone(true)
  scene.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(scene)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDimension = Math.max(size.x, size.y, size.z)

  if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
    return scene
  }

  const scale = IMPORTED_MODEL_MAX_DIMENSION / maxDimension
  scene.scale.setScalar(scale)
  scene.position.set(
    -center.x * scale,
    IMPORTED_MODEL_BOTTOM_Y - box.min.y * scale,
    -center.z * scale,
  )
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  return scene
}

function RotatingGroup({
  autoRotate,
  children,
  rotationMode = 'standard',
  sceneScale = 1,
}: {
  autoRotate: boolean
  children: React.ReactNode
  rotationMode?: 'standard' | 'preview'
  sceneScale?: number
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (autoRotate && ref.current) {
      if (rotationMode === 'preview') {
        ref.current.rotation.y += delta * 0.28
        ref.current.rotation.z += delta * 0.18
      } else {
        ref.current.rotation.y += delta * 0.24
      }
    }
  })
  return (
    <group
      ref={ref}
      scale={sceneScale}
      rotation={rotationMode === 'preview' ? [0.1, -0.1, -0.18] : undefined}
    >
      {children}
    </group>
  )
}

function CellModel({ recipe }: { recipe: ModelRecipe }) {
  const particles = useMemo(
    () =>
      Array.from({ length: Math.round(26 + recipe.density * 56) }, (_, i) => {
        const a = seeded(recipe.seed + i) * Math.PI * 2
        const r = 0.25 + seeded(recipe.seed + i + 20) * 1.28
        return {
          position: [
            Math.cos(a) * r,
            Math.sin(a) * r * 0.72,
            -0.16 + seeded(recipe.seed + i + 40) * 0.48,
          ] as [number, number, number],
          scale: 0.035 + seeded(recipe.seed + i + 80) * 0.12,
        }
      }),
    [recipe],
  )

  return (
    <group rotation={[-0.28, -0.22, 0]}>
      <mesh>
        <sphereGeometry args={[1.62, 64, 64]} />
        <meshPhysicalMaterial
          color={color(recipe, 0)}
          roughness={0.35}
          transmission={0.18}
          transparent
          opacity={0.58}
          clearcoat={0.7}
        />
      </mesh>
      <mesh position={[0.22, 0.02, 0.2]}>
        <sphereGeometry args={[0.58, 48, 48]} />
        <meshStandardMaterial color={color(recipe, 1)} roughness={0.42} />
      </mesh>
      {Array.from({ length: recipe.layers + 2 }, (_, i) => (
        <mesh
          key={i}
          position={[
            -0.72 + seeded(recipe.seed + i * 3) * 1.42,
            -0.56 + seeded(recipe.seed + i * 5) * 1.1,
            0.15 + seeded(recipe.seed + i * 7) * 0.46,
          ]}
          rotation={[seeded(recipe.seed + i) * Math.PI, 0, seeded(i) * Math.PI]}
        >
          <capsuleGeometry args={[0.09, 0.46, 12, 28]} />
          <meshStandardMaterial color={color(recipe, i + 2)} roughness={0.36} />
        </mesh>
      ))}
      {particles.map((particle, index) => (
        <mesh key={index} position={particle.position}>
          <sphereGeometry args={[particle.scale, 16, 16]} />
          <meshStandardMaterial
            color={color(recipe, index + 3)}
            roughness={0.5}
          />
        </mesh>
      ))}
    </group>
  )
}

function OrganismModel({ recipe }: { recipe: ModelRecipe }) {
  return (
    <group rotation={[-0.2, 0.35, -0.08]}>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[(i - 4) * 0.28, Math.sin(i) * 0.12, 0]}>
          <sphereGeometry args={[0.48 - Math.abs(i - 4) * 0.035, 32, 32]} />
          <meshPhysicalMaterial
            color={color(recipe, i)}
            roughness={0.44}
            clearcoat={0.35}
          />
        </mesh>
      ))}
      {Array.from({ length: 14 }, (_, i) => {
        const side = i % 2 === 0 ? 1 : -1
        const x = -1.25 + Math.floor(i / 2) * 0.42
        return (
          <mesh
            key={i}
            position={[x, side * 0.5, -0.04]}
            rotation={[0.9 * side, 0, 0.35 * side]}
          >
            <capsuleGeometry args={[0.035, 0.56, 8, 18]} />
            <meshStandardMaterial
              color={color(recipe, i + 2)}
              roughness={0.5}
            />
          </mesh>
        )
      })}
      <mesh position={[1.55, 0, 0]} rotation={[0, 0, -0.4]}>
        <coneGeometry args={[0.42, 0.92, 32]} />
        <meshStandardMaterial color={color(recipe, 2)} roughness={0.46} />
      </mesh>
    </group>
  )
}

function BranchingModel({ recipe }: { recipe: ModelRecipe }) {
  const branches = useMemo(() => {
    const lines: Array<[THREE.Vector3, THREE.Vector3, number]> = []
    for (let i = 0; i < 42; i += 1) {
      const depth = Math.floor(i / 7)
      const angle = seeded(recipe.seed + i) * Math.PI * 2
      const radius = 0.28 + depth * 0.34
      const from = new THREE.Vector3(
        Math.cos(angle) * radius * 0.42,
        Math.sin(angle) * radius * 0.28,
        -0.08 + depth * 0.08,
      )
      const to = new THREE.Vector3(
        Math.cos(angle + 0.34) * (radius + 0.55),
        Math.sin(angle + 0.28) * (radius + 0.38),
        0.08 + depth * 0.12,
      )
      lines.push([from, to, depth])
    }
    return lines
  }, [recipe.seed])

  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.34, 32, 32]} />
        <meshStandardMaterial color={color(recipe, 0)} roughness={0.36} />
      </mesh>
      {branches.map(([from, to, depth], index) => {
        const mid = from.clone().lerp(to, 0.5)
        const length = from.distanceTo(to)
        const direction = to.clone().sub(from).normalize()
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction,
        )
        return (
          <group key={index} position={mid} quaternion={quaternion}>
            <mesh>
              <capsuleGeometry args={[0.025 + depth * 0.009, length, 8, 16]} />
              <meshStandardMaterial
                color={color(recipe, index)}
                roughness={0.5}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function TerrainModel({ recipe }: { recipe: ModelRecipe }) {
  const geometry = useMemo(() => {
    const terrain = new THREE.PlaneGeometry(4.6, 3.2, 80, 56)
    const positions = terrain.attributes.position
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z =
        Math.sin(x * 2.1 + recipe.seed) * 0.18 +
        Math.cos(y * 3.2 + recipe.seed * 0.2) * 0.16 +
        Math.sin((x + y) * 4.8) * 0.08
      positions.setZ(i, z)
    }
    terrain.computeVertexNormals()
    return terrain
  }, [recipe.seed])

  return (
    <group rotation={[-1.03, 0, 0.08]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={color(recipe, 0)}
          roughness={0.62}
          metalness={0.02}
          vertexColors={false}
        />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => (
        <mesh
          key={i}
          position={[
            -1.9 + seeded(recipe.seed + i) * 3.8,
            -1.15 + seeded(recipe.seed + i + 40) * 2.3,
            0.28 + seeded(recipe.seed + i + 80) * 0.5,
          ]}
        >
          <sphereGeometry
            args={[0.08 + seeded(recipe.seed + i + 4) * 0.12, 16, 16]}
          />
          <meshStandardMaterial color={color(recipe, i + 1)} roughness={0.42} />
        </mesh>
      ))}
    </group>
  )
}

function MoleculeModel({ recipe }: { recipe: ModelRecipe }) {
  const atoms = useMemo(
    () =>
      Array.from({ length: 12 + recipe.layers }, (_, i) => ({
        position: [
          Math.cos((i / 6) * Math.PI * 2) * (0.65 + (i % 3) * 0.28),
          Math.sin((i / 6) * Math.PI * 2) * (0.65 + (i % 3) * 0.22),
          Math.sin(i * 1.7) * 0.46,
        ] as [number, number, number],
        size: 0.12 + (i % 4) * 0.035,
      })),
    [recipe.layers],
  )

  return (
    <group>
      {atoms.map((atom, index) => (
        <mesh key={index} position={atom.position}>
          <sphereGeometry args={[atom.size, 28, 28]} />
          <meshStandardMaterial color={color(recipe, index)} roughness={0.32} />
        </mesh>
      ))}
      {atoms.slice(1).map((atom, index) => {
        const from = new THREE.Vector3(...atoms[index].position)
        const to = new THREE.Vector3(...atom.position)
        const mid = from.clone().lerp(to, 0.5)
        const length = from.distanceTo(to)
        const direction = to.clone().sub(from).normalize()
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction,
        )
        return (
          <group key={index} position={mid} quaternion={quaternion}>
            <mesh>
              <cylinderGeometry args={[0.025, 0.025, length, 10]} />
              <meshStandardMaterial color={color(recipe, 2)} roughness={0.48} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function WeatherModel({ recipe }: { recipe: ModelRecipe }) {
  return (
    <group rotation={[0.2, 0, 0]}>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh
          key={i}
          rotation={[Math.PI / 2, 0, i * 0.55]}
          scale={[1 + i * 0.14, 1 + i * 0.14, 1]}
        >
          <torusGeometry
            args={[0.45 + i * 0.17, 0.025 + i * 0.002, 12, 96, Math.PI * 1.45]}
          />
          <meshStandardMaterial color={color(recipe, i)} roughness={0.4} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshPhysicalMaterial
          color={color(recipe, 2)}
          transparent
          opacity={0.52}
        />
      </mesh>
    </group>
  )
}

function AstronomyModel({ recipe }: { recipe: ModelRecipe }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.86, 64, 64]} />
        <meshStandardMaterial
          color={color(recipe, 0)}
          emissive={color(recipe, 1)}
          emissiveIntensity={0.24}
          roughness={0.45}
        />
      </mesh>
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} rotation={[0.45 + i * 0.2, 0.1, i * 0.8]}>
          <torusGeometry args={[1.15 + i * 0.28, 0.018, 10, 128]} />
          <meshStandardMaterial color={color(recipe, i + 1)} roughness={0.42} />
        </mesh>
      ))}
      {Array.from({ length: 24 }, (_, i) => {
        const angle = seeded(recipe.seed + i) * Math.PI * 2
        const radius = 1.4 + seeded(recipe.seed + i + 4) * 1.4
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle) * radius * 0.16,
              Math.sin(angle) * radius,
            ]}
          >
            <sphereGeometry
              args={[0.02 + seeded(recipe.seed + i + 8) * 0.05, 10, 10]}
            />
            <meshBasicMaterial color={color(recipe, i)} />
          </mesh>
        )
      })}
    </group>
  )
}

function MachineModel({ recipe }: { recipe: ModelRecipe }) {
  return (
    <group rotation={[-0.35, 0.32, 0]}>
      {Array.from({ length: 6 }, (_, layer) => (
        <RoundedBox
          key={layer}
          args={[3.4 - layer * 0.16, 2.2 - layer * 0.12, 0.08]}
          radius={0.04}
          smoothness={4}
          position={[0, 0, layer * 0.18]}
        >
          <meshStandardMaterial color={color(recipe, layer)} roughness={0.5} />
        </RoundedBox>
      ))}
      {Array.from({ length: 32 }, (_, i) => (
        <mesh
          key={i}
          position={[
            -1.45 + (i % 8) * 0.42,
            -0.82 + Math.floor(i / 8) * 0.54,
            1.04,
          ]}
        >
          <boxGeometry args={[0.22, 0.16, 0.16]} />
          <meshStandardMaterial color={color(recipe, i + 2)} roughness={0.34} />
        </mesh>
      ))}
    </group>
  )
}

function GeneratedGlbModel({ modelUrl }: { modelUrl: string }) {
  const gltf = useGLTF(modelUrl)
  const scene = useMemo(() => prepareImportedModel(gltf.scene), [gltf.scene])

  return (
    <group rotation={[-0.22, 0.36, 0]}>
      <primitive object={scene} />
    </group>
  )
}

function PreparedObjModel({
  object,
  texture,
}: {
  object: THREE.Group
  texture?: THREE.Texture
}) {
  const scene = useMemo(() => {
    const cloned = object.clone(true)
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace
      cloned.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.58,
            metalness: 0.02,
          })
        }
      })
    }
    return prepareImportedModel(cloned)
  }, [object, texture])

  return (
    <group rotation={[-0.22, 0.36, 0]}>
      <primitive object={scene} />
    </group>
  )
}

function GeneratedTexturedObjModel({
  modelUrl,
  textureUrl,
}: {
  modelUrl: string
  textureUrl: string
}) {
  const object = useLoader(OBJLoader, modelUrl)
  const texture = useLoader(THREE.TextureLoader, textureUrl)
  return <PreparedObjModel object={object} texture={texture} />
}

function GeneratedObjModel({ modelUrl }: { modelUrl: string }) {
  const object = useLoader(OBJLoader, modelUrl)
  return <PreparedObjModel object={object} />
}

function GeneratedModel({
  modelUrl,
  textureUrl,
}: {
  modelUrl: string
  textureUrl?: string | null
}) {
  if (/\.obj(?:[?#]|$)/i.test(modelUrl)) {
    return textureUrl ? (
      <GeneratedTexturedObjModel modelUrl={modelUrl} textureUrl={textureUrl} />
    ) : (
      <GeneratedObjModel modelUrl={modelUrl} />
    )
  }

  return <GeneratedGlbModel modelUrl={modelUrl} />
}

export function GeneratingAsciiScene() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    let width = Math.max(1, container.clientWidth)
    let height = Math.max(1, container.clientHeight)

    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000)
    camera.position.set(0, 0, 520)

    const scene = new THREE.Scene()

    const keyLight = new THREE.PointLight(0xffffff, 3.2, 0, 0)
    keyLight.position.set(500, 500, 500)
    scene.add(keyLight)

    const fillLight = new THREE.PointLight(0xffffff, 1.0, 0, 0)
    fillLight.position.set(-500, -500, -500)
    scene.add(fillLight)

    const geometry = new THREE.SphereGeometry(200, 20, 10)
    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      flatShading: true,
    })
    const sphere = new THREE.Mesh(geometry, material)
    scene.add(sphere)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    const effect = new AsciiEffect(renderer, ' .:-+*=%@#', { invert: true })
    effect.setSize(width, height)

    const ascii = effect.domElement as HTMLDivElement
    ascii.style.position = 'absolute'
    ascii.style.top = '50%'
    ascii.style.left = '50%'
    ascii.style.transform = 'translate(-50%, -50%)'
    ascii.style.color = 'rgba(159, 216, 227, 0.92)'
    ascii.style.backgroundColor = 'transparent'
    ascii.style.pointerEvents = 'none'
    const vignetteMask =
      'radial-gradient(ellipse at center, black 32%, rgba(0,0,0,0.75) 58%, rgba(0,0,0,0.25) 82%, transparent 100%)'
    ascii.style.setProperty('mask-image', vignetteMask)
    ascii.style.setProperty('-webkit-mask-image', vignetteMask)
    ascii.style.setProperty('mask-mode', 'alpha')
    ascii.style.setProperty('-webkit-mask-mode', 'alpha')
    ascii.setAttribute('aria-hidden', 'true')

    container.appendChild(ascii)

    const start = performance.now()
    let raf = 0

    const tick = () => {
      const t = performance.now() - start
      sphere.rotation.x = t * 0.00028
      sphere.rotation.y = t * 0.00018
      sphere.rotation.z = t * 0.00022
      effect.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const resize = () => {
      const nextWidth = Math.max(1, container.clientWidth)
      const nextHeight = Math.max(1, container.clientHeight)
      if (nextWidth === width && nextHeight === height) return
      width = nextWidth
      height = nextHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      effect.setSize(width, height)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(container)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      if (ascii.parentNode === container) {
        container.removeChild(ascii)
      }
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none overflow-hidden"
    />
  )
}

function ProceduralModel({ recipe }: { recipe: ModelRecipe }) {
  switch (recipe.kind) {
    case 'cell':
      return <CellModel recipe={recipe} />
    case 'organism':
      return <OrganismModel recipe={recipe} />
    case 'branching':
      return <BranchingModel recipe={recipe} />
    case 'terrain':
      return <TerrainModel recipe={recipe} />
    case 'molecule':
      return <MoleculeModel recipe={recipe} />
    case 'weather':
      return <WeatherModel recipe={recipe} />
    case 'astronomy':
      return <AstronomyModel recipe={recipe} />
    case 'machine':
      return <MachineModel recipe={recipe} />
    case 'image-relief':
      return <CellModel recipe={recipe} />
    default:
      return <CellModel recipe={recipe} />
  }
}

function SceneContents({
  exploration,
  autoRotate,
  enableControls = true,
  rotationMode = 'standard',
  sceneScale = 1,
  showGround = true,
  viewMode,
  lighting,
}: SceneViewerProps) {
  const modelUrl =
    exploration.source === 'generated' &&
    exploration.status === 'ready' &&
    exploration.modelStatus === 'ready'
      ? exploration.modelUrl
      : null
  const hasRealModel = viewMode === '3d' && modelUrl
  const brightness = clamp(lighting?.brightness ?? 1.15, 0.45, 2.4)
  const direction = clamp(lighting?.direction ?? 0.2, -1, 1)
  const height = clamp(lighting?.height ?? 0.65, 0, 1)
  const lightColor = temperatureColor(lighting?.warmth ?? 0.05)
  const keyPosition: [number, number, number] = [
    3.6 * direction,
    1.5 + height * 4.2,
    3.2,
  ]
  const fillPosition: [number, number, number] = [
    -2.8 * Math.sign(direction || 1),
    1.15,
    2.6,
  ]
  const rimPosition: [number, number, number] = [
    -keyPosition[0] * 0.75,
    2.35,
    -3.8,
  ]

  return (
    <>
      <ambientLight intensity={0.82 * brightness} />
      <hemisphereLight
        color={lightColor}
        groundColor="#26282d"
        intensity={0.38 * brightness}
      />
      <directionalLight
        position={keyPosition}
        intensity={1.85 * brightness}
        color={lightColor}
      />
      <CameraFillLight intensity={0.72 * brightness} color="#ffffff" />
      <directionalLight
        position={rimPosition}
        intensity={0.88 * brightness}
        color={lightColor}
      />
      <pointLight
        position={fillPosition}
        intensity={0.56 * brightness}
        color="#d7efff"
      />
      <pointLight
        position={[0, -1.2, 2.8]}
        intensity={0.26 * brightness}
        color="#ffffff"
      />
      <RotatingGroup
        autoRotate={viewMode === '3d' && autoRotate}
        rotationMode={rotationMode}
        sceneScale={sceneScale}
      >
        {hasRealModel && modelUrl ? (
          <GeneratedModel
            modelUrl={modelUrl}
            textureUrl={
              exploration.source === 'generated'
                ? exploration.modelTextureUrl
                : null
            }
          />
        ) : null}
        {!hasRealModel ? <ProceduralModel recipe={exploration.model} /> : null}
      </RotatingGroup>
      {showGround ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.95, 0]}>
          <circleGeometry args={[3.8, 96]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.04} />
        </mesh>
      ) : null}
      {enableControls ? (
        <OrbitControls
          enablePan
          enableDamping
          dampingFactor={0.08}
          minDistance={0.45}
          maxDistance={8}
        />
      ) : null}
    </>
  )
}

function ZoomableImage({
  imageUrl,
  fallbackUrl,
}: {
  imageUrl: string
  fallbackUrl?: string | null
}) {
  const [scale, setScale] = useState(MIN_IMAGE_SCALE)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [controlsVisible, setControlsVisible] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const dragRef = useRef<DragState | null>(null)
  const controlsTimerRef = useRef<number | null>(null)
  const displayUrl = usingFallback && fallbackUrl ? fallbackUrl : imageUrl

  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current !== null) {
      window.clearTimeout(controlsTimerRef.current)
      controlsTimerRef.current = null
    }
  }, [])

  const revealControls = useCallback(() => {
    clearControlsTimer()
    setControlsVisible(true)
    controlsTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false)
      controlsTimerRef.current = null
    }, 5000)
  }, [clearControlsTimer])

  useEffect(() => {
    setScale(MIN_IMAGE_SCALE)
    setPan({ x: 0, y: 0 })
    setLoadFailed(false)
    setUsingFallback(false)
    dragRef.current = null
    revealControls()
  }, [fallbackUrl, imageUrl, revealControls])

  useEffect(() => clearControlsTimer, [clearControlsTimer])

  function setZoom(nextScale: number) {
    revealControls()
    const next = clamp(nextScale, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE)
    setScale(next)
    if (next === MIN_IMAGE_SCALE) {
      setPan({ x: 0, y: 0 })
    }
  }

  function zoomBy(multiplier: number) {
    revealControls()
    setScale((current) => {
      const next = clamp(current * multiplier, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE)
      if (next === MIN_IMAGE_SCALE) {
        setPan({ x: 0, y: 0 })
      }
      return next
    })
  }

  function reset() {
    revealControls()
    setScale(MIN_IMAGE_SCALE)
    setPan({ x: 0, y: 0 })
    dragRef.current = null
  }

  return (
    <div
      className="relative size-full overflow-hidden"
      onPointerEnter={revealControls}
      onWheel={(event) => {
        event.preventDefault()
        revealControls()
        zoomBy(event.deltaY > 0 ? 0.88 : 1.14)
      }}
      onDoubleClick={() => {
        revealControls()
        if (scale > MIN_IMAGE_SCALE) reset()
        else setZoom(2.25)
      }}
      onPointerDown={(event) => {
        revealControls()
        if (scale <= MIN_IMAGE_SCALE) return
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: pan.x,
          originY: pan.y,
        }
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        revealControls()
        setPan({
          x: drag.originX + event.clientX - drag.startX,
          y: drag.originY + event.clientY - drag.startY,
        })
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId === event.pointerId) {
          dragRef.current = null
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      }}
      onPointerCancel={(event) => {
        if (dragRef.current?.pointerId === event.pointerId) {
          dragRef.current = null
        }
      }}
      role="application"
      aria-label="Zoomable 2D microscope image"
    >
      <div
        className="grid size-full place-items-center p-8"
        style={{
          cursor:
            scale > MIN_IMAGE_SCALE
              ? dragRef.current
                ? 'grabbing'
                : 'grab'
              : 'zoom-in',
        }}
      >
        <img
          src={displayUrl}
          alt=""
          draggable={false}
          onError={() => {
            if (!usingFallback && fallbackUrl && fallbackUrl !== imageUrl) {
              setUsingFallback(true)
              return
            }
            setLoadFailed(true)
          }}
          onLoad={() => setLoadFailed(false)}
          className="max-h-full max-w-full select-none object-contain drop-shadow-2xl transition-transform duration-100 ease-out"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
            transformOrigin: 'center',
            touchAction: 'none',
            visibility: loadFailed ? 'hidden' : 'visible',
          }}
        />
        {loadFailed ? (
          <div className="border-destructive/45 bg-background/90 text-foreground absolute left-1/2 top-1/2 flex max-w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-lg border p-4 text-center shadow-xl backdrop-blur-xl">
            <ImageOff className="text-destructive size-5" />
            <div>
              <p className="text-sm font-medium">Image could not be loaded</p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                The saved image file is missing or invalid. Regenerate this
                exploration to replace it.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-4 transition-all duration-500 ease-out',
          controlsVisible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-1 opacity-0',
        )}
      >
        <div
          className={cn(
            'border-border/70 bg-background/85 text-muted-foreground flex items-center gap-0.5 rounded-full border px-1.5 py-1 shadow-lg backdrop-blur-xl',
            controlsVisible && 'pointer-events-auto',
          )}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="hover:bg-muted/70 flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-default disabled:opacity-40"
            onClick={() => zoomBy(0.72)}
            disabled={scale <= MIN_IMAGE_SCALE}
            aria-label="Zoom out"
          >
            <ZoomOut className="size-4" />
          </button>
          <div className="min-w-12 px-1 text-center text-[11px] tabular-nums">
            {Math.round(scale * 100)}%
          </div>
          <button
            type="button"
            className="hover:bg-muted/70 flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-default disabled:opacity-40"
            onClick={() => zoomBy(1.38)}
            disabled={scale >= MAX_IMAGE_SCALE}
            aria-label="Zoom in"
          >
            <ZoomIn className="size-4" />
          </button>
          <div className="bg-border/70 mx-0.5 h-5 w-px" />
          <button
            type="button"
            className="hover:bg-muted/70 flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-default disabled:opacity-40"
            onClick={reset}
            disabled={scale === MIN_IMAGE_SCALE && pan.x === 0 && pan.y === 0}
            aria-label="Reset zoom"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function SceneViewer(props: SceneViewerProps) {
  const imageUrl =
    props.exploration.source === 'generated' && props.exploration.imageUrl
      ? props.exploration.imageUrl
      : null
  const fallbackImageUrl =
    props.exploration.source === 'generated' && props.exploration.sourceImageUrl
      ? props.exploration.sourceImageUrl
      : null
  const modelUrl =
    props.exploration.source === 'generated' &&
    props.exploration.status === 'ready' &&
    props.exploration.modelStatus === 'ready'
      ? props.exploration.modelUrl
      : null
  const sceneKey = [
    props.exploration.id,
    props.viewMode,
    modelUrl ?? imageUrl ?? props.exploration.model.kind,
  ].join(':')

  if (props.viewMode === '2d' && imageUrl) {
    return <ZoomableImage imageUrl={imageUrl} fallbackUrl={fallbackImageUrl} />
  }

  const hasRealModel = props.viewMode === '3d' && modelUrl
  if (!hasRealModel && imageUrl) {
    return <ZoomableImage imageUrl={imageUrl} fallbackUrl={fallbackImageUrl} />
  }

  if (!hasRealModel) {
    return <GeneratingAsciiScene />
  }

  return (
    <Canvas
      key={sceneKey}
      camera={{
        position: props.cameraPosition ?? [0, 0.35, 5.2],
        fov: props.cameraFov ?? 42,
        near: 0.02,
      }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: clamp(
          props.lighting?.brightness ?? 1.15,
          0.8,
          1.8,
        ),
      }}
    >
      <Suspense fallback={null}>
        <SceneContents {...props} />
      </Suspense>
    </Canvas>
  )
}
