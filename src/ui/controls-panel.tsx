import "./controls-panel.css";
import { useState } from "react";
import { GRASS, TONE_MAPPING_OPTIONS } from "../config/scene-config";
import type { DebugMode } from "../types";
import { CheckboxRow, ColorRow, SelectRow, SliderRow } from "./control-row";
import type { ControlSetters, ControlValues } from "./use-scene-controls";

const DEBUG_OPTIONS: ReadonlyArray<{ value: DebugMode; label: string }> = [
  { value: "full", label: "Full color" },
  { value: "gradient", label: "Gradient only (no projection/jitter)" },
  { value: "ground", label: "Ground tint sample" },
  { value: "height", label: "heightAlongBlade (grayscale)" },
  { value: "heightscale", label: "Height scale factor (grayscale)" },
  { value: "world", label: "World XZ (RGB)" },
  { value: "pathmask", label: "Path mask sample (grayscale)" },
];

const fmt2 = (v: number) => v.toFixed(2);
const fmt3 = (v: number) => v.toFixed(3);

type Props = {
  values: ControlValues;
  set: ControlSetters;
};

export function ControlsPanel({ values, set }: Props) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="controls-panel">
      <button
        type="button"
        className="controls-header"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span>Controls</span>
        <span className="controls-toggle">{collapsed ? "+" : "−"}</span>
      </button>
      {!collapsed && (
        <div className="controls-body">
          <SelectRow
            label="Tone mapping"
            value={values.toneMapping}
            options={TONE_MAPPING_OPTIONS}
            onChange={set.toneMapping}
          />
          <SliderRow
            label="Density"
            value={values.density}
            min={0}
            max={GRASS.MAX_INSTANCES}
            step={100}
            onChange={set.density}
          />
          <SliderRow
            label="Scale"
            value={values.scale}
            min={0.1}
            max={3}
            step={0.05}
            format={fmt2}
            onChange={set.scale}
          />
          <SliderRow
            label="Height variation"
            value={values.heightVariation}
            min={0}
            max={1}
            step={0.01}
            format={fmt2}
            onChange={set.heightVariation}
          />
          <SliderRow
            label="Height noise scale"
            value={values.heightNoiseScale}
            min={0.05}
            max={2}
            step={0.01}
            format={fmt2}
            onChange={set.heightNoiseScale}
          />
          <SliderRow
            label="Wind strength"
            value={values.windStrength}
            min={0}
            max={0.5}
            step={0.01}
            format={fmt2}
            onChange={set.windStrength}
          />
          <SliderRow
            label="Wind speed"
            value={values.windSpeed}
            min={0}
            max={5}
            step={0.1}
            format={fmt2}
            onChange={set.windSpeed}
          />
          <SliderRow
            label="Wind direction"
            value={values.windAngle}
            min={0}
            max={360}
            step={1}
            onChange={set.windAngle}
          />
          <SliderRow
            label="Gust frequency"
            value={values.gustScale}
            min={0.1}
            max={1.5}
            step={0.01}
            format={fmt2}
            onChange={set.gustScale}
          />
          <SliderRow
            label="Turbulence"
            value={values.turbulence}
            min={0}
            max={1}
            step={0.01}
            format={fmt2}
            onChange={set.turbulence}
          />
          <SliderRow
            label="Tip flutter"
            value={values.flutter}
            min={0}
            max={1}
            step={0.01}
            format={fmt2}
            onChange={set.flutter}
          />
          <SliderRow
            label="Tree sway"
            value={values.treeSway}
            min={0}
            max={3}
            step={0.05}
            format={fmt2}
            onChange={set.treeSway}
          />
          <SliderRow
            label="Ground projection"
            value={values.projection}
            min={0}
            max={1}
            step={0.01}
            format={fmt2}
            onChange={set.projection}
          />
          <CheckboxRow
            label="Translucency"
            value={values.translucency}
            onChange={set.translucency}
          />
          <CheckboxRow
            label="Fresnel rim"
            value={values.fresnel}
            onChange={set.fresnel}
          />
          <SelectRow
            label="Debug view"
            value={values.debugMode}
            options={DEBUG_OPTIONS}
            onChange={set.debugMode}
          />
          <SliderRow
            label="Color variation"
            value={values.colorVariation}
            min={0}
            max={1}
            step={0.01}
            format={fmt2}
            onChange={set.colorVariation}
          />
          <SliderRow
            label="Color patch scale"
            value={values.colorPatchScale}
            min={0.05}
            max={2}
            step={0.01}
            format={fmt2}
            onChange={set.colorPatchScale}
          />
          <SliderRow
            label="Macro variation"
            value={values.macroVariation}
            min={0}
            max={0.5}
            step={0.01}
            format={fmt2}
            onChange={set.macroVariation}
          />
          <SliderRow
            label="Macro scale"
            value={values.macroScale}
            min={0.01}
            max={0.5}
            step={0.005}
            format={fmt3}
            onChange={set.macroScale}
          />
          <ColorRow
            label="Variant A · root"
            value={values.rootColor}
            onChange={set.rootColor}
          />
          <ColorRow
            label="Variant A · tip"
            value={values.tipColor}
            onChange={set.tipColor}
          />
          <ColorRow
            label="Variant B · root"
            value={values.rootColorB}
            onChange={set.rootColorB}
          />
          <ColorRow
            label="Variant B · tip"
            value={values.tipColorB}
            onChange={set.tipColorB}
          />
        </div>
      )}
    </div>
  );
}
