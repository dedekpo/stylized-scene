import { useTexture } from "@react-three/drei";
import { TEXTURE_PATHS } from "../config/scene-config";
import type { DebugMode } from "../types";
import { Tree } from "./tree";
import { Ground } from "./ground";
import { Grass } from "./grass";

// One tree near each corner of the 40x40 ground (axes span -20..20), inset so
// the canopies stay over the grass, with varied yaw/scale so they don't look
// cloned.
const TREE_LAYOUT: ReadonlyArray<{
  position: [number, number, number];
  rotationY: number;
  scale: number;
}> = [
  { position: [13, 0, -13], rotationY: 0.0, scale: 1.0 },
  { position: [-13, 0, -13], rotationY: 2.1, scale: 0.9 },
  { position: [-13, 0, 13], rotationY: 4.0, scale: 1.1 },
  { position: [13, 0, 13], rotationY: 1.0, scale: 0.95 },
];

type Props = {
  density: number;
  scale: number;
  heightVariation: number;
  heightNoiseScale: number;
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
  windAngle: number;
  gustScale: number;
  turbulence: number;
  flutter: number;
  treeSway: number;
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

  return (
    <>
      {TREE_LAYOUT.map((tree, i) => (
        <Tree
          key={i}
          position={tree.position}
          rotationY={tree.rotationY}
          scale={tree.scale}
          windStrength={props.windStrength}
          windSpeed={props.windSpeed}
          windAngle={props.windAngle}
          gustScale={props.gustScale}
          turbulence={props.turbulence}
          flutter={props.flutter}
          treeSway={props.treeSway}
          noiseMap={noiseMap}
        />
      ))}
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
      />
      <Grass
        density={props.density}
        scale={props.scale}
        heightVariation={props.heightVariation}
        heightNoiseScale={props.heightNoiseScale}
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
        windAngle={props.windAngle}
        gustScale={props.gustScale}
        turbulence={props.turbulence}
        flutter={props.flutter}
        projection={props.projection}
        debugMode={props.debugMode}
        translucency={props.translucency}
        fresnel={props.fresnel}
        groundColorMap={grassColor}
        noiseMap={noiseMap}
        pathMask={pathMask}
      />
    </>
  );
}
