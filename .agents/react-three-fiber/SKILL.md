---
name: react-three-fiber
description: Build 3D applications with React Three Fiber (R3F), the React renderer for Three.js. Use this skill when building 3D scenes with React, using declarative JSX for 3D objects, integrating Three.js with React state/lifecycle, or using Drei helpers. Covers Canvas setup, hooks, Drei utilities, performance patterns, and state management for 3D React apps.
---

# React Three Fiber

React Three Fiber (R3F) is a React renderer for Three.js. Write declarative, component-based 3D scenes using JSX.

> **Library Versions (2026)**
> - React Three Fiber: v9.5+
> - @react-three/drei: v9.116+
> - @react-three/rapier: v2+
> - @react-three/postprocessing: v3+
> - React: 19+ (concurrent features supported)

## Decision Frameworks

### When to Use R3F vs Vanilla Three.js

```
Is your app already React-based?
  → Yes: Use R3F (natural integration)
  → No: Consider vanilla Three.js

Do you need React state management?
  → Yes: Use R3F (seamless state integration)
  → No: Either works

Is the 3D scene the entire app?
  → Yes: Either works (R3F has slight overhead)
  → No, mixed with React UI: Use R3F

Performance-critical with millions of objects?
  → Consider vanilla Three.js for maximum control
  → R3F is fine for 99% of use cases
```

### When to Use Which State Management

```
Local component state (single mesh color, hover)?
  → useState / useRef

Shared between few components (selected object)?
  → React Context or prop drilling

Global game/app state (score, inventory, settings)?
  → Zustand (recommended for R3F)

Complex state with actions/reducers?
  → Zustand with slices or Redux Toolkit

Need state persistence?
  → Zustand with persist middleware
```

### When to Use Which Drei Component

```
Need camera controls?
  ├─ Orbit around object → OrbitControls
  ├─ First-person → PointerLockControls
  ├─ Map/top-down → MapControls
  └─ Smooth transitions → CameraControls

Need environment lighting?
  ├─ Quick preset → <Environment preset="sunset" />
  ├─ Custom HDR → <Environment files="/env.hdr" />
  └─ Performance-sensitive → <Environment blur={0.5} />

Need text?
  ├─ 3D text in scene → <Text3D />
  ├─ 2D text billboards → <Text />
  └─ HTML overlay → <Html />

Need loading?
  ├─ GLTF models → useGLTF
  ├─ Textures → useTexture
  ├─ Progress UI → useProgress
  └─ Preloading → <Preload all />
```

## Core Setup

```jsx
import { Canvas } from '@react-three/fiber'

function App() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 75 }}
      gl={{ antialias: true }}
      shadows
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} castShadow />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </Canvas>
  )
}
```

### Canvas Props

```jsx
<Canvas
  camera={{ position, fov, near, far }}  // Camera config
  gl={{ antialias, alpha, powerPreference }}  // WebGL context
  shadows  // Enable shadow maps
  dpr={[1, 2]}  // Device pixel ratio range
  frameloop="demand"  // "always" | "demand" | "never"
  style={{ width: '100%', height: '100vh' }}
  onCreated={({ gl, scene, camera }) => {}}  // Access internals
/>
```

## Essential Hooks

### useFrame - Animation Loop

```jsx
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

function SpinningBox() {
  const meshRef = useRef()

  useFrame((state, delta) => {
    // state: { clock, camera, scene, gl, pointer, ... }
    meshRef.current.rotation.y += delta
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime)
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

### useThree - Access Internals

```jsx
import { useThree } from '@react-three/fiber'

function CameraLogger() {
  const { camera, gl, scene, size, viewport, pointer } = useThree()
  // viewport: { width, height } in Three.js units
  // size: { width, height } in pixels
  // pointer: normalized mouse position (-1 to 1)
  return null
}
```

### useLoader - Asset Loading

```jsx
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

function Model() {
  const gltf = useLoader(GLTFLoader, '/model.glb')
  const texture = useLoader(TextureLoader, '/texture.jpg')

  return <primitive object={gltf.scene} />
}
```

## JSX to Three.js Mapping

```jsx
// Three.js class → camelCase JSX element
// Constructor args → args prop (array)
// Properties → props

// THREE.Mesh
<mesh position={[0, 1, 0]} rotation={[0, Math.PI, 0]} scale={1.5}>
  {/* THREE.BoxGeometry(1, 2, 1) */}
  <boxGeometry args={[1, 2, 1]} />
  {/* THREE.MeshStandardMaterial({ color: 'red' }) */}
  <meshStandardMaterial color="red" roughness={0.5} />
</mesh>

// Nested properties use dash notation
<directionalLight
  position={[5, 5, 5]}
  castShadow
  shadow-mapSize={[2048, 2048]}
  shadow-camera-far={50}
/>

// Attach to parent properties
<mesh>
  <boxGeometry />
  <meshStandardMaterial>
    <texture attach="map" image={img} />
  </meshStandardMaterial>
