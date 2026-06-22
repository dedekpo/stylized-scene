import { MeshStandardNodeMaterial } from "three/webgpu";
import {
  abs,
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
  sin,
  smoothstep,
  texture as tslTexture,
  time,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { DoubleSide, type Texture } from "three";
import { SCENE } from "../config/scene-config";
import type { CursorUniforms, DebugMode } from "../types";
import type { ColorUniform, FloatUniform } from "../utils/use-uniform";

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
  const bendStrength = pow(heightAlongBlade, 2.0);

  const bladeSeed = hash(float(instanceIndex));
  const bladePhase = bladeSeed.mul(6.28318);

  const worldXZ = vec2(positionWorld.x, positionWorld.z);

  const spatialFreq = float(0.3);
  const swayPhase = worldXZ.x
    .mul(spatialFreq)
    .add(worldXZ.y.mul(spatialFreq))
    .add(time.mul(uniforms.windSpeed))
    .add(bladePhase);
  const sway = sin(swayPhase);

  // Slowly drifting spatial noise so the sway amplitude varies across the
  // field instead of every blade moving with identical strength.
  const windPatchScale = float(0.06);
  const windPatchUV = vec2(
    worldXZ.x.mul(windPatchScale).add(time.mul(0.15)),
    worldXZ.y.mul(windPatchScale).add(time.mul(0.08))
  );
  const windPatch = tslTexture(textures.noiseMap, windPatchUV).r;

  const flutterPhase = time
    .mul(8.0)
    .add(bladePhase.mul(2))
    .add(worldXZ.x.mul(0.5))
    .add(worldXZ.y.mul(0.5));
  const flutter = sin(flutterPhase);
  const flutterMask = smoothstep(0.7, 1.0, heightAlongBlade);

  const swayAmp = uniforms.windStrength.mul(float(0.5).add(windPatch.mul(0.8)));

  const swayOffset = sway.mul(swayAmp).mul(bendStrength);
  const flutterOffset = flutter.mul(0.05).mul(flutterMask);

  const cursorDelta = worldXZ.sub(uniforms.cursor.pos);
  const cursorDist = cursorDelta.length();
  const cursorFalloff = float(1)
    .sub(smoothstep(0, 1.8, cursorDist))
    .mul(uniforms.cursor.active);
  const cursorPush = cursorFalloff.mul(0.9).mul(bendStrength);

  const totalLocalX = swayOffset.add(flutterOffset).add(cursorPush);

  const groundUVFromWorld = vec2(
    positionWorld.x.div(SCENE.GROUND_SIZE).add(0.5),
    positionWorld.z.div(SCENE.GROUND_SIZE).add(0.5)
  );
  const pathSample = tslTexture(textures.pathMask, groundUVFromWorld).r;

  m.positionNode = positionLocal.add(vec3(totalLocalX, 0, 0));

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

  return m;
}
