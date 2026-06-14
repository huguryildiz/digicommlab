import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ, gaussian } from './palette';
import { advanceNoiseTrace, makeBandLimitedSampler, makeNoiseTrace } from './noiseTrace';

/** Visible sample columns across the canvas width (noise texture density). */
const VISIBLE = 120;
/** Advance the ensemble one sample every N frames (scroll speed; lower = faster). */
const FRAMES_PER_STEP = 2;
/**
 * AR(1) correlation of the noise source: a real random process is band-limited,
 * so consecutive samples are correlated. Higher = smoother flowing trace; 0 =
 * raw white noise (jagged, reads as sparkly stutter when scrolling).
 */
const CORRELATION = 0.78;

/** One realization of the random process: a scrolling Gaussian-noise trace. */
interface Lane {
  buf: number[];
  /** Per-lane band-limited source (independent correlation chain). */
  sample: () => number;
  /** Palette key (not a frozen color) so the trace follows the active theme. */
  colorKey: 'green' | 'blue' | 'orange';
  alpha: number;
  width: number;
  glow: number;
  /** Vertical amplitude per unit std-dev, as a fraction of canvas height. */
  scale: number;
}

// Exactly one NoiseViz renders on the landing page, so module-scope buffers are
// safe (see docs/superpowers/specs/2026-06-14-random-process-noise-viz-design.md).
let lanes: Lane[] | null = null;
let lastFrame = -1;

/** A lane backed by its own band-limited (correlated) Gaussian source. */
function makeLane(rest: Omit<Lane, 'buf' | 'sample'>): Lane {
  const sample = makeBandLimitedSampler(CORRELATION, gaussian);
  return { buf: makeNoiseTrace(VISIBLE + 2, sample), sample, ...rest };
}

function ensureLanes(): Lane[] {
  if (!lanes) {
    const defs: Omit<Lane, 'buf' | 'sample'>[] = [
      { colorKey: 'green', alpha: 0.95, width: 1.8, glow: 6, scale: 0.1 },
      { colorKey: 'blue', alpha: 0.5, width: 1.2, glow: 0, scale: 0.13 },
      { colorKey: 'orange', alpha: 0.38, width: 1.2, glow: 0, scale: 0.16 },
    ];
    lanes = defs.map(makeLane);
  }
  return lanes;
}

/**
 * Stroke a smooth curve through evenly-spaced points via Catmull-Rom splines
 * (converted to cubic Béziers). Endpoints are duplicated so the curve starts
 * and ends exactly on the first/last point.
 */
function strokeCatmullRom(ctx: CanvasRenderingContext2D, xs: number[], ys: number[]): void {
  const n = xs.length;
  if (n < 2) return;
  ctx.beginPath();
  ctx.moveTo(xs[0], ys[0]);
  for (let i = 0; i < n - 1; i += 1) {
    const x0 = xs[i === 0 ? 0 : i - 1];
    const y0 = ys[i === 0 ? 0 : i - 1];
    const x1 = xs[i];
    const y1 = ys[i];
    const x2 = xs[i + 1];
    const y2 = ys[i + 1];
    const x3 = xs[i + 2 < n ? i + 2 : n - 1];
    const y3 = ys[i + 2 < n ? i + 2 : n - 1];
    ctx.bezierCurveTo(
      x1 + (x2 - x0) / 6,
      y1 + (y2 - y0) / 6,
      x2 - (x3 - x1) / 6,
      y2 - (y3 - y1) / 6,
      x2,
      y2,
    );
  }
  ctx.stroke();
}

/** Random Processes: an ensemble of scrolling Gaussian sample functions. */
const draw: DrawFn = (ctx, t, w, h) => {
  const ls = ensureLanes();

  // Advance one sample per FRAMES_PER_STEP, but only on genuinely new frames —
  // resize/initial repaints reuse the same `t` and must not double-advance.
  if (t !== lastFrame) {
    if (t % FRAMES_PER_STEP === 0) {
      for (let i = 0; i < ls.length; i += 1) advanceNoiseTrace(ls[i].buf, ls[i].sample);
    }
    lastFrame = t;
  }
  // Fractional slide between sample pushes → smooth sub-pixel scroll.
  const phase = (t % FRAMES_PER_STEP) / FRAMES_PER_STEP;

  ctx.clearRect(0, 0, w, h);
  const mid = h * 0.5;
  const step = w / VISIBLE;

  // Ensemble-mean baseline: E[X(t)] ≈ 0.
  ctx.globalAlpha = 1;
  ctx.strokeStyle = VIZ.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(w, mid);
  ctx.stroke();

  // Draw back-to-front so the bright green realization lands on top.
  for (let li = ls.length - 1; li >= 0; li -= 1) {
    const lane = ls[li];
    const amp = lane.scale * h;
    const color = VIZ[lane.colorKey]; // resolve live → follows the theme
    ctx.globalAlpha = lane.alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lane.width;
    ctx.shadowColor = color;
    ctx.shadowBlur = lane.glow;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < lane.buf.length; i += 1) {
      // Shift left by `phase` of a step so the trace slides smoothly; index 0
      // sits just off the left edge, the newest sample just past the right.
      xs.push((i - 1 - phase) * step);
      let y = mid - lane.buf[i] * amp;
      if (y < 2) y = 2;
      else if (y > h - 2) y = h - 2;
      ys.push(y);
    }
    strokeCatmullRom(ctx, xs, ys);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
};

export function NoiseViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
