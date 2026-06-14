import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ, alpha } from './palette';

const TAU = Math.PI * 2;
const N = 6;

// Two attractor distributions for the morph (both sum to 1):
// UNIFORM = maximum entropy, PEAK = sharply concentrated (near-certain, low H).
const UNIFORM: number[] = Array.from({ length: N }, () => 1 / N);
const PEAK: number[] = [0.86, 0.06, 0.03, 0.02, 0.02, 0.01];

const H_MAX = Math.log2(N); // entropy of the uniform distribution = log2 N
const CYCLE = 900; // frames per uniform→peaked→uniform breath (~15 s @ 60 fps)
const NP = 7; // mass-flow particles
const REF = 0.3; // p value that maps to full bar height (the peak clips to ceiling)

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

// Hue rides the entropy: green (high entropy / uncertainty) ↔ blue (low entropy).
// HI/LO are derived from the theme-aware palette so the gradient deepens in light mode.
const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const mix = (k: number): string => {
  const HI = hexToRgb(VIZ.green); // high entropy
  const LO = hexToRgb(VIZ.blue); // low entropy
  return `rgb(${Math.round(lerp(LO[0], HI[0], k))}, ${Math.round(lerp(LO[1], HI[1], k))}, ${Math.round(
    lerp(LO[2], HI[2], k),
  )})`;
};

/** Top-rounded bar path (flat base sitting on baseY). */
function barPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bw: number,
  r: number,
  baseY: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.lineTo(x + bw - r, y);
  ctx.quadraticCurveTo(x + bw, y, x + bw, y + r);
  ctx.lineTo(x + bw, baseY);
  ctx.closePath();
}

/** All-corner rounded rect (for the slim gauge). */
function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Information Theory — "entropy breathing": probability mass flows between a
 * uniform distribution (maximum entropy) and a peaked one (near-certain), with
 * a live H = -Σ pᵢ log₂ pᵢ readout and a normalized entropy gauge. Colour and
 * glow track H (vivid green = high uncertainty, calm blue = certainty), and
 * faint motes carry mass between bars while the distribution sharpens.
 * Ref: Proakis & Salehi, Communication Systems Engineering, Ch. 12 (entropy).
 */
const draw: DrawFn = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h);

  // Morph m: 0 (uniform) → 1 (peaked) → 0, seamless cosine breath.
  const s = (t % CYCLE) / CYCLE;
  const m = 0.5 - 0.5 * Math.cos(TAU * s);
  const flow = Math.sin(TAU * s); // signed transition rate
  const activity = Math.abs(flow); // peaks mid-morph, 0 at the stable ends
  const concentrating = flow > 0; // mass collapsing toward the dominant bar

  // Current distribution (convex combo keeps Σp = 1 exactly) and its entropy.
  const p = UNIFORM.map((u, i) => lerp(u, PEAK[i], m));
  let H = 0;
  for (let i = 0; i < N; i += 1) if (p[i] > 1e-6) H -= p[i] * Math.log2(p[i]);
  const e = H / H_MAX; // 1 at max entropy, lower as it sharpens

  // Layout.
  const padX = 12;
  const reserveTop = h > 80 ? 30 : h > 56 ? 22 : 12;
  const baseY = h - 5;
  const areaTop = reserveTop;
  const areaH = Math.max(1, baseY - areaTop);

  // ── Entropy gauge (slim top bar, fill ∝ H / H_max) ──────────────────────
  const gx = padX;
  const gw = w - padX * 2;
  const gy = reserveTop >= 22 ? 6 : 4;
  ctx.fillStyle = alpha(VIZ.blue, 0.14);
  pill(ctx, gx, gy, gw, 3);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = mix(e);
  ctx.shadowBlur = 6 + 10 * e;
  ctx.fillStyle = mix(e);
  pill(ctx, gx, gy, Math.max(3, gw * e), 3);
  ctx.fill();
  ctx.restore();

  // ── Live H readout ──────────────────────────────────────────────────────
  if (reserveTop >= 22) {
    const ty = reserveTop - 5;
    ctx.font = '600 10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = VIZ.dim;
    ctx.fillText('H =', padX, ty);
    const labelW = ctx.measureText('H = ').width;
    const val = H.toFixed(2);
    ctx.save();
    ctx.shadowColor = mix(e);
    ctx.shadowBlur = 8;
    ctx.fillStyle = mix(e);
    ctx.fillText(val, padX + labelW, ty);
    ctx.restore();
    const valW = ctx.measureText(val).width;
    ctx.fillStyle = VIZ.dim;
    ctx.fillText(' bits', padX + labelW + valW, ty);
  }

  // ── Probability bars ────────────────────────────────────────────────────
  const gap = 7;
  const bw = (w - gap * (N + 1)) / N;
  const floor = 3;
  const r = Math.min(3, bw / 2);
  const barCenter = (i: number): number => gap + i * (bw + gap) + bw / 2;

  // Faint baseline for grounding.
  ctx.strokeStyle = VIZ.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, baseY + 0.5);
  ctx.lineTo(w - padX, baseY + 0.5);
  ctx.stroke();

  const top = mix(e);
  for (let i = 0; i < N; i += 1) {
    const bh = Math.max(floor, Math.min(1, p[i] / REF) * areaH);
    const x = gap + i * (bw + gap);
    const y = baseY - bh;
    const grad = ctx.createLinearGradient(0, y, 0, baseY);
    grad.addColorStop(0, top);
    grad.addColorStop(1, alpha(VIZ.blue, 0.16));
    ctx.save();
    ctx.shadowColor = top;
    ctx.shadowBlur = 5 + 12 * e;
    ctx.fillStyle = grad;
    barPath(ctx, x, y, bw, r, baseY);
    ctx.fill();
    ctx.restore();
  }

  // ── Mass-flow motes (visible only while the distribution is shifting) ────
  if (activity > 0.02) {
    const midY = areaTop + areaH * 0.5;
    ctx.save();
    ctx.shadowColor = VIZ.green;
    ctx.shadowBlur = 6;
    for (let k = 0; k < NP; k += 1) {
      const srcIdx = 1 + (k % (N - 1));
      const fromX = concentrating ? barCenter(srcIdx) : barCenter(0);
      const toX = concentrating ? barCenter(0) : barCenter(srcIdx);
      const u = (t * 0.012 + k * 0.137) % 1;
      const x = lerp(fromX, toX, u);
      const hump = 10 + 6 * Math.sin(k);
      const y = midY - Math.sin(Math.PI * u) * hump;
      const a = Math.sin(Math.PI * u) * activity * 0.5;
      ctx.fillStyle = alpha(VIZ.green, a);
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
};

export function EntropyViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
