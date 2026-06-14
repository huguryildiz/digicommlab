import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ, alpha, gaussian } from './palette';
import { scopeMetrics, nowMs, bitScroll, manchesterLevel, BITS_ON_SCREEN } from './scopeModel';

/** Hero oscilloscope: graticule + Manchester line code + noisy trace + scan line. */
const draw: DrawFn = (ctx, t, w, h) => {
  // phosphor persistence (fading trace over panel's dark --scope-bg background)
  ctx.fillStyle = VIZ.trail;
  ctx.fillRect(0, 0, w, h);

  // graticule
  ctx.strokeStyle = VIZ.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const gx = w / 12;
  const gy = h / 6;
  for (let i = 1; i < 12; i += 1) {
    ctx.moveTo(i * gx, 0);
    ctx.lineTo(i * gx, h);
  }
  for (let j = 1; j < 6; j += 1) {
    ctx.moveTo(0, j * gy);
    ctx.lineTo(w, j * gy);
  }
  ctx.stroke();
  ctx.strokeStyle = VIZ.gridStrong;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  const mid = h / 2;
  const amp = h * 0.3;
  const now = nowMs();
  const { noisePx } = scopeMetrics(now);
  const p0 = bitScroll(now);
  const cellPx = w / BITS_ON_SCREEN;

  // bit-clock ticks at each Manchester cell boundary (scroll with the code)
  ctx.strokeStyle = alpha(VIZ.blue, 0.55);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let b = Math.ceil(p0); (b - p0) * cellPx <= w; b += 1) {
    const x = (b - p0) * cellPx;
    ctx.moveTo(x, mid - 9);
    ctx.lineTo(x, mid + 9);
  }
  ctx.stroke();

  // noisy Manchester square wave — AWGN std tied to the live SNR readout, so the
  // visible noise breathes in sync with the HUD's BER/SNR numbers.
  ctx.shadowColor = VIZ.green;
  ctx.shadowBlur = 9;
  ctx.strokeStyle = VIZ.green;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const y = mid - manchesterLevel(p0 + x / cellPx) * amp + gaussian() * noisePx;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // scan line
  const sx = (t * 3) % w;
  const grd = ctx.createLinearGradient(sx - 40, 0, sx, 0);
  grd.addColorStop(0, alpha(VIZ.green, 0));
  grd.addColorStop(1, alpha(VIZ.green, 0.32));
  ctx.fillStyle = grd;
  ctx.fillRect(sx - 40, 0, 40, h);
  ctx.strokeStyle = alpha(VIZ.green, 0.6);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx, 0);
  ctx.lineTo(sx, h);
  ctx.stroke();
};

export function Oscilloscope() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
