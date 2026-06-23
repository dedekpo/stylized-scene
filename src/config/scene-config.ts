import type { DebugMode, ToneMappingMode } from "../types";

export const SCENE = {
  GROUND_SIZE: 40,
  TEXTURE_REPEAT: 8,
} as const;

export const GRASS = {
  MAX_INSTANCES: 30000,
} as const;

// Tone mapping curves selectable from the debug panel. "neutral" (Khronos PBR
// Neutral) rolls off bright highlights while preserving hue/saturation, which
// suits a stylized look; "none" lets values clip to white for comparison.
export const TONE_MAPPING_OPTIONS: ReadonlyArray<{
  value: ToneMappingMode;
  label: string;
}> = [
  { value: "neutral", label: "PBR Neutral (stylized)" },
  { value: "agx", label: "AgX" },
  { value: "aces", label: "ACES Filmic" },
  { value: "reinhard", label: "Reinhard" },
  { value: "cineon", label: "Cineon" },
  { value: "linear", label: "Linear" },
  { value: "none", label: "None (clip to white)" },
];

export const LIGHTING = {
  // Directional "sun" key light. Position sets the sun direction — keep it
  // roughly aligned with the bright spot of the sunset HDRI so the cast
  // shadows agree with the environment lighting.
  sunPosition: [18, 16, 10] as [number, number, number],
  sunColor: "#fff1cf",
  sunIntensity: 3.0,
  // Ortho shadow frustum half-extent; must cover the ground (GROUND_SIZE / 2)
  // plus a margin so blades at the edges still cast/receive.
  shadowFrustum: 24,
  shadowMapSize: 2048,
  shadowNear: 0.5,
  shadowFar: 70,
  shadowBias: -0.0001,
  shadowNormalBias: 0.04,
  // IBL fill strength. Lower than 1 so the sun stays the dominant key light
  // instead of the scene washing out into flat ambient.
  environmentIntensity: 0.6,
} as const;

export const TEXTURE_PATHS = {
  grassColor: "/grass_texture/grass_05_basecolor_1k.webp",
  grassNormal: "/grass_texture/grass_05_normal_gl_1k.webp",
  grassRoughness: "/grass_texture/grass_05_roughness_1k.webp",
  noise: "/perlin.webp",
  dirtColor: "/ground_texture/ground_07_4k/ground_07__basecolor_1k.webp",
  dirtNormal: "/ground_texture/ground_07_4k/ground_07__normal_gl_1k.webp",
  dirtRoughness: "/ground_texture/ground_07_4k/ground_07__roughness_1k.webp",
  dirtAO: "/ground_texture/ground_07_4k/ground_07__ambientocclusion_1k.webp",
  dirtHeight: "/ground_texture/ground_07_4k/ground_07__height_1k.webp",
  dirtMetallic: "/ground_texture/ground_07_4k/ground_07__metallic_1k.webp",
  pathMask: "/path.webp",
  grassBlades: "/grass-blades-up.glb",
  treeLeaves: "/tree-leaves-mesh.glb",
  treeLeavesAlpha: "/leaves-alpha-map.png",
  treeTrunk: "/tree-tronk-transformed.glb",
  sky: "/skybox/sky_88_2k.png",
} as const;

export const DEFAULT_CONTROLS = {
  density: 5000,
  scale: 1,
  rootColor: "#2d4a1f",
  tipColor: "#9bba4a",
  rootColorB: "#3c4a22",
  tipColorB: "#c2c25a",
  colorVariation: 0.6,
  colorPatchScale: 0.35,
  macroVariation: 0.15,
  macroScale: 0.05,
  windStrength: 0.25,
  windSpeed: 2.0,
  windAngle: 45,
  gustScale: 0.5,
  turbulence: 0.4,
  flutter: 0.5,
  treeSway: 1.2,
  projection: 0.7,
  debugMode: "full" as DebugMode,
  pathDepth: 0.25,
  dirtBump: 0.15,
  translucency: true,
  fresnel: false,
  toneMapping: "neutral" as ToneMappingMode,
};
