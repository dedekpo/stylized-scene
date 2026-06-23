import type { BufferGeometry, Mesh, Object3D } from "three";

export type MeshGeometryBounds = {
  geometry: BufferGeometry | undefined;
  // Minimum local Y and total height of the geometry. The wind bend anchors at
  // baseY and ramps over height, so both callers (grass blades, tree canopy)
  // need them.
  baseY: number;
  height: number;
};

// Finds the first mesh geometry in a loaded GLB scene and measures its vertical
// extent. Returns geometry `undefined` (with neutral bounds) when the scene has
// no mesh, so callers can early-return while still destructuring safely.
export function extractFirstMeshGeometry(scene: Object3D): MeshGeometryBounds {
  let found: BufferGeometry | undefined;
  scene.traverse((o) => {
    if (!found && (o as Mesh).isMesh) found = (o as Mesh).geometry;
  });
  if (!found) return { geometry: undefined, baseY: 0, height: 1 };
  found.computeBoundingBox();
  const box = found.boundingBox!;
  return { geometry: found, baseY: box.min.y, height: box.max.y - box.min.y };
}
