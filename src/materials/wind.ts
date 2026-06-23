import {
  clamp,
  cos,
  float,
  hash,
  instanceIndex,
  max,
  pow,
  positionLocal,
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

type ShaderNode = TSLNode<"float">;
type Vec2Node = TSLNode<"vec2">;

export type WindSwayOptions = {
  // Vertical extent used to normalize the bend: the geometry's minimum local Y
  // and its total height. The blade is rooted at baseY and curves toward the tip.
  baseY: number;
  height: number;
  // Per-element world XZ that samples the wind field. For instanced grass this
  // MUST be a per-instance attribute (the instance's world position) — sampling
  // positionWorld in the vertex/position stage does not reliably carry the
  // per-instance offset, which is why a shared positionWorld made every blade
  // move in lockstep. For a single mesh (the tree) positionWorld.xz is fine.
  origin: Vec2Node;
  windStrength: FloatUniform;
  windSpeed: FloatUniform;
  // Wind heading in degrees (0..360) in the world XZ plane.
  windAngle: FloatUniform;
  // Spatial frequency of the travelling gust wave. Higher = more, tighter bands
  // sweeping across the field; lower = broad, slow gust fronts.
  gustScale: FloatUniform;
  // Per-blade directional wobble (0..1): how much blades bend off the main wind
  // axis over time, so they don't all lean in one rigid direction.
  turbulence: FloatUniform;
  // High-frequency tip-flutter amount (0..1).
  flutter: FloatUniform;
  // Low-frequency noise that warps the gust front so it reads as an organic gust
  // rather than ruler-straight bands.
  noiseMap: Texture;
  // Per-instance facing basis vec2(cos(yaw), sin(yaw)). Instanced blades get a
  // random yaw; without counter-rotating the world-space bend into each blade's
  // local frame the gust direction would scramble per blade. Omit for a single
  // un-rotated mesh (the tree canopy), where local and world axes already agree.
  facing?: Vec2Node;
  // Extra per-element phase offset (e.g. per-cluster desync for the tree, which
  // has no per-instance index). Added on top of the per-instance hash.
  phase?: ShaderNode;
  // How the curvature is distributed along the height. Higher keeps the lower
  // portion stiffer and curls more toward the tip. Default 1.5.
  bendExponent?: number;
  // Object-space frequency for per-cluster desync on a single merged mesh (the
  // tree). Each leaf clump's local XZ samples noise for its own phase. 0 disables.
  clusterScale?: number;
  // Minimum bend angle (radians) so even the calm baseline moves, and the whole
  // element drifts as a unit instead of only the tip. Default 0. The tree uses a
  // positive floor so the canopy sways wholesale.
  canopyLean?: number;
  // Overall multiplier on the bend angle. Default 1. Larger elements that should
  // read as bigger, slower motion (the tree) pass a value here.
  amplitude?: number | FloatUniform;
};

// Wind-driven local-space displacement shared by the grass blades and the tree
// canopy. Returns a vec3 offset to add to positionLocal.
//
// The model is a circular-arc cantilever bend: a point partway up the blade is
// rotated through an angle that grows toward the tip, so the BODY of the blade
// curves over (like real grass bending) instead of translating rigidly like a
// leaning stick. The bend angle is driven by a travelling gust wave that sweeps
// across the field in the wind direction (sampled at the element's world origin,
// so neighbours share the gust but differ by a per-blade phase), plus a calm
// breeze floor and a little chop so nothing is ever fully static.
export function windSwayOffset({
  baseY,
  height,
  origin,
  windStrength,
  windSpeed,
  windAngle,
  gustScale,
  turbulence,
  flutter,
  noiseMap,
  facing,
  phase = float(0),
  bendExponent = 1.5,
  clusterScale = 0.0,
  canopyLean = 0.0,
  amplitude = 1.0,
}: WindSwayOptions) {
  // Normalized height along the element: 0 at the anchor, 1 at the tip.
  const t = clamp(positionLocal.y.sub(baseY).div(height), 0, 1);

  // Per-element desync. instanceIndex varies across instanced blades and is a
  // constant 0 for a single mesh (the tree desyncs via clusterScale instead).
  const bladeSeed = hash(instanceIndex);
  const clusterPhase: ShaderNode =
    clusterScale > 0
      ? tslTexture(noiseMap, positionLocal.xz.mul(clusterScale).add(0.5)).r.mul(
          6.28318
        )
      : float(0);
  const bladePhase = bladeSeed.mul(6.28318).add(phase).add(clusterPhase);
  const ampVar = float(0.65).add(hash(instanceIndex.add(7.0)).mul(0.7));

  // Wind heading -> unit direction, with a slow per-blade wobble so blades bend
  // slightly off-axis over time rather than all leaning the exact same way.
  const baseAngle = windAngle.mul(Math.PI / 180);
  const wobble = sin(time.mul(windSpeed).mul(0.6).add(bladePhase))
    .mul(turbulence)
    .mul(0.4);
  const angle = baseAngle.add(wobble);
  const windDir = vec2(cos(angle), sin(angle));
  const perpDir = vec2(windDir.y.negate(), windDir.x);

  // Distance along the wind axis: the phase reference for the travelling waves.
  const along = origin.dot(windDir);

  // Travelling gust front: a broad wave sweeping downwind, warped by slow noise
  // so the front is organic instead of a straight band, and sharpened (pow) so
  // it reads as a moving pulse of wind rather than a gentle sine. 0..1.
  const noiseJitter = tslTexture(noiseMap, origin.mul(0.03)).r.sub(0.5).mul(2.0);
  const gustPhase = along
    .mul(gustScale)
    .sub(time.mul(windSpeed).mul(0.6))
    .add(noiseJitter.mul(1.5));
  const gust = pow(sin(gustPhase).mul(0.5).add(0.5), float(1.6));

  // Faster, finer chop on top of the gust so motion keeps wiggling between gusts.
  const chopPhase = along
    .mul(gustScale.mul(2.7))
    .sub(time.mul(windSpeed).mul(1.3))
    .add(bladePhase);
  const chop = sin(chopPhase).mul(0.5).add(0.5);

  // Bend intensity: a breeze floor (never fully static) + the gust + a little
  // chop, scaled per blade. Always >= 0 so blades lean and pulse downwind like
  // real grass instead of rocking symmetrically through vertical.
  const intensity = float(0.25)
    .add(gust.mul(0.85))
    .add(chop.mul(0.18))
    .mul(ampVar);

  // Max bend angle at the tip, in radians. clamp keeps it from curling past ~90°.
  const BEND_GAIN = 3.0;
  const phi = clamp(
    windStrength.mul(intensity).mul(BEND_GAIN).mul(amplitude).add(canopyLean),
    0,
    1.6
  );

  // Circular-arc bend. A vertex at height t bends through angle a = phi * t^k.
  // Horizontal advance u = R(1 - cos a) is ~0 near the base and grows toward the
  // tip, so the column curves; dv reduces the height as it bends over so the tip
  // droops along the arc instead of stretching. R = height / phi.
  const shaped = pow(t, bendExponent);
  const a = phi.mul(shaped);
  const safePhi = max(phi, float(1e-3));
  const R = float(height).div(safePhi);
  const u = R.mul(float(1).sub(cos(a)));
  const dv = R.mul(sin(a)).sub(positionLocal.y.sub(baseY));

  // Tip flutter: a fast perpendicular shimmer masked to the upper portion.
  const flutterMask = smoothstep(0.55, 1.0, t);
  const flutterPhase = time
    .mul(10.0)
    .add(bladePhase.mul(3))
    .add(along.mul(0.8));
  const flutterAmt = sin(flutterPhase).mul(flutter).mul(0.08).mul(flutterMask);

  // World-space horizontal displacement: the arc advance along the wind plus the
  // perpendicular flutter.
  const horiz = windDir.mul(u).add(perpDir.mul(flutterAmt));

  // Counter-rotate the world displacement into the instance's local frame by
  // -yaw so the geometry's later instance-yaw rotation lands it on the intended
  // world direction. Y is unaffected by the yaw rotation.
  if (facing) {
    const cosY = facing.x;
    const sinY = facing.y;
    const localX = horiz.x.mul(cosY).sub(horiz.y.mul(sinY));
    const localZ = horiz.x.mul(sinY).add(horiz.y.mul(cosY));
    return vec3(localX, dv, localZ);
  }

  return vec3(horiz.x, dv, horiz.y);
}
