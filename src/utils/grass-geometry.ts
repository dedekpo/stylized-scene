import type { BufferGeometry, Group, Mesh } from "three";

export function extractGrassGeometry(scene: Group): {
  geometry: BufferGeometry | undefined;
  bladeHeight: number;
} {
  let found: BufferGeometry | undefined;
  scene.traverse((o) => {
    if (!found && (o as Mesh).isMesh) found = (o as Mesh).geometry;
  });
  if (!found) return { geometry: undefined, bladeHeight: 1 };
  found.computeBoundingBox();
  const box = found.boundingBox!;

  return { geometry: found, bladeHeight: box.max.y - box.min.y };
}
