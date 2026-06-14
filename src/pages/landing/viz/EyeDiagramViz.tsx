import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ, gaussian } from './palette';

const TAU = Math.PI * 2;

/** Raised-cosine roll-off factor (excess bandwidth). */
const BETA = 0.35;
/** Pulse truncation in symbol periods → how many neighbours cause ISI. */
const SPAN = 3;
/** Number of random symbols held in the scrolling buffer. */
const N_SYMBOLS = 24;
/** Scroll the data one symbol every N frames → the eye stays live. */
const FRAMES_PER_STEP = 6;
/** Horizontal samples per overlaid trace (resolution of one 2T sweep). */
const SAMPLES = 96;

/** sinc(x) = sin(πx)/(πx). */
function sinc(x: number): number {
  if (Math.abs(x) < 1e-7) return 1;
  const px = Math.PI * x;
  return Math.sin(px) / px;
}

/** Raised-cosine pulse p(τ), τ in symbol periods. Handles the two singularities. */
function raisedCosine(tau: number): number {
  const denomZero = Math.abs(2 * BETA * tau);
  if (Math.abs(denomZero - 1) < 1e-6) {
    // τ = ±1/(2β): limit value.
    return (Math.PI / 4) * sinc(1 / (2 * BETA));
  }
  return (sinc(tau) * Math.cos(Math.PI * BETA * tau)) / (1 - denomZero * denomZero);
}

// Exactly one EyeDiagramViz renders on the landing page, so a module-scope
// symbol buffer is safe (same pattern as NoiseViz). Bipolar 2-PAM (±1).
let symbols: number[] | null = null;
let lastFrame = -1;

function ensureSymbols(): number[] {
  if (!symbols) {
    symbols = [];
    for (let i = 0; i < N_SYMBOLS; i += 1) symbols.push(gaussian() > 0 ? 1 : -1);
  }
  return symbols;
}

/** Baseband signal value at continuous symbol-time `ts` = Σ a_k p(ts − k). */
function signalAt(sym: number[], ts: number): number {
  let y = 0;
  const lo = Math.max(0, Math.floor(ts) - SPAN);
  const hi = Math.min(sym.length - 1, Math.ceil(ts) + SPAN);
  for (let k = lo; k <= hi; k += 1) y += sym[k] * raisedCosine(ts - k);
  return y;
}

/**
 * Baseband Transmission & ISI: a live eye diagram. Random 2-PAM symbols are pulse-shaped with
 * a raised-cosine filter and the waveform is sliced into 2-symbol windows, all
 * overlaid — the classic "eye". The data scrolls and breathing Gaussian noise
 * blurs the traces, so the eye opening lives and closes as the SNR changes (Ch 8).
 */
const draw: DrawFn = (ctx, t, w, h) => {
  const sym = ensureSymbols();

  // Scroll the data one symbol per FRAMES_PER_STEP, on genuinely new frames only.
  if (t !== lastFrame) {
    if (t % FRAMES_PER_STEP === 0) {
      sym.shift();
      sym.push(gaussian() > 0 ? 1 : -1);
    }
    lastFrame = t;
  }

  ctx.clearRect(0, 0, w, h);
  const mid = h * 0.5;
  const amp = h * 0.33;

  // Breathing noise amplitude → the eye opens and partially closes.
  const sigma = 0.05 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.02));

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Zero baseline + decision instant (centre of the 2T window).
  ctx.strokeStyle = VIZ.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(w, mid);
  ctx.moveTo(w * 0.5, h * 0.12);
  ctx.lineTo(w * 0.5, h * 0.88);
  ctx.stroke();

  // Overlay one 2T trace per interior symbol. Low alpha → overlapping traces
  // build up the bright eye rails, the crossings stay sparse (the opening).
  ctx.strokeStyle = VIZ.green;
  ctx.lineWidth = 1.1;
  ctx.shadowColor = VIZ.green;
  ctx.shadowBlur = 5;
  ctx.globalAlpha = 0.42;
  for (let c = SPAN; c <= sym.length - 1 - SPAN; c += 1) {
    ctx.beginPath();
    for (let s = 0; s <= SAMPLES; s += 1) {
      const frac = s / SAMPLES; // 0..1 across the window
      const ts = c - 1 + frac * 2; // symbol-time spanning [c−1, c+1] → 2T
      const y = mid - (signalAt(sym, ts) + gaussian() * sigma) * amp;
      const x = frac * w;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Optimal sampling markers: where the open eye is sampled (±1 rails at centre).
  ctx.fillStyle = VIZ.pink;
  for (const level of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(w * 0.5, mid - level * amp, 2, 0, TAU);
    ctx.fill();
  }
};

export function EyeDiagramViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
