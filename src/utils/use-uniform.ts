import { useEffect, useMemo } from "react";
import { uniform } from "three/tsl";
import { Color } from "three";

export function useUniform(value: number) {
  const u = useMemo(() => uniform(0), []);
  useEffect(() => {
    u.value = value;
  }, [value, u]);
  return u;
}

export type FloatUniform = ReturnType<typeof useUniform>;

export function useUniformColor(hex: string) {
  const u = useMemo(() => uniform(new Color()), []);
  useEffect(() => {
    u.value.set(hex).convertSRGBToLinear();
  }, [hex, u]);
  return u;
}

export type ColorUniform = ReturnType<typeof useUniformColor>;
