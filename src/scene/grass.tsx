import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import {
  Object3D,
  RepeatWrapping,
  type InstancedMesh,
  type Texture,
} from "three";
import { GRASS, SCENE, TEXTURE_PATHS } from "../config/scene-config";
import { buildGrassMaterial } from "../materials/grass-material";
import { useUniform, useUniformColor } from "../utils/use-uniform";
import { useTextureImageData, sampleImageData } from "../utils/image-data";
import { extractGrassGeometry } from "../utils/grass-geometry";
import { generateInstanceSeeds } from "../utils/instance-seeds";
import type { CursorUniforms, DebugMode } from "../types";

type Props = {
  density: number;
  scale: number;
  rootColor: string;
  tipColor: string;
  rootColorB: string;
  tipColorB: string;
  colorVariation: number;
  colorPatchScale: number;
  macroVariation: number;
  macroScale: number;
  bladeHeightVariation: number;
  windStrength: number;
  windSpeed: number;
  projection: number;
  debugMode: DebugMode;
  sizeNoiseScale: number;
  groundColorMap: Texture;
  noiseMap: Texture;
  pathMask: Texture;
  cursor: CursorUniforms;
};

export function Grass({
  density,
  scale,
  rootColor,
  tipColor,
  rootColorB,
  tipColorB,
  colorVariation,
  colorPatchScale,
  macroVariation,
  macroScale,
  bladeHeightVariation,
  windStrength,
  windSpeed,
  projection,
  debugMode,
  sizeNoiseScale,
  groundColorMap,
  noiseMap,
  pathMask,
  cursor,
}: Props) {
  const { scene } = useGLTF(TEXTURE_PATHS.grassBlades);
  const { geometry, bladeHeight } = useMemo(
    () => extractGrassGeometry(scene),
    [scene]
  );

  const pathMaskData = useTextureImageData(pathMask);
  const noiseMapData = useTextureImageData(noiseMap);

  const rootU = useUniformColor(rootColor);
  const tipU = useUniformColor(tipColor);
  const rootBU = useUniformColor(rootColorB);
  const tipBU = useUniformColor(tipColorB);
  const colorVariationU = useUniform(colorVariation);
  const colorPatchScaleU = useUniform(colorPatchScale);
  const macroVariationU = useUniform(macroVariation);
  const macroScaleU = useUniform(macroScale);
  const bladeHeightVariationU = useUniform(bladeHeightVariation);
  const windStrengthU = useUniform(windStrength);
  const windSpeedU = useUniform(windSpeed);
  const projectionU = useUniform(projection);

  useEffect(() => {
    noiseMap.wrapS = noiseMap.wrapT = RepeatWrapping;
    noiseMap.needsUpdate = true;
  }, [noiseMap]);

  const material = useMemo(
    () =>
      buildGrassMaterial({
        bladeHeight,
        debugMode,
        textures: { groundColorMap, noiseMap, pathMask },
        uniforms: {
          rootColor: rootU,
          tipColor: tipU,
          rootColorB: rootBU,
          tipColorB: tipBU,
          colorVariation: colorVariationU,
          colorPatchScale: colorPatchScaleU,
          macroVariation: macroVariationU,
          macroScale: macroScaleU,
          bladeHeightVariation: bladeHeightVariationU,
          windStrength: windStrengthU,
          windSpeed: windSpeedU,
          projection: projectionU,
          cursor,
        },
      }),
    [
      bladeHeight,
      debugMode,
      groundColorMap,
      noiseMap,
      pathMask,
      rootU,
      tipU,
      rootBU,
      tipBU,
      colorVariationU,
      colorPatchScaleU,
      macroVariationU,
      macroScaleU,
      bladeHeightVariationU,
      windStrengthU,
      windSpeedU,
      projectionU,
      cursor,
    ]
  );

  const seeds = useMemo(
    () => generateInstanceSeeds(GRASS.MAX_INSTANCES, SCENE.GROUND_SIZE),
    []
  );

  const ref = useRef<InstancedMesh>(null!);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();

    for (let i = 0; i < density; i++) {
      const x = seeds[i * 3 + 0];
      const z = seeds[i * 3 + 1];

      // The path mask is drawn on the ground via GPU texture sampling, where
      // texture.flipY (default true) means uv.v reads source-image row (1 - v).
      // getImageData here is top-origin and ignores flipY, so we must sample the
      // same source row the GPU lands on: z/size + 0.5 (no V inversion).
      const maskValue = pathMaskData
        ? sampleImageData(
            pathMaskData,
            x / SCENE.GROUND_SIZE + 0.5,
            z / SCENE.GROUND_SIZE + 0.5
          )
        : 0;
      const edgeJitter = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const onPath = maskValue + (edgeJitter - 0.5) * 0.3 > 0.5;

      const noiseValue = noiseMapData
        ? sampleImageData(
            noiseMapData,
            x * sizeNoiseScale + 50,
            z * sizeNoiseScale + 50,
            "repeat"
          )
        : 0.5;
      const sizeMultiplier = 0.9 + noiseValue * 0.3;

      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, seeds[i * 3 + 2], 0);
      dummy.scale.setScalar(onPath ? 0 : scale * sizeMultiplier);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = density;
    mesh.instanceMatrix.needsUpdate = true;
  }, [density, scale, seeds, sizeNoiseScale, pathMaskData, noiseMapData]);

  if (!geometry) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, GRASS.MAX_INSTANCES]}
      receiveShadow
      frustumCulled={false}
    />
  );
}

useGLTF.preload(TEXTURE_PATHS.grassBlades);
