import { useState } from "react";
import { DEFAULT_CONTROLS } from "../config/scene-config";
import type { DebugMode } from "../types";

export function useSceneControls() {
  const [density, setDensity] = useState(DEFAULT_CONTROLS.density);
  const [scale, setScale] = useState(DEFAULT_CONTROLS.scale);
  const [rootColor, setRootColor] = useState(DEFAULT_CONTROLS.rootColor);
  const [tipColor, setTipColor] = useState(DEFAULT_CONTROLS.tipColor);
  const [rootColorB, setRootColorB] = useState(DEFAULT_CONTROLS.rootColorB);
  const [tipColorB, setTipColorB] = useState(DEFAULT_CONTROLS.tipColorB);
  const [colorVariation, setColorVariation] = useState(
    DEFAULT_CONTROLS.colorVariation
  );
  const [colorPatchScale, setColorPatchScale] = useState(
    DEFAULT_CONTROLS.colorPatchScale
  );
  const [macroVariation, setMacroVariation] = useState(
    DEFAULT_CONTROLS.macroVariation
  );
  const [macroScale, setMacroScale] = useState(DEFAULT_CONTROLS.macroScale);
  const [windStrength, setWindStrength] = useState(
    DEFAULT_CONTROLS.windStrength
  );
  const [windSpeed, setWindSpeed] = useState(DEFAULT_CONTROLS.windSpeed);
  const [projection, setProjection] = useState(DEFAULT_CONTROLS.projection);
  const [debugMode, setDebugMode] = useState<DebugMode>(
    DEFAULT_CONTROLS.debugMode
  );
  const [pathDepth, setPathDepth] = useState(DEFAULT_CONTROLS.pathDepth);
  const [dirtBump, setDirtBump] = useState(DEFAULT_CONTROLS.dirtBump);

  return {
    values: {
      density,
      scale,
      rootColor,
      tipColor,
      rootColorB,
      tipColorB,
      colorVariation,
      colorPatchScale,
      macroVariation,
      macroScale,
      windStrength,
      windSpeed,
      projection,
      debugMode,
      pathDepth,
      dirtBump,
    },
    set: {
      density: setDensity,
      scale: setScale,
      rootColor: setRootColor,
      tipColor: setTipColor,
      rootColorB: setRootColorB,
      tipColorB: setTipColorB,
      colorVariation: setColorVariation,
      colorPatchScale: setColorPatchScale,
      macroVariation: setMacroVariation,
      macroScale: setMacroScale,
      windStrength: setWindStrength,
      windSpeed: setWindSpeed,
      projection: setProjection,
      debugMode: setDebugMode,
      pathDepth: setPathDepth,
      dirtBump: setDirtBump,
    },
  };
}

export type SceneControls = ReturnType<typeof useSceneControls>;
export type ControlValues = SceneControls["values"];
export type ControlSetters = SceneControls["set"];
