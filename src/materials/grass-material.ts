import { MeshStandardNodeMaterial, type Node as TSLNode } from "three/webgpu";
import {
  attribute,
  cameraPosition,
  clamp,
  color as tslColor,
  float,
  hash,
  instanceIndex,
  mix,
  mx_noise_float,
  normalize,
  positionLocal,
  positionWorld,
  pow,
  texture as tslTexture,
  vec2,
  vec3,
} from "three/tsl";
import { DoubleSide, type Texture } from "three";
import { LIGHTING, SCENE } from "../config/scene-config";
import type { DebugMode } from "../types";
import type { ColorUniform, FloatUniform } from "../utils/use-uniform";
import { windSwayOffset } from "./wind";
import { skyHemisphereNormal } from "./normals";

export type GrassMaterialParams = {
  bladeHeight: number;
  debugMode: DebugMode;
  textures: {
    groundColorMap: Texture;
    noiseMap: Texture;
    pathMask: Texture;
  };
  uniforms: {
    heightVariation: FloatUniform;
    heightNoiseScale: FloatUniform;
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
    windAngle: FloatUniform;
    gustScale: FloatUniform;
    turbulence: FloatUniform;
    flutter: FloatUniform;
    projection: FloatUniform;
    translucencyEnabled: FloatUniform;
    fresnelEnabled: FloatUniform;
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

  const worldXZ = vec2(positionWorld.x, positionWorld.z);

  // Per-instance world XZ of the blade model, baked as an instanced attribute in
  // grass.tsx. In the position/vertex stage positionWorld does NOT carry the
  // per-instance offset for an InstancedMesh (it collapses to one shared value),
  // so anything spatial computed here — the wind gust AND the height noise below
  // — must sample this attribute instead, or the whole field reads identically.
  const instanceOrigin: TSLNode<"vec2"> = attribute("aOrigin", "vec2");

  const swayOffset = windSwayOffset({
    baseY: 0,
    height: bladeHeight,
    // Per-instance world XZ and yaw basis, set on the geometry in grass.tsx. The
    // origin makes the gust wave sample at each blade's own location; the facing
    // keeps the bend direction coherent in world space across rotated blades.
    origin: instanceOrigin,
    facing: attribute("aFacing", "vec2"),
    windStrength: uniforms.windStrength,
    windSpeed: uniforms.windSpeed,
    windAngle: uniforms.windAngle,
    gustScale: uniforms.gustScale,
    turbulence: uniforms.turbulence,
    flutter: uniforms.flutter,
    noiseMap: textures.noiseMap,
  });

  const groundUVFromWorld = vec2(
    positionWorld.x.div(SCENE.GROUND_SIZE).add(0.5),
    positionWorld.z.div(SCENE.GROUND_SIZE).add(0.5)
  );
  const pathSample = tslTexture(textures.pathMask, groundUVFromWorld).r;

  // Per-clump height variation. The same MaterialX gradient noise that drives the
  // color patches, sampled here by the blade model's world XZ, so neighbouring
  // models share a height while the field swells and dips in organic waves
  // instead of being one flat carpet. The fixed UV offset decorrelates the height
  // pattern from the color/macro noise so tall patches don't line up with tints.
  // heightNoiseScale sets the clump frequency (higher = smaller patches);
  // heightVariation sets the swing around the base height. The noise is signed
  // (~-1..1), so the factor stays centred on 1.0 and the average blade keeps its
  // authored height; clamped so a model is never inverted or fully flattened.
  const heightNoise = mx_noise_float(
    instanceOrigin.add(vec2(53.0, 17.0)).mul(uniforms.heightNoiseScale)
  );
  const heightFactor = clamp(
    float(1).add(heightNoise.mul(uniforms.heightVariation)),
    0.2,
    1.8
  );

  // Scale the whole bent blade model vertically. Applying the factor after the
  // wind sway (rather than scaling positionLocal first) keeps the root planted at
  // y=0 and stretches the full curved silhouette, so taller models also sway
  // taller. Only Y is scaled — the six blades keep their width and footprint.
  const swayed = positionLocal.add(swayOffset);
  m.positionNode = vec3(swayed.x, swayed.y.mul(heightFactor), swayed.z);

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
      : debugMode === "heightscale"
      ? // Per-model height factor mapped to gray: 1.0 (authored height) reads as
        // mid-gray, taller patches brighter, shorter darker.
        vec3(heightFactor.mul(0.5))
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

  // Double-sided lighting fix (see skyHemisphereNormal). skyNormalWorld is
  // reused below by the translucency and fresnel terms.
  const { world: skyNormalWorld, view: skyNormalView } = skyHemisphereNormal();
  m.normalNode = skyNormalView;

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
