import type { ReactNode } from 'react';

/** Inline legend for multi-trace plots (color swatch + label). */
export function Legend({
  entries,
}: {
  entries: { color: string; label: string; dashed?: boolean }[];
}) {
  return (
    <div className="an__legend">
      {entries.map((e) => (
        <span key={e.label} className="an__legend-item">
          <span
            className="an__legend-swatch"
            style={{ background: e.dashed ? 'transparent' : e.color, borderColor: e.color }}
          />
          {e.label}
        </span>
      ))}
    </div>
  );
}

/** Compact labelled numeric readout for the readouts row. */
export function Metric({
  label,
  value,
  unit,
}: {
  label: ReactNode;
  value: string;
  unit?: string;
}) {
  return (
    <div className="an__metric">
      <span className="an__metric-label">{label}</span>
      <span className="an__metric-value">
        {value}
        {unit ? <span className="an__metric-unit"> {unit}</span> : null}
      </span>
    </div>
  );
}
