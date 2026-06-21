import { uniform } from "three/tsl";
import { Vector2 } from "three";

export type DebugMode =
  | "full"
  | "gradient"
  | "ground"
  | "height"
  | "world"
  | "pathmask";

export function makeCursorUniforms() {
  return {
    pos: uniform(new Vector2(0, 0)),
    active: uniform(0),
  };
}

export type CursorUniforms = ReturnType<typeof makeCursorUniforms>;
