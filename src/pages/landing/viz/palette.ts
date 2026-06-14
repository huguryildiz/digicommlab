/**
 * Instrument screen palette — theme-aware.
 *
 * Dark mode: classic oscilloscope — near-black screen + bright neon traces.
 * Light mode: a soft light-blue screen + deepened traces (the neon colors wash
 * out on a light surface), matching the `--color-*` light tokens in tokens.css.
 * The active palette is resolved live from the document's `data-theme`, so the
 * same VIZ.* lookups flip automatically when the user toggles the theme.
 */
type Palette = {
  screen: string; // canvas/screen fill (matches --canvas-bg)
  trail: string; // phosphor-persistence wash
  green: string; // input / trace        (--color-x)
  blue: string; // samples               (--color-y)
  orange: string; // system / S&H        (--color-h)
  pink: string; // channel / noise       (--color-marker)
  text: string; // on-screen labels      (--text)
  grid: string;
  gridStrong: string;
  axis: string;
  dim: string;
};

const DARK: Palette = {
  screen: '#04050f',
  trail: 'rgba(4, 5, 15, 0.22)',
  green: '#39ff85',
  blue: '#7b8cff',
  orange: '#ff8c42',
  pink: '#ff4f9a',
  text: '#eafff2',
  grid: 'rgba(57, 255, 133, 0.07)',
  gridStrong: 'rgba(57, 255, 133, 0.14)',
  axis: 'rgba(123, 140, 255, 0.18)',
  dim: 'rgba(122, 130, 166, 0.4)',
};

const LIGHT: Palette = {
  screen: '#eaf2fd', // soft light-blue screen
  trail: 'rgba(234, 242, 253, 0.3)',
  green: '#0a6428',
  blue: '#2c43c4',
  orange: '#c2410c',
  pink: '#c8186a',
  text: '#16203f',
  grid: 'rgba(40, 70, 130, 0.1)',
  gridStrong: 'rgba(40, 70, 130, 0.2)',
  axis: 'rgba(40, 70, 130, 0.28)',
  dim: 'rgba(54, 64, 96, 0.55)',
};

function isLight(): boolean {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
}

/** Live theme-aware palette: VIZ.green etc. resolve against the current theme on every read. */
export const VIZ: Palette = new Proxy({} as Palette, {
  get(_target, prop: string | symbol): string {
    const p = isLight() ? LIGHT : DARK;
    return p[prop as keyof Palette];
  },
});

/** Convert "#rrggbb" to a semi-transparent `rgba(...)` string. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Standard normal sample via Box-Muller (for noise spread). */
export function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
