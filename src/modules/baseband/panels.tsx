// src/modules/baseband/panels.tsx
import { Canvas } from '@/lib/plot/Canvas';
import { drawAxes, drawLine, drawVLine, drawText, linScale } from '@/lib/plot/draw';
import type { PulseView } from './model';

const COL_P = 'var(--color-x)';
const COL_H = 'var(--color-h)';
const COL_Y = 'var(--color-y)';

export function PulseTimePanel({ view }: { view: PulseView }) {
  const yMax = 1.2;
  return (
    <Canvas
      height={220}
      ariaLabel="Pulse p(t) with zero crossings at integer symbol times"
      deps={[view]}
      draw={(ctx, w, h) => {
        const tMax = view.t[view.t.length - 1];
        const ax = { x: linScale([-tMax, tMax], [34, w - 10]), y: linScale([-0.4, yMax], [h - 18, 10]) };
        drawAxes(ctx, ax, [-tMax, tMax]);
        for (let n = -Math.floor(tMax); n <= Math.floor(tMax); n++) {
          drawVLine(ctx, ax, n, -0.4, yMax, 'rgba(154,167,180,0.25)', true, 1);
        }
        drawLine(ctx, ax, view.t, view.p, COL_P, 2);
      }}
    />
  );
}

export function SpectrumPanel({ view }: { view: PulseView }) {
  return (
    <Canvas
      height={200}
      ariaLabel="Raised cosine spectrum with bandwidth and Nyquist markers"
      deps={[view]}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([-1, 1], [34, w - 10]), y: linScale([0, 1.15], [h - 18, 10]) };
        drawAxes(ctx, ax, [-1, 1]);
        drawLine(ctx, ax, view.freqs, view.spectrum, COL_Y, 2);
        drawVLine(ctx, ax, view.bandwidth, 0, 1.15, COL_H, false, 1.5);
        drawVLine(ctx, ax, -view.bandwidth, 0, 1.15, COL_H, false, 1.5);
        drawVLine(ctx, ax, view.nyquist, 0, 1.15, 'rgba(154,167,180,0.6)', true, 1);
        drawVLine(ctx, ax, -view.nyquist, 0, 1.15, 'rgba(154,167,180,0.6)', true, 1);
        drawText(ctx, ax, view.bandwidth, 1.05, 'W', COL_H, 4, -4);
        drawText(ctx, ax, view.nyquist, 0.5, '1/2T', '#9aa7b4', 4, -4);
      }}
    />
  );
}
