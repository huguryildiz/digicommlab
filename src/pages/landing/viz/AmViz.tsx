import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ } from './palette';

const TAU = Math.PI * 2;
/** Message cycles shown across the panel (one slow envelope bulge). */
const MSG_CYCLES = 1.18;
/** AM carrier cycles across the full-width panel. */
const AM_CARRIER_CYCLES = 14;

/** Shared message m(t), normalized to [−1, 1]. */
function message(u: number, frame: number): number {
  return Math.sin(u * TAU * MSG_CYCLES - frame * 0.018);
}

/**
 * AM landing viz: the carrier amplitude follows a bulging envelope
 * (Proakis & Salehi, Ch 3 — Amplitude Modulation).
 */
const draw: DrawFn = (ctx, frame, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const mid = h * 0.5;
  const scale = h * 0.31;
  const PAD = 7;
  const inner = w - 2 * PAD;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Zero-mean baseline.
  ctx.strokeStyle = VIZ.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(w, mid);
  ctx.stroke();

  // Envelope rails — bulge with the message; dashed + faded as a guide line.
  ctx.strokeStyle = VIZ.orange;
  ctx.lineWidth = 1.75;
  ctx.globalAlpha = 0.45;
  ctx.setLineDash([5, 5]);
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    for (let lx = 0; lx <= inner; lx += 2) {
      const u = lx / inner;
      const env = 0.58 + 0.36 * message(u, frame);
      const y = mid + sign * env * scale;
      const x = PAD + lx;
      if (lx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Modulated carrier — amplitude tracks the envelope.
  ctx.strokeStyle = VIZ.blue;
  ctx.lineWidth = 1.65;
  ctx.shadowColor = 'rgba(123, 140, 255, 0.5)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let lx = 0; lx <= inner; lx += 1) {
    const u = lx / inner;
    const env = 0.58 + 0.36 * message(u, frame);
    const value = env * Math.sin(u * TAU * AM_CARRIER_CYCLES - frame * 0.38);
    const x = PAD + lx;
    const y = mid - value * scale;
    if (lx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Moving envelope-sample markers.
  ctx.fillStyle = VIZ.pink;
  const markerStep = inner / 8;
  const markerOffset = (frame * 1.7) % markerStep;
  for (let lx = markerOffset; lx <= inner; lx += markerStep) {
    const u = lx / inner;
    const env = 0.58 + 0.36 * message(u, frame);
    ctx.beginPath();
    ctx.arc(PAD + lx, mid - env * scale, 1.6, 0, TAU);
    ctx.fill();
  }
};

export function AmViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
