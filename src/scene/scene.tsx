import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { TEXTURE_PATHS } from "../config/scene-config";
import { makeCursorUniforms, type DebugMode } from "../types";
import { TreeLeaves } from "./tree-leaves";
import { Ground } from "./ground";
import { Grass } from "./grass";

type Props = {
  density: number;
  scale: number;
  rootColor: string;
  tipColor: string;
  rootColorB: string;
  tipColorB: string;
  colorVariation: number;
  colorPatchScale: number;
  macroVariation: number;
  macroScale: number;
  windStrength: number;
  windSpeed: number;
  projection: number;
  debugMode: DebugMode;
  pathDepth: number;
  dirtBump: number;
  translucency: boolean;
  fresnel: boolean;
};

export function Scene(props: Props) {
  const [
    grassColor,
    grassNormal,
    grassRoughness,
    noiseMap,
    dirtColor,
    dirtNormal,
    dirtRoughness,
    dirtAO,
    dirtHeight,
    dirtMetallic,
    pathMask,
  ] = useTexture([
    TEXTURE_PATHS.grassColor,
    TEXTURE_PATHS.grassNormal,
    TEXTURE_PATHS.grassRoughness,
    TEXTURE_PATHS.noise,
    TEXTURE_PATHS.dirtColor,
    TEXTURE_PATHS.dirtNormal,
    TEXTURE_PATHS.dirtRoughness,
    TEXTURE_PATHS.dirtAO,
    TEXTURE_PATHS.dirtHeight,
    TEXTURE_PATHS.dirtMetallic,
    TEXTURE_PATHS.pathMask,
  ]);

  const cursor = useMemo(() => makeCursorUniforms(), []);

  return (
    <>
      <TreeLeaves
        windStrength={props.windStrength}
        windSpeed={props.windSpeed}
        noiseMap={noiseMap}
        cursor={cursor}
      />
      <Ground
        grassColor={grassColor}
        grassNormal={grassNormal}
        grassRoughness={grassRoughness}
        dirtColor={dirtColor}
        dirtNormal={dirtNormal}
        dirtRoughness={dirtRoughness}
        dirtAO={dirtAO}
        dirtHeight={dirtHeight}
        dirtMetallic={dirtMetallic}
        pathMask={pathMask}
        noiseMap={noiseMap}
        pathDepth={props.pathDepth}
        dirtBump={props.dirtBump}
        cursor={cursor}
      />
      <Grass
        density={props.density}
        scale={props.scale}
        rootColor={props.rootColor}
        tipColor={props.tipColor}
        rootColorB={props.rootColorB}
        tipColorB={props.tipColorB}
        colorVariation={props.colorVariation}
        colorPatchScale={props.colorPatchScale}
        macroVariation={props.macroVariation}
        macroScale={props.macroScale}
        windStrength={props.windStrength}
        windSpeed={props.windSpeed}
        projection={props.projection}
        debugMode={props.debugMode}
        translucency={props.translucency}
        fresnel={props.fresnel}
        groundColorMap={grassColor}
        noiseMap={noiseMap}
        pathMask={pathMask}
        cursor={cursor}
      />
    </>
  );
}
