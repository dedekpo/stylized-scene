import { MeshStandardNodeMaterial } from "three/webgpu";
import {
  abs,
  cameraPosition,
  cameraViewMatrix,
  clamp,
  color as tslColor,
  float,
  hash,
  instanceIndex,
  mix,
  mx_noise_float,
  normalize,
  normalWorld,
  positionLocal,
  positionWorld,
  pow,
  texture as tslTexture,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { DoubleSide, type Texture } from "three";
import { LIGHTING, SCENE } from "../config/scene-config";
import type { CursorUniforms, DebugMode } from "../types";
import type { ColorUniform, FloatUniform } from "../utils/use-uniform";
import { windSwayOffset } from "./wind";

export type GrassMaterialParams = {
  bladeHeight: number;
  debugMode: DebugMode;
  textures: {
    groundColorMap: Texture;
    noiseMap: Texture;
    pathMask: Texture;
  };
  uniforms: {
    rootColor: ColorUniform;
    tipColor: ColorUniform;
    rootColorB: ColorUniform;
    tipColorB: ColorUniform;
    colorVariation: FloatUniform;
    colorPatchScale: FloatUniform;
    macroVariation: FloatUniform;
    macroScale: FloatUniform;
    windStrength: FloatUniform;
    windSpeed: FloatUniform;
    projection: FloatUniform;
    translucencyEnabled: FloatUniform;
    fresnelEnabled: FloatUniform;
    cursor: CursorUniforms;
  };
};

export function buildGrassMaterial({
  bladeHeight,
  debugMode,
  textures,
  uniforms,
}: GrassMaterialParams): MeshStandardNodeMaterial {
  const m = new MeshStandardNodeMaterial({ side: DoubleSide });

  const heightAlongBlade = clamp(positionLocal.y.div(bladeHeight), 0, 1);

  const bladeSeed = hash(float(instanceIndex));
  const bladePhase = bladeSeed.mul(6.28318);

  const worldXZ = vec2(positionWorld.x, positionWorld.z);

  const swayOffset = windSwayOffset({
    baseY: 0,
    height: bladeHeight,
    windStrength: uniforms.windStrength,
    windSpeed: uniforms.windSpeed,
    noiseMap: textures.noiseMap,
    phase: bladePhase,
    cursor: uniforms.cursor,
  });

  const groundUVFromWorld = vec2(
    positionWorld.x.div(SCENE.GROUND_SIZE).add(0.5),
    positionWorld.z.div(SCENE.GROUND_SIZE).add(0.5)
  );
  const pathSample = tslTexture(textures.pathMask, groundUVFromWorld).r;

  m.positionNode = positionLocal.add(swayOffset);

  const gradT = pow(heightAlongBlade, 1.4);
  const gradientA = mix(
    tslColor(uniforms.rootColor),
    tslColor(uniforms.tipColor),
    gradT
  );
  const gradientB = mix(
    tslColor(uniforms.rootColorB),
    tslColor(uniforms.tipColorB),
    gradT
  );

  // Clump/patch-scale color variation. GPU-native MaterialX gradient (Perlin)
  // noise sampled by world XZ, so neighbouring blades share a tint while the
  // field breaks into organic patches. colorPatchScale sets the clump
  // frequency (higher = smaller, tighter clumps); colorVariation scales how far
  // a clump can shift toward variant B. No time term, so patches stay put.
  const patchNoise = mx_noise_float(worldXZ.mul(uniforms.colorPatchScale))
    .mul(0.5)
    .add(0.5);
  const patchBlend = clamp(patchNoise.mul(uniforms.colorVariation), 0, 1);
  const baseColor = mix(gradientA, gradientB, patchBlend);

  const groundUV = positionWorld.xz
    .div(SCENE.GROUND_SIZE)
    .add(0.5)
    .mul(SCENE.TEXTURE_REPEAT);
  const groundTint = tslTexture(textures.groundColorMap, groundUV).rgb;

  const projectionStrength = uniforms.projection.mul(
    mix(float(1.0), float(0.4), gradT)
  );
  const tinted = mix(baseColor, baseColor.mul(groundTint), projectionStrength);

  const brightnessSeed = hash(float(instanceIndex).add(13.37));
  const brightness = mix(float(0.85), float(1.15), brightnessSeed);

  // Large-scale (field-wide) variation: a much lower-frequency noise layer that
  // gently lightens/darkens whole regions, sitting on top of the clump blend so
  // the two scales together read as natural rather than tiled. The fixed UV
  // offset decorrelates it from the clump noise sampled above. macroScale sets
  // the region size (lower = broader); macroVariation sets the light/dark swing
  // around 1.0 (so average brightness is preserved).
  const macroNoise = mx_noise_float(
    worldXZ.add(vec2(137.0, 91.0)).mul(uniforms.macroScale)
  )
    .mul(0.5)
    .add(0.5);
  const macroFactor = float(1).add(
    macroNoise.sub(0.5).mul(2).mul(uniforms.macroVariation)
  );

  const finalColor = tinted.mul(brightness).mul(macroFactor);

  const outputColor =
    debugMode === "gradient"
      ? baseColor
      : debugMode === "ground"
      ? groundTint
      : debugMode === "height"
      ? vec3(heightAlongBlade, heightAlongBlade, heightAlongBlade)
      : debugMode === "world"
      ? vec3(
          positionWorld.x.div(SCENE.GROUND_SIZE).add(0.5),
          float(0),
          positionWorld.z.div(SCENE.GROUND_SIZE).add(0.5)
        )
      : debugMode === "pathmask"
      ? vec3(pathSample, pathSample, pathSample)
      : finalColor;

  m.colorNode = outputColor;
  m.roughnessNode = float(0.85);

  // --- Double-sided lighting fix ---
  // With DoubleSide, three.js flips the shading normal on back-facing
  // fragments. On an up-pointing grass blade that rotates the normal down
  // into the dark lower hemisphere, so the back face reads as unlit even
  // though the albedo is correct. Mirror the normal back into the upper
  // (sky-lit) hemisphere by forcing a positive world-up component, so both
  // faces sample the same sky/ambient light while keeping the sideways
  // shaping from the blade's outward-facing normal.
  const skyNormalWorld = normalize(
    vec3(normalWorld.x, abs(normalWorld.y), normalWorld.z)
  );
  m.normalNode = normalize(cameraViewMatrix.mul(vec4(skyNormalWorld, 0)).xyz);

  // --- Translucency (back-light subsurface approximation) ---
  // Thin grass blades let sunlight scatter through them: when the sun sits
  // behind a blade relative to the camera, the blade glows warm at the edges.
  // This is the Half-Life 2 / GPU Gems back-translucency trick — no real
  // subsurface scattering, just a view/light alignment term added as emissive.
  //
  // sunDir points from the surface toward the sun. The directional light's
  // target is the origin, so for a directional light its world direction is
  // simply the normalized sun position. We perturb it by the surface normal
  // ("distortion") so the glow wraps slightly around the blade rather than
  // being a hard back-facing lobe, then take how much the view direction lines
  // up with the light travelling toward the camera (dot of viewDir with the
  // negated, distorted light dir). Masked toward the tips, where blades are
  // thinnest and transmit the most light, and tinted warm yellow-green.
  // The whole term is scaled by a 0/1 uniform so the debug checkbox toggles it
  // live without rebuilding the material.
  const sunDir = normalize(
    vec3(
      LIGHTING.sunPosition[0],
      LIGHTING.sunPosition[1],
      LIGHTING.sunPosition[2]
    )
  );
  const viewDir = cameraPosition.sub(positionWorld).normalize();
  const transDistortion = float(0.5);
  const transLightDir = sunDir.add(skyNormalWorld.mul(transDistortion)).normalize();
  const backLight = viewDir.dot(transLightDir.negate()).max(0).pow(3.0);
  const thicknessMask = pow(heightAlongBlade, 1.5);
  const translucencyColor = tslColor(0xcfe06a);
  const translucency = translucencyColor
    .mul(backLight)
    .mul(thicknessMask)
    .mul(1.2)
    .mul(uniforms.translucencyEnabled);

  // --- Fresnel rim ---
  // Surfaces reflect more at grazing angles, so blade edges/silhouettes facing
  // away from the camera catch a soft rim of light. fresnel is high where the
  // view direction is perpendicular to the normal (1 - N·V), tightened with a
  // power. Added as a subtle pale-warm emissive rim, reusing the viewDir and
  // up-biased normal already computed above (a single dot + pow — no new texture
  // reads). Scaled by the fresnelEnabled uniform for a live toggle.
  const fresnel = float(1).sub(skyNormalWorld.dot(viewDir).max(0)).pow(4.0);
  const fresnelColor = tslColor(0xeaf2c0);
  const fresnelRim = fresnelColor
    .mul(fresnel)
    .mul(0.25)
    .mul(uniforms.fresnelEnabled);

  m.emissiveNode = translucency.add(fresnelRim);

  return m;
}
