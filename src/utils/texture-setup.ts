import {
  ClampToEdgeWrapping,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

export type GroundTextures = {
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
};

export function configureGroundTextures(t: GroundTextures): void {
  t.grassColor.colorSpace = SRGBColorSpace;
  t.dirtColor.colorSpace = SRGBColorSpace;
  const tiled = [
    t.grassColor,
    t.grassNormal,
    t.grassRoughness,
    t.dirtColor,
    t.dirtNormal,
    t.dirtRoughness,
    t.dirtAO,
    t.dirtHeight,
    t.dirtMetallic,
  ];
  for (const tex of tiled) {
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.needsUpdate = true;
  }
  t.pathMask.colorSpace = NoColorSpace;
  t.pathMask.wrapS = t.pathMask.wrapT = ClampToEdgeWrapping;
  t.pathMask.needsUpdate = true;
}
