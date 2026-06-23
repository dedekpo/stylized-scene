import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { MeshStandardNodeMaterial } from "three/webgpu";
import { attribute, positionLocal } from "three/tsl";
import {
  DoubleSide,
  InstancedBufferAttribute,
  NoColorSpace,
  Object3D,
  type InstancedMesh,
  type Mesh,
  type Texture,
} from "three";
import { TEXTURE_PATHS } from "../config/scene-config";
import { extractFirstMeshGeometry } from "../utils/mesh-geometry";
import { windSwayOffset } from "../materials/wind";
import { cameraFacingNormal } from "../materials/normals";
import { useUniform } from "../utils/use-uniform";

type Props = {
  windStrength: number;
  windSpeed: number;
  windAngle: number;
  gustScale: number;
  turbulence: number;
  flutter: number;
  treeSway: number;
  noiseMap: Texture;
};

// One canopy bush placed on top of the trunk. `pos` is relative to the tree
// group; `yaw`/`scale` vary each copy so the three together read as one full,
// varied canopy rather than a single blob.
type BushInstance = {
  pos: [number, number, number];
  yaw: number;
  scale: number;
};

// Where the tree sits on the 40x40 ground (centered at origin, so each axis
// spans -20..20). Toward the top-right but kept well inside the field so it
// reads as standing in the grass.
const TREE_POSITION: [number, number, number] = [12, 0, -12];

// Uniform scale-up for the trunk GLB (its mesh is ~0.16 units tall, base at
// y~=0), bringing the top up so the bushes can sit on it.
const TRUNK_SCALE = 12;

const BUSH_INSTANCES: ReadonlyArray<BushInstance> = [
  { pos: [-0.47, 7.59, 0.48], yaw: 0.0, scale: 0.85 },
  { pos: [-3.87, 6.79, -4.47], yaw: 1.3, scale: 0.76 },
  { pos: [-2.08, 10.5, 0.18], yaw: 2.5, scale: 0.9 },
];

// A trunk model with its baked material, topped by three instanced canopy
// bushes. The bushes share the grass wind node: each instance gets a per-bush
// world origin (so the gust sweeping the field also moves the tree, in sync) and
// a yaw basis (so the bend stays coherent in world space across the rotated
// instances) — the same attribute trick the grass uses.
export function Tree({
  windStrength,
  windSpeed,
  windAngle,
  gustScale,
  turbulence,
  flutter,
  treeSway,
  noiseMap,
}: Props) {
  const { scene: leavesScene } = useGLTF(TEXTURE_PATHS.treeLeaves);
  const { scene: trunkScene } = useGLTF(TEXTURE_PATHS.treeTrunk);
  const alphaMap = useTexture(TEXTURE_PATHS.treeLeavesAlpha);

  const windStrengthU = useUniform(windStrength);
  const windSpeedU = useUniform(windSpeed);
  const windAngleU = useUniform(windAngle);
  const gustScaleU = useUniform(gustScale);
  const turbulenceU = useUniform(turbulence);
  const flutterU = useUniform(flutter);
  const treeSwayU = useUniform(treeSway);

  // A private copy of the trunk graph (so its node transform + material render as
  // authored) with shadows enabled on its meshes.
  const trunk = useMemo(() => {
    const clone = trunkScene.clone(true);
    clone.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [trunkScene]);

  // The canopy geometry plus per-instance attributes the wind node needs:
  //  - aOrigin: each bush's world XZ, so the travelling gust is sampled at the
  //    bush's actual location (positionWorld collapses to the same value for every
  //    instance in the vertex stage, which would move them in lockstep).
  //  - aFacing: cos/sin of each bush's yaw, to counter-rotate the world bend into
  //    the instance's local frame.
  const { geometry, baseY, height } = useMemo(() => {
    const bounds = extractFirstMeshGeometry(leavesScene);
    if (!bounds.geometry) return bounds;

    const count = BUSH_INSTANCES.length;
    const origin = new Float32Array(count * 2);
    const facing = new Float32Array(count * 2);
    BUSH_INSTANCES.forEach((b, i) => {
      origin[i * 2 + 0] = TREE_POSITION[0] + b.pos[0];
      origin[i * 2 + 1] = TREE_POSITION[2] + b.pos[2];
      facing[i * 2 + 0] = Math.cos(b.yaw);
      facing[i * 2 + 1] = Math.sin(b.yaw);
    });
    bounds.geometry.setAttribute("aOrigin", new InstancedBufferAttribute(origin, 2));
    bounds.geometry.setAttribute("aFacing", new InstancedBufferAttribute(facing, 2));

    return bounds;
  }, [leavesScene]);

  const material = useMemo(() => {
    // The alpha map is a non-color mask; keep it linear so its values aren't
    // gamma-shifted before the alphaTest comparison.
    alphaMap.colorSpace = NoColorSpace;
    alphaMap.flipY = false;
    alphaMap.needsUpdate = true;

    const m = new MeshStandardNodeMaterial({
      color: "#4a6b27",
      alphaMap,
      alphaTest: 0.1,
      side: DoubleSide,
      roughness: 0.8,
      metalness: 0,
    });

    m.positionNode = positionLocal.add(
      windSwayOffset({
        baseY,
        height,
        // Per-instance world origin / yaw basis baked above. instanceIndex now
        // varies across the three bushes, so each also desyncs via the wind
        // node's per-element hash.
        origin: attribute("aOrigin", "vec2"),
        facing: attribute("aFacing", "vec2"),
        windStrength: windStrengthU,
        windSpeed: windSpeedU,
        windAngle: windAngleU,
        gustScale: gustScaleU,
        turbulence: turbulenceU,
        flutter: flutterU,
        noiseMap,
        bendExponent: 1.2,
        // Desync leaf clumps within a bush from object-space noise, lift the calm
        // floor so the whole canopy drifts, and give it a larger bend than a
        // 1-unit blade.
        clusterScale: 0.5,
        canopyLean: 0.18,
        amplitude: treeSwayU,
      })
    );

    // Each leaf card is a flat double-sided quad; orient its shading normal to
    // face the camera so both faces shade alike instead of one reading dark.
    m.normalNode = cameraFacingNormal().view;
    return m;
  }, [
    alphaMap,
    baseY,
    height,
    windStrengthU,
    windSpeedU,
    windAngleU,
    gustScaleU,
    turbulenceU,
    flutterU,
    treeSwayU,
    noiseMap,
  ]);

  const bushesRef = useRef<InstancedMesh>(null!);
  useLayoutEffect(() => {
    const mesh = bushesRef.current;
    if (!mesh || !geometry) return;
    const dummy = new Object3D();
    BUSH_INSTANCES.forEach((b, i) => {
      dummy.position.set(b.pos[0], b.pos[1], b.pos[2]);
      dummy.rotation.set(0, b.yaw, 0);
      dummy.scale.setScalar(b.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [geometry]);

  if (!geometry) return null;

  return (
    <group position={TREE_POSITION}>
      <primitive object={trunk} scale={TRUNK_SCALE} />
      <instancedMesh
        ref={bushesRef}
        args={[geometry, material, BUSH_INSTANCES.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
    </group>
  );
}

useGLTF.preload(TEXTURE_PATHS.treeLeaves);
useGLTF.preload(TEXTURE_PATHS.treeTrunk);
