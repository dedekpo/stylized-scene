# Drei Components Reference

Complete reference for @react-three/drei helpers.

## Controls

```jsx
import {
  OrbitControls,
  MapControls,
  TrackballControls,
  FlyControls,
  FirstPersonControls,
  PointerLockControls,
  TransformControls,
  PivotControls,
  ScrollControls,
  PresentationControls,
} from '@react-three/drei'

// Orbit around target
<OrbitControls 
  enableDamping
  dampingFactor={0.05}
  minDistance={2}
  maxDistance={20}
  minPolarAngle={0}
  maxPolarAngle={Math.PI / 2}
  target={[0, 0, 0]}
/>

// Map-style panning
<MapControls />

// Scroll-driven animations
<ScrollControls pages={3} damping={0.1}>
  <Scroll>
    {/* Moves with scroll */}
    <Model />
  </Scroll>
  <Scroll html>
    {/* HTML that scrolls */}
    <div style={{ position: 'absolute', top: '100vh' }}>Page 2</div>
  </Scroll>
</ScrollControls>

// Drag to rotate (product viewers)
<PresentationControls
  global
  snap
  rotation={[0, 0, 0]}
  polar={[-Math.PI / 4, Math.PI / 4]}
  azimuth={[-Math.PI / 4, Math.PI / 4]}
>
  <Model />
</PresentationControls>

// Gizmo for object manipulation
<TransformControls object={meshRef} mode="translate" />
// modes: "translate" | "rotate" | "scale"
```

## Cameras

```jsx
import {
  PerspectiveCamera,
  OrthographicCamera,
  CubeCamera,
} from '@react-three/drei'

<PerspectiveCamera makeDefault position={[0, 5, 10]} fov={50} />

<OrthographicCamera 
  makeDefault 
  position={[0, 0, 10]} 
  zoom={50}
/>

// Realtime reflections
<CubeCamera resolution={256} frames={Infinity}>
  {(texture) => (
    <mesh>
      <sphereGeometry />
      <meshStandardMaterial envMap={texture} metalness={1} roughness={0} />
    </mesh>
  )}
</CubeCamera>
```

## Loaders & Assets

```jsx
import {
  useGLTF,
  useTexture,
  useFBX,
  useAnimations,
  useCubeTexture,
  useVideoTexture,
  Preload,
} from '@react-three/drei'

// GLTF with Draco
const { scene, nodes, materials, animations } = useGLTF('/model.glb', true)
useGLTF.preload('/model.glb')

// Multiple textures
const [color, normal, roughness] = useTexture([
  '/color.jpg',
  '/normal.jpg', 
  '/roughness.jpg'
])

// Animations
const { scene, animations } = useGLTF('/character.glb')
const { actions, mixer } = useAnimations(animations, scene)
useEffect(() => {
  actions.walk?.play()
}, [actions])

// Video texture
const videoTexture = useVideoTexture('/video.mp4')

// Cube map
const envMap = useCubeTexture(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'], { path: '/cube/' })

// Preload assets
<Preload all />
```

## Abstractions

```jsx
import {
  Clone,
  Merged,
  Edges,
  Outlines,
  ScreenSpace,
  Billboard,
  ScreenSizer,
  Center,
  Bounds,
  useBounds,
} from '@react-three/drei'

// Clone a scene
<Clone object={gltf.scene} />

// Merge geometries for performance
<Merged meshes={[mesh1, mesh2, mesh3]}>
  {(Mesh1, Mesh2, Mesh3) => (
    <>
      <Mesh1 position={[0, 0, 0]} />
      <Mesh1 position={[1, 0, 0]} />
      <Mesh2 position={[2, 0, 0]} />
    </>
  )}
</Merged>

// Edge rendering
<mesh>
  <boxGeometry />
  <meshBasicMaterial />
  <Edges color="black" threshold={15} />
</mesh>

// Outline effect
<mesh>
  <boxGeometry />
  <meshStandardMaterial />
  <Outlines thickness={0.05} color="black" />
</mesh>

// Always face camera
<Billboard follow lockX={false} lockY={false} lockZ={false}>
  <Text>Always facing you</Text>
</Billboard>

// Center content
<Center>
  <Model />
</Center>

// Fit camera to content
<Bounds fit clip observe margin={1.2}>
  <Model />
</Bounds>
```

## Shapes & Primitives

```jsx
import {
  Box,
  Sphere,
  Plane,
  Cylinder,
  Cone,
  Torus,
  TorusKnot,
  Ring,
  Circle,
  RoundedBox,
  Icosahedron,
  Octahedron,
  Dodecahedron,
  Tetrahedron,
} from '@react-three/drei'

<Box args={[1, 1, 1]} position={[0, 0, 0]}>
  <meshStandardMaterial color="orange" />
</Box>

<Sphere args={[1, 32, 32]}>
  <meshStandardMaterial color="blue" />
</Sphere>

<RoundedBox args={[1, 1, 1]} radius={0.1} smoothness={4}>
  <meshStandardMaterial color="green" />
</RoundedBox>
```

