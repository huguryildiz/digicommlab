import { Canvas } from '@/lib/plot/Canvas';
import { CHART, alpha } from '@/lib/plot/colors';
import type { LfsrSnapshot } from '@/lib/dsp/cyclic';

interface LfsrDiagramProps {
  g: number[]; // generator (LSB-first); feedback taps where g[j] = 1, j = 0..deg-1
  trace: LfsrSnapshot[];
  stepIndex: number; // 0..trace.length-1
}

/**
 * LFSR division circuit (Fig 9.22): deg-g register cells left→right (reg[0]..reg[deg-1]),
 * feedback from the top cell looping back to the XOR taps where g has a coefficient. Shows the
 * register contents, the current input bit, and the active feedback at the current step.
 */
export function LfsrDiagram({ g, trace, stepIndex }: LfsrDiagramProps) {
  const dg = g.length - 1; // deg g (g is LSB-first, g[dg] = 1)
  return (
    <Canvas
      height={120}
      ariaLabel="LFSR division encoder"
      deps={[g.join(''), stepIndex, trace.length]}
      draw={(ctx, w, h) => {
        const snap = trace[Math.min(stepIndex, trace.length - 1)];
        const cellW = Math.min(40, (w - 80) / dg);
        const x0 = 40;
        const y = h / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '13px ui-monospace, monospace';

        // feedback rail along the top
        const fb = snap.feedback;
        ctx.strokeStyle = fb ? CHART.orange : alpha(CHART.dim, 0.5);
        ctx.lineWidth = fb ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x0 + dg * cellW + 14, y);
        ctx.lineTo(x0 + dg * cellW + 14, y - 34);
        ctx.lineTo(x0 - 14, y - 34);
        ctx.lineTo(x0 - 14, y);
        ctx.stroke();

        // register cells
        for (let j = 0; j < dg; j++) {
          const cx = x0 + j * cellW + cellW / 2;
          ctx.strokeStyle = alpha(CHART.dim, 0.7);
          ctx.lineWidth = 1;
          ctx.strokeRect(x0 + j * cellW, y - 14, cellW - 4, 28);
          ctx.fillStyle = snap.reg[j] ? CHART.green : CHART.text;
          ctx.fillText(String(snap.reg[j]), cx, y);
          ctx.fillStyle = CHART.dim;
          ctx.font = '9px ui-monospace, monospace';
          ctx.fillText(`p${j === 0 ? '⁰' : j === 1 ? '¹' : ('²³⁴⁵⁶⁷⁸'[j - 2] ?? '?')}`, cx, y + 22);
          ctx.font = '13px ui-monospace, monospace';
          // XOR tap marker where g[j] = 1 (feedback enters this cell)
          if (g[j]) {
            ctx.beginPath();
            ctx.arc(x0 + j * cellW, y - 34, 4, 0, Math.PI * 2);
            ctx.strokeStyle = fb ? CHART.orange : alpha(CHART.dim, 0.6);
            ctx.lineWidth = fb ? 2 : 1;
            ctx.stroke();
          }
        }

        // input bit
        ctx.fillStyle = CHART.dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('in', x0 - 26, y - 34);
        if (snap.inBit !== null) {
          ctx.fillStyle = CHART.blue;
          ctx.font = '13px ui-monospace, monospace';
          ctx.fillText(String(snap.inBit), x0 - 26, y - 18);
        }
      }}
    />
  );
}
