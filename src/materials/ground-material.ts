import { MeshStandardNodeMaterial } from "three/webgpu";
import {
  float,
  mix,
  normalMap as tslNormalMap,
  positionLocal,
  smoothstep,
  texture as tslTexture,
  uv,
  vec3,
} from "three/tsl";
import type { Texture } from "three";
import { SCENE } from "../config/scene-config";
import type { FloatUniform } from "../utils/use-uniform";

export type GroundMaterialParams = {
  textures: {
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
  };
  uniforms: {
    pathDepth: FloatUniform;
    dirtBump: FloatUniform;
  };
};

export function buildGroundMaterial({
  textures,
  uniforms,
}: GroundMaterialParams): MeshStandardNodeMaterial {
  const m = new MeshStandardNodeMaterial();

  const planeUV = uv();
  const tiledUV = planeUV.mul(SCENE.TEXTURE_REPEAT);

  const maskRaw = tslTexture(textures.pathMask, planeUV).r;

  const edgeNoise = tslTexture(textures.noiseMap, planeUV.mul(6.0)).r;
  const noiseBreakup = edgeNoise.sub(0.5).mul(0.25);

  const dirtH = tslTexture(textures.dirtHeight, tiledUV).r;
  const heightBias = dirtH.sub(0.5).mul(0.35);

  const adjustedMask = maskRaw.add(noiseBreakup).add(heightBias);
  const dirtWeight = smoothstep(0.35, 0.55, adjustedMask);

  const grassRGB = tslTexture(textures.grassColor, tiledUV).rgb;
  const dirtRGB = tslTexture(textures.dirtColor, tiledUV).rgb;
  const blendedColor = mix(grassRGB, dirtRGB, dirtWeight);

  const dirtAOSample = tslTexture(textures.dirtAO, tiledUV).r;
  const aoFactor = mix(float(1.0), dirtAOSample, dirtWeight);
  m.colorNode = blendedColor.mul(aoFactor);

  const grassNormalDecoded = tslNormalMap(
    tslTexture(textures.grassNormal, tiledUV)
  );
  const dirtNormalDecoded = tslNormalMap(
    tslTexture(textures.dirtNormal, tiledUV)
  );
  m.normalNode = mix(
    grassNormalDecoded as unknown as ReturnType<typeof vec3>,
    dirtNormalDecoded as unknown as ReturnType<typeof vec3>,
    dirtWeight
  );

  const grassR = tslTexture(textures.grassRoughness, tiledUV).r;
  const dirtR = tslTexture(textures.dirtRoughness, tiledUV).r;
  m.roughnessNode = mix(grassR, dirtR, dirtWeight);

  const dirtMetal = tslTexture(textures.dirtMetallic, tiledUV).r;
  m.metalnessNode = dirtMetal.mul(dirtWeight);

  const dirtBumpAmount = dirtH.sub(0.5).mul(uniforms.dirtBump).mul(dirtWeight);
  const pathDepression = dirtWeight.mul(uniforms.pathDepth);
  const verticalOffset = dirtBumpAmount.sub(pathDepression);
  m.positionNode = positionLocal.add(
    vec3(float(0), float(0), verticalOffset)
  );

  return m;
}
