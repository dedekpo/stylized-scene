import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { CameraControls, Environment, useTexture } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  CineonToneMapping,
  EquirectangularReflectionMapping,
  LinearToneMapping,
  NeutralToneMapping,
  NoToneMapping,
  ReinhardToneMapping,
  type Material,
  type Mesh,
  type ToneMapping,
} from "three";
import { createWebGPURenderer } from "./renderer/webgpu-renderer";
import { LIGHTING, TEXTURE_PATHS } from "./config/scene-config";
import type { ToneMappingMode } from "./types";
import { Scene } from "./scene/scene";
import { ControlsPanel } from "./ui/controls-panel";
import { GithubButton } from "./ui/github-button";
import { useSceneControls } from "./ui/use-scene-controls";

const TONE_MAPPING_VALUES: Record<ToneMappingMode, ToneMapping> = {
  none: NoToneMapping,
  linear: LinearToneMapping,
  reinhard: ReinhardToneMapping,
  cineon: CineonToneMapping,
  aces: ACESFilmicToneMapping,
  agx: AgXToneMapping,
  neutral: NeutralToneMapping,
};

// Applies the selected tone mapping curve to the WebGPU renderer at runtime.
// In WebGPU the tone mapping function is compiled into each material's output,
// so switching it requires flagging existing materials for recompile.
function ToneMappingControl({ mode }: { mode: ToneMappingMode }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    gl.toneMapping = TONE_MAPPING_VALUES[mode];
    scene.traverse((o) => {
      const material = (o as Mesh).material;
      if (!material) return;
      const list = Array.isArray(material) ? material : [material];
      list.forEach((m: Material) => (m.needsUpdate = true));
    });
  }, [gl, scene, mode]);
  return null;
}

// drei's <Environment files> chooses a loader from the file extension and
// rejects plain .png equirectangulars. Load the texture ourselves and pass it
// via `map`, which bypasses that loader while still driving the visible
// background and the image-based lighting fill.
function SkyEnvironment() {
  const skyTexture = useTexture(TEXTURE_PATHS.sky);
  skyTexture.mapping = EquirectangularReflectionMapping;
  return (
    <Environment
      map={skyTexture}
      background
      environmentIntensity={LIGHTING.environmentIntensity}
    />
  );
}

export default function App() {
  const { values, set } = useSceneControls();

  return (
    <>
      <Canvas
        flat
        shadows
        camera={{ position: [1.98, 4.46, 22.31] }}
        gl={createWebGPURenderer}
      >
        <directionalLight
          castShadow
          color={LIGHTING.sunColor}
          intensity={LIGHTING.sunIntensity}
          position={LIGHTING.sunPosition}
          shadow-mapSize-width={LIGHTING.shadowMapSize}
          shadow-mapSize-height={LIGHTING.shadowMapSize}
          shadow-bias={LIGHTING.shadowBias}
          shadow-normalBias={LIGHTING.shadowNormalBias}
        >
          <orthographicCamera
            attach="shadow-camera"
            args={[
              -LIGHTING.shadowFrustum,
              LIGHTING.shadowFrustum,
              LIGHTING.shadowFrustum,
              -LIGHTING.shadowFrustum,
              LIGHTING.shadowNear,
              LIGHTING.shadowFar,
            ]}
          />
        </directionalLight>
        <ToneMappingControl mode={values.toneMapping} />
        <Suspense fallback={null}>
          <SkyEnvironment />
          <Scene {...values} />
        </Suspense>
        <CameraControls />
      </Canvas>
      <ControlsPanel values={values} set={set} />
      <GithubButton />
    </>
  );
}
