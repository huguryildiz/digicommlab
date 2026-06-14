import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ, alpha } from './palette';

const TAU = Math.PI * 2;

/**
 * End-to-End Link — the whole communication chain wired together
 * (Proakis & Salehi, the full signal path of Chapters 2–15).
 *
 * A single wire runs across the tile through six stage nodes. Its shape morphs
 * to match what the signal is at each hop, telling the end-to-end story:
 *   SRC → COD : source bits          (square levels)
 *   COD → MOD : coded bits           (denser levels — added redundancy)
 *   MOD → CHN : modulated carrier    (clean sine)
 *   CHN → DET : received signal      (noisy sine — the channel adds noise)
 *   DET → SNK : recovered bits       (same pattern as the source → link works)
 * A luminous playhead sweeps left→right, energizing the chain behind it and
 * pulsing each node as it passes — the link "running" once per loop.
 */

type SegKind = 'bits' | 'sine' | 'noisy';

const LABELS = ['SRC', 'COD', 'MOD', 'CHN', 'DET', 'SNK'];
// Source pattern; the recovered segment reuses it so the chain visibly closes.
const SRC_BITS = [1, 0, 1, 1, 0];
const COD_BITS = [1, 0, 0, 1, 0, 1, 1];
const SEGS: { kind: SegKind; bits?: number[] }[] = [
  { kind: 'bits', bits: SRC_BITS },
  { kind: 'bits', bits: COD_BITS },
  { kind: 'sine' },
  { kind: 'noisy' },
  { kind: 'bits', bits: SRC_BITS },
];

const SWEEP = 0.006; // playhead phase per frame (~2.8s per loop)
const CYCLES = 2; // sine cycles per segment

const draw: DrawFn = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h);

  const margin = w * 0.06;
  const usableW = w - 2 * margin;
  const cy = h * 0.52;
  const amp = Math.min(h * 0.3, 28);
  const n = LABELS.length;
  const nodeX = (i: number): number => margin + (usableW * i) / (n - 1);
  const showLabels = w > 220;

  const phase = (t * SWEEP) % 1;
  const headX = margin + usableW * phase;

  // Normalized signal value (-1..1) for a wire position x.
  const signal = (x: number): number => {
    const s = Math.min(n - 2, Math.max(0, Math.floor(((x - margin) / usableW) * (n - 1))));
    const x0 = nodeX(s);
    const local = (x - x0) / (nodeX(s + 1) - x0);
    const seg = SEGS[s];
    if (seg.kind === 'sine') return Math.sin(local * CYCLES * TAU - t * 0.12);
    if (seg.kind === 'noisy') {
      return Math.sin(local * CYCLES * TAU - t * 0.12) * 0.6 + (Math.random() - 0.5) * 0.7;
    }
    const bits = seg.bits as number[];
    const idx = Math.min(bits.length - 1, Math.floor(local * bits.length));
    return bits[idx] ? 1 : -1;
  };

  // ── Channel band: subtle noise tint over the CHN → DET segment ────────────
  const cStart = nodeX(3);
  const cEnd = nodeX(4);
  const band = ctx.createLinearGradient(cStart, 0, cEnd, 0);
  band.addColorStop(0, alpha(VIZ.pink, 0));
  band.addColorStop(0.5, alpha(VIZ.pink, 0.1));
  band.addColorStop(1, alpha(VIZ.pink, 0));
  ctx.fillStyle = band;
  ctx.fillRect(cStart, 0, cEnd - cStart, h);

  // ── Sample the wire once so both passes share the same noise ──────────────
  const xs: number[] = [];
  const ys: number[] = [];
  for (let x = margin; x <= margin + usableW; x += 2) {
    xs.push(x);
    ys.push(cy - signal(x) * amp);
  }

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Dim base wire (the not-yet-energized chain).
  ctx.strokeStyle = alpha(VIZ.blue, 0.28);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(xs[0], ys[0]);
  for (let i = 1; i < xs.length; i += 1) ctx.lineTo(xs[i], ys[i]);
  ctx.stroke();

  // Energized portion behind the playhead — bright green with glow.
  ctx.strokeStyle = VIZ.green;
  ctx.lineWidth = 2;
  ctx.shadowColor = VIZ.green;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < xs.length; i += 1) {
    if (xs[i] > headX) break;
    if (!started) {
      ctx.moveTo(xs[i], ys[i]);
      started = true;
    } else ctx.lineTo(xs[i], ys[i]);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Stage nodes ───────────────────────────────────────────────────────────
  for (let i = 0; i < n; i += 1) {
    const x = nodeX(i);
    const passed = x <= headX;
    const pulse = Math.max(0, 1 - Math.abs(headX - x) / 22);
    if (pulse > 0.02) {
      ctx.fillStyle = alpha(VIZ.green, pulse * 0.18);
      ctx.beginPath();
      ctx.arc(x, cy, 7 + pulse * 9, 0, TAU);
      ctx.fill();
    }
    ctx.shadowColor = VIZ.green;
    ctx.shadowBlur = passed ? 5 + pulse * 10 : 0;
    ctx.fillStyle = passed ? VIZ.green : alpha(VIZ.blue, 0.55);
    ctx.beginPath();
    ctx.arc(x, cy, 3 + pulse * 1.6, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (showLabels) {
      ctx.font = '600 9px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = passed ? alpha(VIZ.green, 0.75) : VIZ.dim;
      ctx.globalAlpha = 0.7;
      ctx.fillText(LABELS[i], x, 5);
      ctx.globalAlpha = 1;
    }
  }

  // ── Playhead riding the wire ──────────────────────────────────────────────
  const hy = cy - signal(headX) * amp;
  ctx.strokeStyle = alpha(VIZ.green, 0.16);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(headX, 4);
  ctx.lineTo(headX, h - 4);
  ctx.stroke();
  ctx.shadowColor = VIZ.green;
  ctx.shadowBlur = 12;
  ctx.fillStyle = VIZ.text;
  ctx.beginPath();
  ctx.arc(headX, hy, 3.2, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
};

export function ChainViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
