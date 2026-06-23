import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import {
  InstancedBufferAttribute,
  Object3D,
  RepeatWrapping,
  type InstancedMesh,
  type Texture,
} from "three";
import { GRASS, SCENE, TEXTURE_PATHS } from "../config/scene-config";
import { buildGrassMaterial } from "../materials/grass-material";
import { useUniform, useUniformColor } from "../utils/use-uniform";
import { useTextureImageData, sampleImageData } from "../utils/image-data";
import { extractFirstMeshGeometry } from "../utils/mesh-geometry";
import { generateInstanceSeeds } from "../utils/instance-seeds";
import type { DebugMode } from "../types";

type Props = {
  density: number;
  scale: number;
  heightVariation: number;
  heightNoiseScale: number;
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
  windAngle: number;
  gustScale: number;
  turbulence: number;
  flutter: number;
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
  heightVariation,
  heightNoiseScale,
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
  windAngle,
  gustScale,
  turbulence,
  flutter,
  projection,
  debugMode,
  translucency,
  fresnel,
  groundColorMap,
  noiseMap,
  pathMask,
}: Props) {
  const { scene } = useGLTF(TEXTURE_PATHS.grassBlades);
  const { geometry, height: bladeHeight } = useMemo(
    () => extractFirstMeshGeometry(scene),
    [scene]
  );

  const pathMaskData = useTextureImageData(pathMask);

  const heightVariationU = useUniform(heightVariation);
  const heightNoiseScaleU = useUniform(heightNoiseScale);
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
  const windAngleU = useUniform(windAngle);
  const gustScaleU = useUniform(gustScale);
  const turbulenceU = useUniform(turbulence);
  const flutterU = useUniform(flutter);
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
          heightVariation: heightVariationU,
          heightNoiseScale: heightNoiseScaleU,
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
          windAngle: windAngleU,
          gustScale: gustScaleU,
          turbulence: turbulenceU,
          flutter: flutterU,
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
      heightVariationU,
      heightNoiseScaleU,
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
      windAngleU,
      gustScaleU,
      turbulenceU,
      flutterU,
      projectionU,
      translucencyU,
      fresnelU,
    ]
  );

  const seeds = useMemo(
    () => generateInstanceSeeds(GRASS.MAX_INSTANCES, SCENE.GROUND_SIZE),
    []
  );

  // Per-instance attributes the wind shader needs, set on the shared geometry
  // once so they exist when the material's `attribute(...)` nodes compile:
  //  - aOrigin: the blade's world XZ. The travelling gust wave is sampled here,
  //    so each blade reads the wind at its own location (sampling positionWorld
  //    in the vertex stage collapsed to the same value for every instance, which
  //    is why the whole field moved in lockstep).
  //  - aFacing: cos/sin of the blade's yaw, used to counter-rotate the world-space
  //    bend into the blade's local frame so every blade bends the same world way.
  useMemo(() => {
    if (!geometry) return;
    const origin = new Float32Array(GRASS.MAX_INSTANCES * 2);
    const facing = new Float32Array(GRASS.MAX_INSTANCES * 2);
    for (let i = 0; i < GRASS.MAX_INSTANCES; i++) {
      origin[i * 2 + 0] = seeds[i * 3 + 0];
      origin[i * 2 + 1] = seeds[i * 3 + 1];
      const yaw = seeds[i * 3 + 2];
      facing[i * 2 + 0] = Math.cos(yaw);
      facing[i * 2 + 1] = Math.sin(yaw);
    }
    geometry.setAttribute("aOrigin", new InstancedBufferAttribute(origin, 2));
    geometry.setAttribute("aFacing", new InstancedBufferAttribute(facing, 2));
  }, [geometry, seeds]);

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
