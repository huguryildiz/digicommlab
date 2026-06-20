// §8.3 Baseband line coding — panel drawing a single line-code waveform
// (Proakis & Salehi, Communication Systems Engineering, Ch. 8).
// Each panel is a controlled canvas driven by a shared domain [lo, hi] (bit periods)
// so multiple stacked panels stay axis-aligned while the user scrolls/zooms.

import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawVLine, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { lineCodeWaveform, type LineCode } from '@/lib/dsp/linecode';

// Plot margins — same convention as panels.tsx
const PAD = { l: 48, r: 18, t: 20, b: 40 };

// Fixed y-range for all line-code panels: levels ∈ {−1, 0, +1}, plus headroom
const Y_MIN = -1.3;
const Y_MAX = 1.3;

function axesFor(w: number, h: number, domX: [number, number]): Axes {
  return {
    x: linScale(domX, [PAD.l, w - PAD.r]),
    y: linScale([Y_MIN, Y_MAX], [h - PAD.b, PAD.t]),
  };
}

export interface LineCodePanelProps {
  bits: number[];
  code: LineCode;
  label: string;
  /** Visible bit-period window [lo, hi] — shared across all stacked panels. */
  domain: [number, number];
  onWheel?: (xFrac: number, deltaY: number) => void;
  onPan?: (deltaFrac: number) => void;
}

/**
 * Controlled time-domain Canvas that draws ONE line code's waveform.
 * x-axis: bit periods t/Tᵦ; y-axis: amplitude x(t) ∈ {−1, 0, +1}.
 */
export function LineCodePanel({ bits, code, label, domain, onWheel, onPan }: LineCodePanelProps) {
  const [t0, t1] = domain;

  return (
    <Canvas
      height={110}
      ariaLabel={`Line-code waveform: ${label}`}
      deps={[bits, code, t0, t1]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [t0, t1]);
        const bounds = {
          left: PAD.l,
          right: w - PAD.r,
          top: PAD.t,
          bottom: h - PAD.b,
        };

        // Compute waveform
        const wave = lineCodeWaveform(bits, code);

        // Faint vertical bit-boundary grid lines at each integer bit index
        const iLo = Math.floor(t0);
        const iHi = Math.ceil(t1);
        for (let i = iLo; i <= iHi; i++) {
          if (i >= 0 && i <= bits.length) {
            drawVLine(ctx, ax, i, Y_MIN, Y_MAX, alpha(CHART.dim, 0.35), false, 1);
          }
        }

        // Axes (grid + ticks on top of boundary lines)
        drawAxes(ctx, ax, [t0, t1], {
          xLabel: '$t/T_b$',
          yLabel: '$x(t)$',
          domainY: [Y_MIN, Y_MAX],
          yTicks: [-1, 0, 1],
        });

        // Waveform trace — piecewise constant, draw with drawLine for crisp steps
        drawLine(ctx, ax, wave.t, wave.x, CHART.green, 2);

        // Bit value labels along the top of the plot, one per visible cell
        ctx.save();
        ctx.font = `10px var(--mono)`;
        ctx.fillStyle = CHART.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const labelY = bounds.top + 2;
        for (let i = 0; i < bits.length; i++) {
          const cellCenter = i + 0.5;
          if (cellCenter >= t0 && cellCenter <= t1) {
            const px = ax.x(cellCenter);
            if (px >= bounds.left && px <= bounds.right) {
              ctx.fillText(String(bits[i]), px, labelY);
            }
          }
        }
        ctx.restore();
      }}
    />
  );
}