## Text

```jsx
import { Text, Text3D, useFont } from '@react-three/drei'

// SDF text (fast, sharp at any size)
<Text
  font="/font.woff"
  fontSize={1}
  color="white"
  maxWidth={10}
  lineHeight={1.2}
  letterSpacing={0.02}
  textAlign="center"
  anchorX="center"
  anchorY="middle"
  outlineWidth={0.02}
  outlineColor="black"
>
  Hello World
</Text>

// Extruded 3D text
<Text3D
  font="/font.json"
  size={1}
  height={0.2}
  bevelEnabled
  bevelSize={0.02}
  bevelThickness={0.01}
>
  3D Text
  <meshStandardMaterial color="gold" />
</Text3D>
```

## Staging & Lighting

```jsx
import {
  Stage,
  Environment,
  Lightformer,
  Sky,
  Stars,
  Cloud,
  ContactShadows,
  AccumulativeShadows,
  RandomizedLight,
  SoftShadows,
  BakeShadows,
  SpotLight,
  useDepthBuffer,
} from '@react-three/drei'

// Quick product staging
<Stage environment="city" intensity={0.5} adjustCamera={1.5}>
  <Model />
</Stage>

// HDR environments
<Environment 
  preset="sunset"
  background
  blur={0.5}
  ground={{ height: 32, radius: 130 }}
/>

// Custom environment
<Environment>
  <Lightformer position={[0, 5, -5]} scale={10} intensity={2} />
</Environment>

// Procedural sky
<Sky 
  distance={450000}
  sunPosition={[0, 1, 0]}
  inclination={0.5}
  azimuth={0.25}
/>

// Starfield
<Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />

// Soft contact shadows
<ContactShadows 
  position={[0, -0.5, 0]}
  opacity={0.5}
  scale={10}
  blur={2}
  far={4}
/>

// Accumulated soft shadows
<AccumulativeShadows temporal frames={100} position={[0, -0.5, 0]}>
  <RandomizedLight position={[5, 5, -5]} />
</AccumulativeShadows>

// Volumetric spotlight
<SpotLight
  position={[0, 5, 0]}
  angle={0.5}
  penumbra={0.5}
  intensity={1}
  distance={10}
  attenuation={5}
  anglePower={5}
  volumetric
  debug
/>
```

## Shaders & Materials

```jsx
import {
  shaderMaterial,
  MeshReflectorMaterial,
  MeshTransmissionMaterial,
  MeshDistortMaterial,
  MeshWobbleMaterial,
  MeshPortalMaterial,
  GradientTexture,
} from '@react-three/drei'

// Custom shader material
const WaveShaderMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color('hotpink') },
  // vertex shader
  `varying vec2 vUv;
   void main() {
     vUv = uv;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }`,
  // fragment shader
  `uniform float uTime;
   uniform vec3 uColor;
   varying vec2 vUv;
   void main() {
     gl_FragColor = vec4(uColor * sin(uTime), 1.0);
   }`
)

extend({ WaveShaderMaterial })

<mesh>
  <planeGeometry />
  <waveShaderMaterial uTime={clock.elapsedTime} uColor="hotpink" />
</mesh>

// Reflective floor
<mesh rotation={[-Math.PI / 2, 0, 0]}>
  <planeGeometry args={[10, 10]} />
  <MeshReflectorMaterial
    blur={[300, 100]}
    resolution={2048}
    mixBlur={1}
    mixStrength={50}
    roughness={1}
    depthScale={1.2}
    minDepthThreshold={0.4}
    maxDepthThreshold={1.4}
    color="#151515"
    metalness={0.5}
  />
</mesh>

// Glass/transmission
<mesh>
  <sphereGeometry />
  <MeshTransmissionMaterial
    backside
    thickness={0.5}
    roughness={0}
    transmission={1}
    ior={1.5}
    chromaticAberration={0.06}
  />
</mesh>

// Animated distortion
<mesh>
  <sphereGeometry args={[1, 64, 64]} />
  <MeshDistortMaterial color="purple" distort={0.5} speed={2} />
</mesh>
```

## Performance

```jsx
import {
  Instances,
  Instance,
  Merged,
  Detailed,
  Preload,
  useDetectGPU,
  PerformanceMonitor,
  AdaptiveDpr,
  AdaptiveEvents,
  Bvh,
} from '@react-three/drei'

// GPU detection for quality tiers
const gpu = useDetectGPU()
const quality = gpu.tier >= 2 ? 'high' : 'low'

// Automatic DPR adjustment
<Canvas>
  <AdaptiveDpr pixelated />
  <PerformanceMonitor
    onIncline={() => setDpr(2)}
    onDecline={() => setDpr(1)}
  >
    <Scene />
  </PerformanceMonitor>
</Canvas>

// LOD
<Detailed distances={[0, 50, 100]}>
  <HighDetailModel />
  <MediumDetailModel />
  <LowDetailModel />
</Detailed>

// Faster raycasting
<Bvh firstHitOnly>
  <Model />
</Bvh>
```
