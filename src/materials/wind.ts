import {
  clamp,
  float,
  positionLocal,
  positionWorld,
  pow,
  sin,
  smoothstep,
  texture as tslTexture,
  time,
  vec2,
  vec3,
} from "three/tsl";
import type { Texture } from "three";
import type { Node as TSLNode } from "three/webgpu";
import type { FloatUniform } from "../utils/use-uniform";
import type { CursorUniforms } from "../types";

// A scalar (float) TSL node. Used for the optional per-element phase input so
// callers can desync neighbouring instances, and to keep the accumulated
// displacement consistently float-typed regardless of how it was built
// (float(), hash(...).mul(...), etc.).
type ShaderNode = TSLNode<"float">;

export type WindSwayOptions = {
  // Vertical extent used to normalize the bend: the geometry's minimum local Y
  // and its total height. The sway anchors at baseY (no movement, like a root
  // or trunk) and ramps to full strength at the top.
  baseY: number;
  height: number;
  windStrength: FloatUniform;
  windSpeed: FloatUniform;
  // Low-frequency noise driving the spatial variation of the sway amplitude so
  // gusts move across the field rather than everything swaying in lockstep.
  noiseMap: Texture;
  // Per-element phase offset so neighbouring elements desync. Typically derived
  // from instanceIndex for instanced meshes; defaults to 0 for a single mesh.
  phase?: ShaderNode;
  // How sharply the bend ramps from base (0) to top (1). Higher keeps the lower
  // portion stiffer. Default 2.
  bendExponent?: number;
  // High-frequency tip flutter amplitude. Pass 0 to disable. Default 0.05.
  flutterAmp?: number;
  // Overall multiplier on the resulting displacement, on top of windStrength.
  // Lets large elements (a tree canopy) move at a visible absolute scale while
  // sharing the same wind uniforms as small ones (grass). Default 1.
  amplitude?: number;
  // Optional pointer interaction that pushes elements away from the cursor.
  cursor?: CursorUniforms;
};

// Computes the wind-driven local-space displacement shared by the grass blades
// and the tree leaves. Returns a vec3 offset to add to positionLocal. The
// motion is a world-space sway (so neighbours move coherently) whose amplitude
// is modulated by drifting noise, ramped by height above the anchor, with an
// optional high-frequency tip flutter and cursor push.
export function windSwayOffset({
  baseY,
  height,
  windStrength,
  windSpeed,
  noiseMap,
  phase = float(0),
  bendExponent = 2.0,
  flutterAmp = 0.05,
  amplitude = 1.0,
  cursor,
}: WindSwayOptions) {
  const heightFactor = clamp(positionLocal.y.sub(baseY).div(height), 0, 1);
  const bendStrength = pow(heightFactor, bendExponent);

  const worldXZ = vec2(positionWorld.x, positionWorld.z);

  const spatialFreq = float(0.3);
  const swayPhase = worldXZ.x
    .mul(spatialFreq)
    .add(worldXZ.y.mul(spatialFreq))
    .add(time.mul(windSpeed))
    .add(phase);
  const sway = sin(swayPhase);

  // Slowly drifting spatial noise so the sway amplitude varies across space
  // instead of every element moving with identical strength.
  const windPatchScale = float(0.06);
  const windPatchUV = vec2(
    worldXZ.x.mul(windPatchScale).add(time.mul(0.15)),
    worldXZ.y.mul(windPatchScale).add(time.mul(0.08))
  );
  const windPatch = tslTexture(noiseMap, windPatchUV).r;

  const swayAmp = windStrength.mul(float(0.5).add(windPatch.mul(0.8)));
  const swayOffset = sway.mul(swayAmp).mul(bendStrength);

  // High-frequency tip flutter — masked to the top so only the thin edges
  // shimmer. Zeroed out when disabled rather than branching, so totalLocalX
  // stays a single float expression (cleaner for the TSL type inference).
  const flutterMask = smoothstep(0.7, 1.0, heightFactor);
  const flutterPhase = time
    .mul(8.0)
    .add(phase.mul(2))
    .add(worldXZ.x.mul(0.5))
    .add(worldXZ.y.mul(0.5));
  const flutterOffset: ShaderNode =
    flutterAmp > 0
      ? sin(flutterPhase).mul(flutterAmp).mul(flutterMask)
      : float(0);

  // Pointer push: elements lean away from the cursor, ramped by the same bend.
  let cursorPush: ShaderNode = float(0);
  if (cursor) {
    const cursorDist = worldXZ.sub(cursor.pos).length();
    const cursorFalloff = float(1)
      .sub(smoothstep(0, 1.8, cursorDist))
      .mul(cursor.active);
    cursorPush = cursorFalloff.mul(0.9).mul(bendStrength);
  }

  const totalLocalX: ShaderNode = swayOffset
    .add(flutterOffset)
    .add(cursorPush)
    .mul(float(amplitude));

  return vec3(totalLocalX, 0, 0);
}
