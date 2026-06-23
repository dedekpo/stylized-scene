import { useMemo } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { positionLocal } from "three/tsl";
import {
  DoubleSide,
  NoColorSpace,
  type BufferGeometry,
  type Mesh,
  type Texture,
} from "three";
import { TEXTURE_PATHS } from "../config/scene-config";
import { windSwayOffset } from "../materials/wind";
import { useUniform } from "../utils/use-uniform";

type Props = {
  windStrength: number;
  windSpeed: number;
  noiseMap: Texture;
};

// The leaves GLB is a set of intersecting cards (a single "Plane" mesh) with no
// material and no trunk yet. The alpha map carves the leaf silhouettes out of
// those cards via the mesh's UVs. We sample it with alphaTest (rather than
// blended transparency) so the cutout stays crisp and casts/receives clean
// shadows without depth-sort artifacts between the overlapping cards. The same
// wind displacement that drives the grass is applied here so the canopy sways
// in sync with the field, anchored at the bottom where the trunk will attach.
export function TreeLeaves({ windStrength, windSpeed, noiseMap }: Props) {
  const { scene } = useGLTF(TEXTURE_PATHS.treeLeaves);
  const alphaMap = useTexture(TEXTURE_PATHS.treeLeavesAlpha);

  const windStrengthU = useUniform(windStrength);
  const windSpeedU = useUniform(windSpeed);

  const { geometry, baseY, height } = useMemo(() => {
    let found: BufferGeometry | undefined;
    scene.traverse((o) => {
      if (!found && (o as Mesh).isMesh) found = (o as Mesh).geometry;
    });
    if (!found) return { geometry: undefined, baseY: 0, height: 1 };
    found.computeBoundingBox();
    const box = found.boundingBox!;
    return { geometry: found, baseY: box.min.y, height: box.max.y - box.min.y };
  }, [scene]);

  const material = useMemo(() => {
    // The alpha map is a non-color mask; keep it linear so its values aren't
    // gamma-shifted before the alphaTest comparison.
    alphaMap.colorSpace = NoColorSpace;
    alphaMap.flipY = false;
    alphaMap.needsUpdate = true;

    const m = new MeshStandardNodeMaterial({
      color: "#4a6b27",
      alphaMap,
      alphaTest: 0.5,
      side: DoubleSide,
      roughness: 0.8,
      metalness: 0,
    });

    // The canopy is ~8 units tall (vs. a 1-unit blade), so it needs a larger
    // absolute sway and a softer bend ramp to read as a tree swaying rather
    // than just the top fluttering. flutterAmp is bumped to match the scale.
    m.positionNode = positionLocal.add(
      windSwayOffset({
        baseY,
        height,
        windStrength: windStrengthU,
        windSpeed: windSpeedU,
        noiseMap,
        bendExponent: 1.5,
        flutterAmp: 0.15,
        amplitude: 4.0,
      })
    );
    return m;
  }, [alphaMap, baseY, height, windStrengthU, windSpeedU, noiseMap]);

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, 5, 0]}
      castShadow
      receiveShadow
    />
  );
}

useGLTF.preload(TEXTURE_PATHS.treeLeaves);
