import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { CameraControls, Environment, useTexture } from "@react-three/drei";
import { EquirectangularReflectionMapping } from "three";
import { createWebGPURenderer } from "./renderer/webgpu-renderer";
import { LIGHTING, TEXTURE_PATHS } from "./config/scene-config";
import { Scene } from "./scene/scene";
import { ControlsPanel } from "./ui/controls-panel";
import { useSceneControls } from "./ui/use-scene-controls";

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
        shadows
        camera={{ position: [3, 3, 4] }}
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
        <Suspense fallback={null}>
          <SkyEnvironment />
          <Scene {...values} />
        </Suspense>
        <CameraControls />
      </Canvas>
      <ControlsPanel values={values} set={set} />
    </>
  );
}