</mesh>
```

## Drei - Essential Helpers

Drei provides production-ready abstractions. Install: `@react-three/drei`

```jsx
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  useGLTF,
  useTexture,
  Text,
  Html,
  Float,
  Stage,
  ContactShadows,
  Sky,
  Stars,
} from '@react-three/drei'
```

### Common Drei Components

```jsx
// Camera controls
<OrbitControls enableDamping dampingFactor={0.05} />

// Environment lighting (HDR)
<Environment preset="sunset" background />
// Presets: apartment, city, dawn, forest, lobby, night, park, studio, sunset, warehouse

// Load GLTF with draco support
const { scene, nodes, materials } = useGLTF('/model.glb')
useGLTF.preload('/model.glb')

// Load textures
const [colorMap, normalMap] = useTexture(['/color.jpg', '/normal.jpg'])

// 3D Text
<Text fontSize={1} color="white" anchorX="center" anchorY="middle">
  Hello World
</Text>

// HTML overlay in 3D space
<Html position={[0, 2, 0]} center transform occlude>
  <div className="label">Click me</div>
</Html>

// Floating animation
<Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
  <mesh>...</mesh>
</Float>

// Quick studio lighting
<Stage environment="city" intensity={0.5}>
  <Model />
</Stage>

// Soft shadows on ground
<ContactShadows position={[0, -0.5, 0]} opacity={0.5} blur={2} />
```

## Event Handling

```jsx
<mesh
  onClick={(e) => {
    e.stopPropagation()
    console.log('clicked', e.point, e.face)
  }}
  onPointerOver={(e) => setHovered(true)}
  onPointerOut={(e) => setHovered(false)}
  onPointerMove={(e) => console.log(e.point)}
  onPointerDown={(e) => {}}
  onPointerUp={(e) => {}}
  onDoubleClick={(e) => {}}
  onContextMenu={(e) => {}}
>
```

Event object includes: `point`, `face`, `faceIndex`, `distance`, `object`, `eventObject`, `camera`, `ray`.

## State Management

### With Zustand (Recommended)

```jsx
import { create } from 'zustand'

const useStore = create((set) => ({
  score: 0,
  gameState: 'idle',
  addScore: (points) => set((state) => ({ score: state.score + points })),
  startGame: () => set({ gameState: 'playing' }),
}))

function ScoreDisplay() {
  const score = useStore((state) => state.score)
  return <Text>{score}</Text>
}

function GameLogic() {
  const addScore = useStore((state) => state.addScore)
  useFrame(() => {
    // Game logic that calls addScore
  })
  return null
}
```

### With React Context

```jsx
const GameContext = createContext()

function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

// Wrap Canvas content
<Canvas>
  <GameProvider>
    <Scene />
  </GameProvider>
</Canvas>
```

## Performance Patterns

### Instancing

```jsx
import { Instances, Instance } from '@react-three/drei'

function Boxes({ count = 1000 }) {
  return (
    <Instances limit={count}>
      <boxGeometry />
      <meshStandardMaterial />
      {Array.from({ length: count }, (_, i) => (
        <Instance
          key={i}
          position={[Math.random() * 100, Math.random() * 100, Math.random() * 100]}
          color={`hsl(${Math.random() * 360}, 50%, 50%)`}
        />
      ))}
    </Instances>
  )
}
```

### Selective Rendering

```jsx
// Only re-render when needed
<Canvas frameloop="demand">
  {/* Call invalidate() to trigger render */}
</Canvas>

function Controls() {
  const { invalidate } = useThree()
  return <OrbitControls onChange={() => invalidate()} />
}
```

### Memoization

```jsx
// Memoize expensive components
const ExpensiveModel = memo(function ExpensiveModel({ url }) {
  const gltf = useGLTF(url)
  return <primitive object={gltf.scene.clone()} />
})

// Memoize materials/geometries outside components
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshStandardMaterial({ color: 'red' })

function Box() {
  return (
    <mesh geometry={geometry} material={material} />
  )
}
```

### Adaptive Performance

```jsx
import { PerformanceMonitor, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei'

<Canvas>
  <PerformanceMonitor
    onDecline={() => setQuality('low')}
    onIncline={() => setQuality('high')}
  >
    <AdaptiveDpr pixelated />
    <AdaptiveEvents />
    <Scene quality={quality} />
  </PerformanceMonitor>
</Canvas>
```

## Related Skills

| When you need... | Use skill |
|------------------|-----------|
| Vanilla Three.js (no React) | → **threejs** |
| Optimize assets before loading | → **asset-pipeline-3d** |
| Debug visual/performance issues | → **graphics-troubleshooting** |

## Reference Files

- [references/drei.md](references/drei.md) - Complete Drei component reference
- [references/physics.md](references/physics.md) - @react-three/rapier integration
- [references/postprocessing.md](references/postprocessing.md) - @react-three/postprocessing effects
- [references/state.md](references/state.md) - Zustand patterns for R3F
