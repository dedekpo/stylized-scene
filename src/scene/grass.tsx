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
import type { DebugMode } from "../types";

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
  windStrength: number;
  windSpeed: number;
  projection: number;
  debugMode: DebugMode;
  translucency: boolean;
  fresnel: boolean;
  groundColorMap: Texture;
  noiseMap: Texture;
  pathMask: Texture;
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
  windStrength,
  windSpeed,
  projection,
  debugMode,
  translucency,
  fresnel,
  groundColorMap,
  noiseMap,
  pathMask,
}: Props) {
  const { scene } = useGLTF(TEXTURE_PATHS.grassBlades);
  const { geometry, bladeHeight } = useMemo(
    () => extractGrassGeometry(scene),
    [scene]
  );

  const pathMaskData = useTextureImageData(pathMask);

  const rootU = useUniformColor(rootColor);
  const tipU = useUniformColor(tipColor);
  const rootBU = useUniformColor(rootColorB);
  const tipBU = useUniformColor(tipColorB);
  const colorVariationU = useUniform(colorVariation);
  const colorPatchScaleU = useUniform(colorPatchScale);
  const macroVariationU = useUniform(macroVariation);
  const macroScaleU = useUniform(macroScale);
  const windStrengthU = useUniform(windStrength);
  const windSpeedU = useUniform(windSpeed);
  const projectionU = useUniform(projection);
  const translucencyU = useUniform(translucency ? 1 : 0);
  const fresnelU = useUniform(fresnel ? 1 : 0);

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
          windStrength: windStrengthU,
          windSpeed: windSpeedU,
          projection: projectionU,
          translucencyEnabled: translucencyU,
          fresnelEnabled: fresnelU,
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
      windStrengthU,
      windSpeedU,
      projectionU,
      translucencyU,
      fresnelU,
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

      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, seeds[i * 3 + 2], 0);
      dummy.scale.setScalar(onPath ? 0 : scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = density;
    mesh.instanceMatrix.needsUpdate = true;
  }, [density, scale, seeds, pathMaskData]);

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
