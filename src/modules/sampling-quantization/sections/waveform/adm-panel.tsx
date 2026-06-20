import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawStep, type Axes } from '@/lib/plot/draw';

// Room for tick labels + LaTeX axis labels (y-label at left−34, x-label at bottom+30).
const PAD = { l: 48, r: 18, t: 16, b: 40 };

function axesFor(w: number, h: number, domX: [number, number], domY: [number, number]): Axes {
  return { x: linScale(domX, [PAD.l, w - PAD.r]), y: linScale(domY, [h - PAD.b, PAD.t]) };
}

export interface StepTrackingPanelProps {
  steps: number[];
  times: number[];
  /** Visible time window [lo, hi] (s) — supplied by the section for shared scroll/pan. */
  domain: [number, number];
  onWheel?: (xFrac: number, deltaY: number) => void;
  onPan?: (deltaFrac: number) => void;
}

/** Adaptive-DM step size Δ_n versus time (grows on slope overload, shrinks on hunting). */
export function StepTrackingPanel({ steps, times, domain, onWheel, onPan }: StepTrackingPanelProps) {
  const [t0, t1] = domain;
  const yMax = (steps.length ? Math.max(...steps) : 1) * 1.1 || 1;
  return (
    <Canvas
      height={160}
      ariaLabel="Adaptive DM step size over time"
      deps={[steps, times, t0, t1]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1], [0, yMax]);
        drawAxes(ctx, ax, [t0, t1], { xLabel: '$t\\,(\\mathrm{s})$', yLabel: '$\\Delta$' });
        drawStep(ctx, ax, times, steps, '#ffb454', 2);
      }}
    />
  );
}
