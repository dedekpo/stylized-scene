import {
  Float32BufferAttribute,
  type BufferGeometry,
  type Group,
  type Mesh,
} from "three";

// The GLB merges all blades into one primitive with no per-blade data. Separate
// blades don't share vertices, so each blade is a connected component of the
// index buffer. Tag every vertex with a sequential `bladeId` (0..n-1) so the
// shader can scale blades individually.
function assignBladeIds(geometry: BufferGeometry): void {
  const index = geometry.getIndex();
  const position = geometry.getAttribute("position");
  if (!index || !position) return;

  const count = position.count;
  const parent = new Int32Array(count);
  for (let i = 0; i < count; i++) parent[i] = i;

  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number): void => {
    parent[find(a)] = find(b);
  };

  const idx = index.array;
  for (let t = 0; t < idx.length; t += 3) {
    union(idx[t], idx[t + 1]);
    union(idx[t + 1], idx[t + 2]);
  }

  const rootToId = new Map<number, number>();
  const bladeId = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const root = find(i);
    let id = rootToId.get(root);
    if (id === undefined) {
      id = rootToId.size;
      rootToId.set(root, id);
    }
    bladeId[i] = id;
  }

  geometry.setAttribute("bladeId", new Float32BufferAttribute(bladeId, 1));
}

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

  assignBladeIds(found);

  return { geometry: found, bladeHeight: box.max.y - box.min.y };
}
