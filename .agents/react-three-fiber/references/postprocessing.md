# React Three Postprocessing

Post-processing effects using @react-three/postprocessing.

## Setup

```jsx
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

function App() {
  return (
    <Canvas>
      <Scene />
      <EffectComposer>
        <Bloom luminanceThreshold={0.9} intensity={0.5} />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  )
}
```

### EffectComposer Props

```jsx
<EffectComposer
  enabled={true}
  depthBuffer={true}
  stencilBuffer={false}
  autoClear={true}
  multisampling={8}              // MSAA samples
  renderPriority={1}
  camera={customCamera}          // Optional custom camera
  scene={customScene}            // Optional custom scene
>
```

## Common Effects

### Bloom

```jsx
import { Bloom } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

<Bloom
  intensity={1}                    // Overall strength
  luminanceThreshold={0.9}         // Brightness threshold
  luminanceSmoothing={0.025}       // Smoothness of threshold
  mipmapBlur                       // Use mipmap blur (faster)
  radius={0.85}                    // Blur radius
  blendFunction={BlendFunction.ADD}
/>

// Selective bloom with layers
import { Selection, Select } from '@react-three/postprocessing'

<Selection>
  <EffectComposer>
    <SelectiveBloom 
      lights={[lightRef]} 
      selection={selectionRef}
      intensity={2}
    />
  </EffectComposer>
  
  <Select enabled>
    <mesh ref={selectionRef}>  {/* This glows */}
      <sphereGeometry />
      <meshStandardMaterial emissive="blue" emissiveIntensity={2} />
    </mesh>
  </Select>
  
  <mesh>  {/* This doesn't glow */}
    <boxGeometry />
    <meshStandardMaterial />
  </mesh>
</Selection>
```

### Depth of Field

```jsx
import { DepthOfField } from '@react-three/postprocessing'

<DepthOfField
  focusDistance={0}          // Focus distance (0-1, normalized)
  focalLength={0.02}         // Focal length
  bokehScale={2}             // Bokeh size
  height={480}               // Render height (affects quality)
/>

// Autofocus on object
import { useRef } from 'react'

function AutofocusScene() {
  const targetRef = useRef()
  
  return (
    <>
      <mesh ref={targetRef} position={[0, 0, -5]}>
        <boxGeometry />
      </mesh>
      <EffectComposer>
        <DepthOfField target={targetRef} focalLength={0.02} bokehScale={2} />
      </EffectComposer>
    </>
  )
}
```

### SSAO (Ambient Occlusion)

```jsx
import { SSAO } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

<SSAO
  blendFunction={BlendFunction.MULTIPLY}
  samples={30}
  rings={4}
  distanceThreshold={1}
  distanceFalloff={0}
  rangeThreshold={0.5}
  rangeFalloff={0.1}
  luminanceInfluence={0.9}
  radius={20}
  scale={0.5}
  bias={0.5}
  intensity={1}
/>

// N8AO (faster alternative)
import { N8AO } from '@react-three/postprocessing'

<N8AO
  color="black"
  aoRadius={0.5}
  intensity={1}
  distanceFalloff={1}
  quality="medium"      // "low" | "medium" | "high" | "ultra"
/>
```

### Outline

```jsx
import { Outline, Selection, Select } from '@react-three/postprocessing'

<Selection>
  <EffectComposer autoClear={false}>
    <Outline
      blur
      visibleEdgeColor={0xffffff}
      hiddenEdgeColor={0x22090a}
      edgeStrength={2.5}
      pulseSpeed={0}
      width={1000}
    />
  </EffectComposer>
  
  <Select enabled={hovered}>
    <mesh>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  </Select>
</Selection>
```

### Color Grading

```jsx
import {
  ToneMapping,
  BrightnessContrast,
  HueSaturation,
  ColorAverage,
  Sepia,
  LUT,
} from '@react-three/postprocessing'
import { ToneMappingMode, BlendFunction } from 'postprocessing'

// Tone mapping
<ToneMapping
  mode={ToneMappingMode.ACES_FILMIC}
  // Modes: REINHARD, REINHARD2, REINHARD2_ADAPTIVE, UNCHARTED2, 
  // OPTIMIZED_CINEON, ACES_FILMIC, AGX, NEUTRAL
/>

// Basic adjustments
<BrightnessContrast brightness={0} contrast={0} />
<HueSaturation hue={0} saturation={0} />

// Color effects
<Sepia intensity={0.5} />
<ColorAverage blendFunction={BlendFunction.NORMAL} />

// LUT (color lookup table)
import { useTexture } from '@react-three/drei'

function LUTEffect() {
  const lut = useTexture('/lut.png')
  return <LUT lut={lut} />
}
```

