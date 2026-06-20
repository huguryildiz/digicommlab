import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawStems, drawStep, drawVLine, type Axes } from '@/lib/plot/draw';
import type { DeltaModView } from './deltamod-model';

const COL = {
  analog: '#4aa3ff',
  staircase: '#46c93a',
  overload: '#ff5c5c',
  sample: '#ffb454',
  error: '#ff7c7c',
  bound: 'rgba(154,167,180,0.3)',
  cursor: 'rgba(255,180,84,0.9)',
};

// Room for tick labels + LaTeX axis labels (y-label at left−34, x-label at bottom+30).
const PAD = { l: 48, r: 18, t: 16, b: 40 };

function axesFor(w: number, h: number, domX: [number, number], domY: [number, number]): Axes {
  return { x: linScale(domX, [PAD.l, w - PAD.r]), y: linScale(domY, [h - PAD.b, PAD.t]) };
}

export interface SignalPanelProps {
  view: DeltaModView;
  yMax: number;
  cursorT?: number;
  /** Visible time window [lo, hi] (s) — supplied by the section for shared scroll/pan. */
  domain: [number, number];
  onWheel?: (xFrac: number, deltaY: number) => void;
  onPan?: (deltaFrac: number) => void;
}

export function SignalStaircasePanel({ view, yMax, cursorT, domain, onWheel, onPan }: SignalPanelProps) {
  const [t0, t1] = domain;
  return (
    <Canvas
      height={220}
      ariaLabel="Analog signal and DM staircase with slope-overload segments"
      deps={[view, yMax, cursorT, t0, t1]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1], [-yMax, yMax]);
        drawAxes(ctx, ax, [t0, t1], { xLabel: '$t\\,(\\mathrm{s})$', yLabel: '$x(t)$' });
        drawLine(ctx, ax, view.analog.t, view.analog.x, COL.analog, 2);
        drawStep(ctx, ax, view.sampleTimes, view.staircase, COL.staircase, 2);
        for (let i = 1; i < view.sampleTimes.length; i++) {
          if (view.overload[i]) {
            drawLine(ctx, ax, [view.sampleTimes[i - 1], view.sampleTimes[i]], [view.staircase[i - 1], view.staircase[i]], COL.overload, 3);
          }
        }
        drawStems(ctx, ax, view.sampleTimes, view.sampleValues, COL.sample, 2);
        if (cursorT != null) drawVLine(ctx, ax, cursorT, -yMax, yMax, COL.cursor, false, 1.5);
      }}
    />
  );
}

export interface ErrorPanelProps {
  view: DeltaModView;
  step: number;
  /** Visible time window [lo, hi] (s) — supplied by the section for shared scroll/pan. */
  domain: [number, number];
  onWheel?: (xFrac: number, deltaY: number) => void;
  onPan?: (deltaFrac: number) => void;
}

export function ErrorPanel({ view, step, domain, onWheel, onPan }: ErrorPanelProps) {
  const yMax = step * 1.6 || 1;
  const [t0, t1] = domain;
  return (
    <Canvas
      height={140}
      ariaLabel="Delta-modulation error per sample"
      deps={[view, step, t0, t1]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1], [-yMax, yMax]);
        drawLine(ctx, ax, [t0, t1], [step, step], COL.bound, 1);
        drawLine(ctx, ax, [t0, t1], [-step, -step], COL.bound, 1);
        drawAxes(ctx, ax, [t0, t1], { xLabel: '$t\\,(\\mathrm{s})$', yLabel: '$e(t)$' });
        drawStems(ctx, ax, view.sampleTimes, view.error, COL.error, 2.5);
      }}
    />
  );
}
