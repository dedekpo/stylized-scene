import type { DebugMode } from "../types";

export const SCENE = {
  GROUND_SIZE: 40,
  TEXTURE_REPEAT: 8,
} as const;

export const GRASS = {
  MAX_INSTANCES: 30000,
} as const;

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
  grassColor: "/grass_texture/grass_05_basecolor_4k.png",
  grassNormal: "/grass_texture/grass_05_normal_gl_4k.png",
  grassRoughness: "/grass_texture/grass_05_roughness_4k.png",
  noise: "/perlin.png",
  dirtColor: "/ground_texture/ground_07_4k/ground_07__basecolor_4k.png",
  dirtNormal: "/ground_texture/ground_07_4k/ground_07__normal_gl_4k.png",
  dirtRoughness: "/ground_texture/ground_07_4k/ground_07__roughness_4k.png",
  dirtAO: "/ground_texture/ground_07_4k/ground_07__ambientocclusion_4k.png",
  dirtHeight: "/ground_texture/ground_07_4k/ground_07__height_4k.png",
  dirtMetallic: "/ground_texture/ground_07_4k/ground_07__metallic_4k.png",
  pathMask: "/path.png",
  grassBlades: "/grass-blades-up.glb",
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
  bladeHeightVariation: 0.35,
  windStrength: 0.15,
  windSpeed: 1.5,
  projection: 0.7,
  debugMode: "full" as DebugMode,
  sizeNoiseScale: 0.1,
  pathDepth: 0.25,
  dirtBump: 0.15,
};
