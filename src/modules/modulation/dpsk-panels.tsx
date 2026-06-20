import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import {
  linScale,
  logScale,
  drawAxes,
  drawLine,
  drawScatter,
  drawVLine,
  drawText,
  type Axes,
} from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import type { DpskView, DpskScatter } from './dpsk-model';

const PAD = { l: 40, r: 14, t: 14, b: 34 };

function squareAxes(w: number, h: number, span: number): Axes {
  return {
    x: linScale([-span, span], [PAD.l, w - PAD.r]),
    y: linScale([-span, span], [h - PAD.b, PAD.t]),
  };
}

/** Sampled unit-circle outline (maps through the axes so points sit on it). */
function unitCircle(): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let a = 0; a <= 96; a++) {
    const t = (2 * Math.PI * a) / 96;
    xs.push(Math.cos(t));
    ys.push(Math.sin(t));
  }
  return { xs, ys };
}

export interface PhaseTrailPanelProps {
  view: DpskView;
  /** Recent transmitted phase indices (oldest → newest). */
  trail: number[];
}

/**
 * Phase trail: the carrier phase walking around the circle as information symbols
 * arrive (θ_k = θ_{k-1} + Δθ_k). The last increment is drawn as a chord with the
 * newest phase highlighted.
 */
export function PhaseTrailPanel({ view, trail }: PhaseTrailPanelProps) {
  const circle = unitCircle();
  return (
    <Canvas
      height={300}
      ariaLabel="DPSK phase trail on the unit circle (differential encoding)"
      deps={[view, trail]}
      draw={(ctx, w, h) => {
        const ax = squareAxes(w, h, 1.35);
        drawAxes(ctx, ax, [-1.35, 1.35], {
          xLabel: '$I$',
          yLabel: '$Q$',
          domainY: [-1.35, 1.35],
        });
        drawLine(ctx, ax, circle.xs, circle.ys, alpha(CHART.dim, 0.45), 1);

        // The M candidate phases, Gray-labelled.
        for (let k = 0; k < view.phasePoints.length; k++) {
          const p = view.phasePoints[k];
          drawScatter(ctx, ax, [p.x], [p.y], alpha(CHART.blue, 0.55), 4);
          drawText(ctx, ax, p.x * 1.16, p.y * 1.16, p.label, CHART.text, 0, 0);
        }

        // Walk the trail as connected chords between consecutive phases.
        if (trail.length > 1) {
          const xs = trail.map((idx) => Math.cos(view.phaseStep * idx));
          const ys = trail.map((idx) => Math.sin(view.phaseStep * idx));
          drawLine(ctx, ax, xs, ys, alpha(CHART.orange, 0.6), 1.5);
        }
        if (trail.length > 0) {
          const last = trail[trail.length - 1];
          const lx = Math.cos(view.phaseStep * last);
          const ly = Math.sin(view.phaseStep * last);
          drawScatter(ctx, ax, [lx], [ly], CHART.pink, 6);
        }
      }}
    />
  );
}

export interface DiffConstellationPanelProps {
  view: DpskView;
  scatter: DpskScatter;
}

/**
 * Differential decision plane: the products D_k = Y_k·conj(Y_{k-1}) cluster around
 * the M increment angles. The unknown carrier phase cancels in the product. Points
 * decoded in error are drawn in the marker colour.
 */
export function DiffConstellationPanel({ view, scatter }: DiffConstellationPanelProps) {
  const circle = unitCircle();
  return (
    <Canvas
      height={300}
      ariaLabel="DPSK differential decision plane D_k = Y_k times conjugate Y_{k-1}"
      deps={[view, scatter]}
      draw={(ctx, w, h) => {
        const span = 1.6;
        const ax = squareAxes(w, h, span);
        drawAxes(ctx, ax, [-span, span], {
          xLabel: '$\\mathrm{Re}\\,D_k$',
          yLabel: '$\\mathrm{Im}\\,D_k$',
          domainY: [-span, span],
        });
        drawLine(ctx, ax, circle.xs, circle.ys, alpha(CHART.dim, 0.35), 1);

        // Decision-sector boundaries (radial lines at half-angles).
        for (let k = 0; k < view.M; k++) {
          const a = view.phaseStep * (k + 0.5);
          drawLine(
            ctx,
            ax,
            [0, span * Math.cos(a)],
            [0, span * Math.sin(a)],
            alpha(CHART.dim, 0.25),
            1,
            true,
          );
        }
        // Ideal increment directions.
        for (let k = 0; k < view.M; k++) {
          const a = view.phaseStep * k;
          drawScatter(ctx, ax, [Math.cos(a)], [Math.sin(a)], alpha(CHART.blue, 0.5), 4.5);
          drawText(ctx, ax, 1.22 * Math.cos(a), 1.22 * Math.sin(a), String(k), CHART.text, 0, 0);
        }
        // The differential cloud.
        for (const p of scatter.cloud) {
          drawScatter(
            ctx,
            ax,
            [p.x],
            [p.y],
            p.err ? alpha(CHART.pink, 0.8) : alpha(CHART.blue, 0.32),
            1.7,
          );
        }
      }}
    />
  );
}

const PE_FLOOR = 1e-6;

export interface DpskBerPanelProps {
  view: DpskView;
  ebN0Db: number;
  livePoint?: { ebN0Db: number; ser: number };
}

/**
 * Error probability vs Eb/N0: DPSK (Eq. 8.6.37/8.6.42) over coherent PSK, showing
 * the penalty. Scroll-zoom + drag-pan on the SNR axis (owns its own useZoom so the
 * section's resetKey remount restores the view).
 */
export function DpskBerPanel({ view, ebN0Db, livePoint }: DpskBerPanelProps) {
  const [lo, hi, handleWheel, , handlePan] = useZoom(0, 14, {
    minSpan: 2,
    maxSpan: 14,
    clampMin: 0,
  });
  const yDom: [number, number] = [PE_FLOOR, 1];
  return (
    <Canvas
      height={280}
      ariaLabel="DPSK and coherent PSK error probability versus Eb/N0"
      deps={[view, ebN0Db, livePoint, lo, hi]}
      onWheel={handleWheel}
      onPan={handlePan}
      draw={(ctx, w, h) => {
        const ax: Axes = {
          x: linScale([lo, hi], [PAD.l, w - PAD.r]),
          y: logScale(yDom, [h - PAD.b, PAD.t]),
        };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$E_b/N_0\\,(\\mathrm{dB})$',
          yLabel: '$P_e$',
          domainY: yDom,
        });
        const psy = view.pskCurve.map((p) => Math.max(p.pe, PE_FLOOR));
        const dpy = view.dpskCurve.map((p) => Math.max(p.pe, PE_FLOOR));
        drawLine(
          ctx,
          ax,
          view.pskCurve.map((p) => p.ebN0Db),
          psy,
          CHART.orange,
          2,
        );
        drawLine(
          ctx,
          ax,
          view.dpskCurve.map((p) => p.ebN0Db),
          dpy,
          CHART.blue,
          2,
        );
        drawVLine(ctx, ax, ebN0Db, PE_FLOOR, 1, alpha(CHART.pink, 0.8), true, 1);
        if (livePoint) {
          drawScatter(
            ctx,
            ax,
            [livePoint.ebN0Db],
            [Math.max(livePoint.ser, PE_FLOOR)],
            CHART.green,
            4.5,
          );
        }
      }}
    />
  );
}
