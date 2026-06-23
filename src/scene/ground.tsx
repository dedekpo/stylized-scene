import { useEffect, useMemo } from "react";
import type { Texture } from "three";
import { SCENE } from "../config/scene-config";
import { buildGroundMaterial } from "../materials/ground-material";
import { useUniform } from "../utils/use-uniform";
import { configureGroundTextures } from "../utils/texture-setup";

type Props = {
  grassColor: Texture;
  grassNormal: Texture;
  grassRoughness: Texture;
  dirtColor: Texture;
  dirtNormal: Texture;
  dirtRoughness: Texture;
  dirtAO: Texture;
  dirtHeight: Texture;
  dirtMetallic: Texture;
  pathMask: Texture;
  noiseMap: Texture;
  pathDepth: number;
  dirtBump: number;
};

export function Ground({
  grassColor,
  grassNormal,
  grassRoughness,
  dirtColor,
  dirtNormal,
  dirtRoughness,
  dirtAO,
  dirtHeight,
  dirtMetallic,
  pathMask,
  noiseMap,
  pathDepth,
  dirtBump,
}: Props) {
  const pathDepthU = useUniform(pathDepth);
  const dirtBumpU = useUniform(dirtBump);

  useEffect(() => {
    configureGroundTextures({
      grassColor,
      grassNormal,
      grassRoughness,
      dirtColor,
      dirtNormal,
      dirtRoughness,
      dirtAO,
      dirtHeight,
      dirtMetallic,
      pathMask,
    });
  }, [
    grassColor,
    grassNormal,
    grassRoughness,
    dirtColor,
    dirtNormal,
    dirtRoughness,
    dirtAO,
    dirtHeight,
    dirtMetallic,
    pathMask,
  ]);

  const material = useMemo(
    () =>
      buildGroundMaterial({
        textures: {
          grassColor,
          grassNormal,
          grassRoughness,
          dirtColor,
          dirtNormal,
          dirtRoughness,
          dirtAO,
          dirtHeight,
          dirtMetallic,
          pathMask,
          noiseMap,
        },
        uniforms: { pathDepth: pathDepthU, dirtBump: dirtBumpU },
      }),
    [
      grassColor,
      grassNormal,
      grassRoughness,
      dirtColor,
      dirtNormal,
      dirtRoughness,
      dirtAO,
      dirtHeight,
      dirtMetallic,
      pathMask,
      noiseMap,
      pathDepthU,
      dirtBumpU,
    ]
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={material}>
      <planeGeometry args={[SCENE.GROUND_SIZE, SCENE.GROUND_SIZE, 256, 256]} />
    </mesh>
  );
}
