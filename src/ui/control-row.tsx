type SliderRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
};

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: SliderRowProps) {
  const display = format ? format(value) : value.toString();
  return (
    <label className="row column">
      <span>
        {label}: {display}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

type ColorRowProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function ColorRow({ label, value, onChange }: ColorRowProps) {
  return (
    <label className="row">
      <span>{label}</span>
      <input
        type="color"
        className="color-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

type SelectRowProps<T extends string> = {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
};

export function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectRowProps<T>) {
  return (
    <label className="row">
      <span>{label}</span>
      <select
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
