import { Canvas } from '@/lib/plot/Canvas';
import { useZoom } from '@/lib/plot/useZoom';
import {
  linScale,
  logScale,
  drawAxes,
  drawLine,
  drawArrow,
  drawVLine,
  drawScatter,
  drawText,
  type Axes,
} from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import type { NoncohView, NoncohBank } from './noncoh-model';

const PAD = { l: 42, r: 14, t: 14, b: 34 };

/** Sampled unit-circle outline (maps through the axes). */
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

export interface DetectorBankPanelProps {
  view: NoncohView;
  bank: NoncohBank;
}

/**
 * Square-law detector bank: each tone's decision variable Y_m = y_c² + y_s². The
 * largest envelope wins (Eq. 9.5.25). The winning bar is accented; if it differs
 * from the transmitted tone the error is marked.
 */
export function DetectorBankPanel({ view, bank }: DetectorBankPanelProps) {
  const M = view.M;
  const maxEnv = Math.max(1e-6, ...bank.branches.map((b) => b.env));
  return (
    <Canvas
      height={260}
      ariaLabel="Square-law detector bank: per-tone envelope decision variables"
      deps={[view, bank]}
      draw={(ctx, w, h) => {
        const yDom: [number, number] = [0, maxEnv * 1.15];
        const ax: Axes = {
          x: linScale([-0.5, M - 0.5], [PAD.l, w - PAD.r]),
          y: linScale(yDom, [h - PAD.b, PAD.t]),
        };
        drawAxes(ctx, ax, [-0.5, M - 0.5], {
          xLabel: '$m$ (tone)',
          yLabel: '$Y_m=y_c^2+y_s^2$',
          domainY: yDom,
          xTicks: Array.from({ length: M }, (_, i) => i),
        });
        const bw = Math.max(6, ((w - PAD.l - PAD.r) / M) * 0.55);
        const y0 = ax.y(0);
        for (let m = 0; m < M; m++) {
          const px = ax.x(m);
          const py = ax.y(bank.branches[m].env);
          const win = m === bank.rx;
          ctx.fillStyle = win ? alpha(CHART.green, 0.85) : alpha(CHART.blue, 0.4);
          ctx.fillRect(px - bw / 2, py, bw, y0 - py);
          // Mark the transmitted tone (outline) so an error is visible.
          if (m === bank.tx) {
            ctx.strokeStyle = bank.rx === bank.tx ? alpha(CHART.green, 0.9) : CHART.pink;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(px - bw / 2, py, bw, y0 - py);
            ctx.setLineDash([]);
            drawText(ctx, ax, m, bank.branches[m].env, 'tx', CHART.text, 0, -8);
          }
        }
      }}
    />
  );
}

export interface PhasorPanelProps {
  view: NoncohView;
  bank: NoncohBank;
}

/**
 * Quadrature phasors (y_c, y_s) of each tone. The transmitted tone arrives with a
 * random unknown phase φ (a long phasor at an arbitrary angle); the other tones
 * are noise-only (short). The winning tone is accented.
 */
export function PhasorPanel({ view, bank }: PhasorPanelProps) {
  const circle = unitCircle();
  const span = 1.7;
  return (
    <Canvas
      height={260}
      ariaLabel="Quadrature phasors of the noncoherent FSK tones"
      deps={[view, bank]}
      draw={(ctx, w, h) => {
        const ax: Axes = {
          x: linScale([-span, span], [PAD.l, w - PAD.r]),
          y: linScale([-span, span], [h - PAD.b, PAD.t]),
        };
        drawAxes(ctx, ax, [-span, span], {
          xLabel: '$y_c$',
          yLabel: '$y_s$',
          domainY: [-span, span],
        });
        drawLine(ctx, ax, circle.xs, circle.ys, alpha(CHART.dim, 0.35), 1);
        for (let m = 0; m < view.M; m++) {
          const b = bank.branches[m];
          const win = m === bank.rx;
          const col = win ? CHART.green : alpha(CHART.blue, 0.55);
          drawArrow(ctx, ax, 0, 0, b.yc, b.ys, col, win ? 2 : 1.3);
          drawText(ctx, ax, b.yc, b.ys, String(m), CHART.text, 5, -5);
        }
      }}
    />
  );
}

const PE_FLOOR = 1e-6;

export interface NoncohBerPanelProps {
  view: NoncohView;
  ebN0Db: number;
  livePoint?: { ebN0Db: number; ser: number };
}

/**
 * Error probability vs Eb/N0: noncoherent FSK (square-law) over coherent FSK,
 * showing the noncoherent penalty. Scroll-zoom + drag-pan on the SNR axis.
 */
export function NoncohBerPanel({ view, ebN0Db, livePoint }: NoncohBerPanelProps) {
  const [lo, hi, handleWheel, , handlePan] = useZoom(0, 14, {
    minSpan: 2,
    maxSpan: 14,
    clampMin: 0,
  });
  const yDom: [number, number] = [PE_FLOOR, 1];
  return (
    <Canvas
      height={280}
      ariaLabel="Noncoherent and coherent FSK error probability versus Eb/N0"
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
        drawLine(
          ctx,
          ax,
          view.coherentCurve.map((p) => p.ebN0Db),
          view.coherentCurve.map((p) => Math.max(p.pe, PE_FLOOR)),
          CHART.orange,
          2,
        );
        drawLine(
          ctx,
          ax,
          view.noncohCurve.map((p) => p.ebN0Db),
          view.noncohCurve.map((p) => Math.max(p.pe, PE_FLOOR)),
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
