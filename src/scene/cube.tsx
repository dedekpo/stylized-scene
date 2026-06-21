import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

export function Cube() {
  const ref = useRef<Mesh>(null!);
  useFrame((_, delta) => {
    ref.current.rotation.x += delta;
    ref.current.rotation.y += delta * 0.7;
  });
  return (
    <mesh ref={ref} position={[0, 0.5, 0]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}
