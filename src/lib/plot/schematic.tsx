/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';

/** Responsive SVG wrapper. Children draw in the given viewBox coordinate space. */
export function Schematic({
  width,
  height,
  children,
  ariaLabel,
}: {
  width: number;
  height: number;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <svg
      className="schematic"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      {children}
    </svg>
  );
}

/** Wire as a polyline through points [x,y,x,y,…]. */
export function Wire({ points, active = false }: { points: number[]; active?: boolean }) {
  const d = points.reduce(
    (acc, v, i) => acc + (i % 2 === 0 ? (i === 0 ? 'M' : 'L') + v : ' ' + v + ' '),
    '',
  );
  return <path className={active ? 'schematic__wire schematic__active' : 'schematic__wire'} d={d} />;
}

/** Labeled rounded-rect block. */
export function Block({
  x,
  y,
  w,
  h,
  label,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}) {
  return (
    <g>
      <rect className="schematic__fill" x={x} y={y} width={w} height={h} rx={3} />
      <text
        className="schematic__label"
        x={x + w / 2}
        y={y + h / 2}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {label}
      </text>
    </g>
  );
}

/** Connection dot. */
export function Node({ x, y }: { x: number; y: number }) {
  return <circle className="schematic__node" cx={x} cy={y} r={1.8} />;
}

/** Free text label. */
export function Label({
  x,
  y,
  text,
  anchor = 'middle',
}: {
  x: number;
  y: number;
  text: string;
  anchor?: 'start' | 'middle' | 'end';
}) {
  return (
    <text className="schematic__label" x={x} y={y} textAnchor={anchor} dominantBaseline="middle">
      {text}
    </text>
  );
}

/**
 * Diode pointing along +x by default; rotate via `rot` (deg). When `active` the
 * triangle fills with the accent color (conducting).
 */
export function Diode({
  x,
  y,
  rot = 0,
  active = false,
}: {
  x: number;
  y: number;
  rot?: number;
  active?: boolean;
}) {
  const cls = active ? 'schematic__symbol schematic__active' : 'schematic__symbol';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <polygon className={cls} points="-5,-5 5,0 -5,5" />
      <line className="schematic__symbol" x1={5} y1={-5} x2={5} y2={5} />
    </g>
  );
}

/** Resistor (IEC box) centred at (x,y), horizontal. */
export function Resistor({ x, y, len = 18 }: { x: number; y: number; len?: number }) {
  return <rect className="schematic__symbol" x={x - len / 2} y={y - 4} width={len} height={8} />;
}

/** Capacitor (two plates) centred at (x,y). */
export function Capacitor({ x, y }: { x: number; y: number }) {
  return (
    <g className="schematic__symbol">
      <line x1={x - 6} y1={y - 3} x2={x + 6} y2={y - 3} />
      <line x1={x - 6} y1={y + 3} x2={x + 6} y2={y + 3} />
    </g>
  );
}

/** Transformer (two coils + core) centred at (x,y). */
export function Transformer({ x, y }: { x: number; y: number }) {
  const coil = (cx: number) => (
    <path
      className="schematic__symbol"
      d={`M${cx} ${y - 12} a3 3 0 0 1 0 6 a3 3 0 0 1 0 6 a3 3 0 0 1 0 6 a3 3 0 0 1 0 6`}
    />
  );
  return (
    <g>
      {coil(x - 6)}
      {coil(x + 6)}
      <line className="schematic__symbol" x1={x} y1={y - 12} x2={x} y2={y + 12} />
    </g>
  );
}

/** Ground symbol at (x,y). */
export function Ground({ x, y }: { x: number; y: number }) {
  return (
    <g className="schematic__symbol">
      <line x1={x} y1={y} x2={x} y2={y + 4} />
      <line x1={x - 6} y1={y + 4} x2={x + 6} y2={y + 4} />
      <line x1={x - 3} y1={y + 7} x2={x + 3} y2={y + 7} />
    </g>
  );
}

/** Mixer / multiplier: circle with ⊗. */
export function Mixer({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return (
    <g className="schematic__symbol">
      <circle cx={x} cy={y} r={r} />
      <line x1={x - r * 0.7} y1={y - r * 0.7} x2={x + r * 0.7} y2={y + r * 0.7} />
      <line x1={x - r * 0.7} y1={y + r * 0.7} x2={x + r * 0.7} y2={y - r * 0.7} />
    </g>
  );
}

/** Summing junction: circle with the given sign, e.g. "+", "Σ", "−". */
export function Summer({ x, y, sign = '+', r = 7 }: { x: number; y: number; sign?: string; r?: number }) {
  return (
    <g>
      <circle className="schematic__symbol" cx={x} cy={y} r={r} />
      <text className="schematic__label" x={x} y={y} textAnchor="middle" dominantBaseline="middle">
        {sign}
      </text>
    </g>
  );
}