### Motion Blur & Noise

```jsx
import { MotionBlur, Noise, Glitch, Scanline } from '@react-three/postprocessing'
import { GlitchMode, BlendFunction } from 'postprocessing'

// Motion blur
<MotionBlur
  samples={16}
  intensity={1}
/>

// Film grain
<Noise
  premultiply                    // Apply before other effects
  blendFunction={BlendFunction.ADD}
  opacity={0.5}
/>

// Glitch
<Glitch
  delay={[1.5, 3.5]}            // Min/max delay between glitches
  duration={[0.1, 0.3]}         // Min/max glitch duration
  strength={[0.2, 0.4]}         // Min/max strength
  mode={GlitchMode.SPORADIC}    // DISABLED, SPORADIC, CONSTANT_MILD, CONSTANT_WILD
  active
/>

// CRT scanlines
<Scanline density={1.25} />
```

### Chromatic Aberration & Distortion

```jsx
import { ChromaticAberration, LensDistortion, Pixelation } from '@react-three/postprocessing'

<ChromaticAberration
  offset={[0.002, 0.002]}       // RGB offset
  radialModulation
  modulationOffset={0}
/>

<LensDistortion
  distortion={[0.1, 0.1]}       // Barrel/pincushion distortion
  principalPoint={[0, 0]}       // Center point
  focalLength={[1, 1]}
  skew={0}
/>

<Pixelation granularity={8} />
```

### God Rays

```jsx
import { GodRays } from '@react-three/postprocessing'
import { useRef } from 'react'

function SunWithRays() {
  const sunRef = useRef()
  
  return (
    <>
      <mesh ref={sunRef} position={[0, 10, -20]}>
        <sphereGeometry args={[2]} />
        <meshBasicMaterial color="white" />
      </mesh>
      
      <EffectComposer>
        <GodRays
          sun={sunRef}
          samples={60}
          density={0.96}
          decay={0.9}
          weight={0.4}
          exposure={0.6}
          clampMax={1}
          blur
        />
      </EffectComposer>
    </>
  )
}
```

## Combining Effects

```jsx
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
  SSAO,
  ToneMapping,
} from '@react-three/postprocessing'
import { ToneMappingMode, BlendFunction } from 'postprocessing'

function PostProcessing() {
  return (
    <EffectComposer multisampling={0}>
      {/* Order matters - effects are applied sequentially */}
      <SSAO 
        radius={0.4}
        intensity={50}
        luminanceInfluence={0.5}
      />
      <Bloom
        luminanceThreshold={0.8}
        intensity={0.4}
        mipmapBlur
      />
      <ChromaticAberration offset={[0.0005, 0.0005]} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette eskil={false} offset={0.1} darkness={0.5} />
      <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  )
}
```

## Custom Effects

```jsx
import { Effect, BlendFunction } from 'postprocessing'
import { wrapEffect } from '@react-three/postprocessing'
import { Uniform } from 'three'

// Define custom effect class
class WaveEffectImpl extends Effect {
  constructor({ frequency = 10, amplitude = 0.1 } = {}) {
    super('WaveEffect', /* glsl */`
      uniform float frequency;
      uniform float amplitude;
      uniform float time;
      
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 distortedUv = uv;
        distortedUv.y += sin(uv.x * frequency + time) * amplitude;
        outputColor = texture2D(inputBuffer, distortedUv);
      }
    `, {
      uniforms: new Map([
        ['frequency', new Uniform(frequency)],
        ['amplitude', new Uniform(amplitude)],
        ['time', new Uniform(0)],
      ]),
    })
  }
  
  update(renderer, inputBuffer, deltaTime) {
    this.uniforms.get('time').value += deltaTime
  }
}

// Wrap for R3F
const WaveEffect = wrapEffect(WaveEffectImpl)

// Use it
<EffectComposer>
  <WaveEffect frequency={20} amplitude={0.02} />
</EffectComposer>
```

## Performance Tips

1. **Multisampling**: Set `multisampling={0}` on EffectComposer and use SMAA instead for better performance
2. **Resolution**: Many effects accept `height` prop to render at lower resolution
3. **Selective Effects**: Use Selection/Select for effects like Bloom and Outline only on specific objects
4. **Disable When Not Needed**: Use `enabled` prop to toggle effects
5. **Effect Order**: Put expensive effects (SSAO) before cheaper ones (Vignette)

```jsx
import { SMAA } from '@react-three/postprocessing'

<EffectComposer multisampling={0}>
  <SMAA />  {/* Fast anti-aliasing */}
  {/* Other effects */}
</EffectComposer>
```
