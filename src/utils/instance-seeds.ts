export function generateInstanceSeeds(
  count: number,
  areaSize: number
): Float32Array {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3 + 0] = (Math.random() - 0.5) * areaSize;
    arr[i * 3 + 1] = (Math.random() - 0.5) * areaSize;
    arr[i * 3 + 2] = Math.random() * Math.PI * 2;
  }
  return arr;
}
