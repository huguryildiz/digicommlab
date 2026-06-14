import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ } from './palette';

const TAU = Math.PI * 2;
type Point = [number, number];

/* ─────────────────────────────────────────────────────────────────────────
 * Wireless — Multipath propagation scene (Proakis & Salehi §10.1.1).
 * Clarke/Jakes Rayleigh fading (M=16 scatterers) couples ray glow to the
 * live envelope: constructive peaks brighten reflected rays, deep fades dim
 * them. Full-canvas single zone — no trace subplot.
 * ───────────────────────────────────────────────────────────────────────── */

/* ── Clarke/Jakes envelope engine ─────────────────────────────────────── */
const M = 16;
const OMEGA = 0.04; // per-frame Doppler scale
const SCATTER_SCALE = Math.sqrt(1 / M);
const cosAlpha = Array.from({ length: M }, (_, m) => Math.cos((TAU * (m + 1)) / M));
const arg = Array.from({ length: M }, () => TAU * Math.random());

let lastFrame = -1;
let envSmooth = 0.8; // exponentially smoothed envelope (avoids jitter)

function stepEnvelope(): void {
  let re = 0;
  let im = 0;
  for (let m = 0; m < M; m++) {
    re += Math.cos(arg[m]);
    im += Math.sin(arg[m]);
    arg[m] += OMEGA * cosAlpha[m];
  }
  const raw = Math.hypot(re, im) * SCATTER_SCALE;
  envSmooth = 0.92 * envSmooth + 0.08 * raw;
}

/* ── Geometry helpers ──────────────────────────────────────────────────── */
function pathLen(pts: Point[]): number {
  let l = 0;
  for (let i = 0; i < pts.length - 1; i++)
    l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return l;
}

function pointAt(pts: Point[], u: number): Point {
  const total = pathLen(pts);
  let target = Math.max(0, Math.min(1, u)) * total;
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (target <= seg || i === pts.length - 2) {
      const f = seg === 0 ? 0 : Math.min(1, target / seg);
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
    }
    target -= seg;
  }
  return pts[pts.length - 1];
}

function strokePolyline(ctx: CanvasRenderingContext2D, pts: Point[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

function drawAntenna(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  stemH: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.8;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - stemH);
  ctx.stroke();
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(x, y - stemH, 3, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
}

/**
 * Concentric arcs at an antenna tip. `converging` reverses the animation so the
 * rings collapse inward (signal reception) instead of radiating outward
 * (transmission). `intensity` scales brightness — used to couple Rx reception to
 * the fading envelope (deep fade → dim reception).
 */
function drawArcs(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  converging: boolean,
  intensity: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 5; k++) {
    let phase = (t * 0.011 + k / 5) % 1;
    if (converging) phase = 1 - phase; // collapse inward toward the tip
    const r = 5 + phase * 44;
    ctx.globalAlpha = 0.32 * (1 - phase) * (1 - phase) * intensity;
    ctx.shadowBlur = 5 + 5 * (1 - phase);
    ctx.beginPath();
    ctx.arc(cx, cy, r, -TAU / 4 - 0.65, -TAU / 4 + 0.65);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

/** Small mono label centered under an antenna base. */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
): void {
  ctx.font = '600 11px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

/** Maps a typical smoothed peak to envFrac ≈ 1. */
const ENV_REF = 1.1;

const draw: DrawFn = (ctx, t, w, h) => {
  if (t !== lastFrame) {
    stepEnvelope();
    lastFrame = t;
  }

  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const envFrac = Math.max(0, Math.min(1, envSmooth / ENV_REF));
  const deepFade = envFrac < 0.28;

  // Scene geometry — vertically centered, generous vertical spread
  const mid = h * 0.52;
  const stemH = h * 0.17;
  const tx: Point = [w * 0.09, mid];
  const rx: Point = [w * 0.91, mid];
  const scatterUp: Point = [w * 0.40, h * 0.13];
  const scatterDn: Point = [w * 0.62, h * 0.87];
  const los: Point[] = [tx, rx];
  const refl: Point[][] = [
    [tx, scatterUp, rx],
    [tx, scatterDn, rx],
  ];

  // ── 1. Antenna tip arcs — Tx radiates outward, Rx receives (collapses
  //       inward, brightness coupled to the fading envelope) ──────────────
  const arcY = mid - stemH;
  drawArcs(ctx, tx[0], arcY, t, false, 1, VIZ.green); // Tx: radiate (green)
  drawArcs(ctx, rx[0], arcY, t, true, 0.35 + 0.65 * envFrac, VIZ.blue); // Rx: receive (blue)

  // ── 2. Scatterer nodes with glowing halos ─────────────────────────────
  const scatterers: Point[] = [scatterUp, scatterDn];
  for (let si = 0; si < scatterers.length; si++) {
    const [sx, sy] = scatterers[si];
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.028 + si * Math.PI);
    ctx.fillStyle = VIZ.blue;
    ctx.shadowColor = VIZ.blue;
    // Outer halo
    ctx.shadowBlur = 14 + 8 * pulse;
    ctx.globalAlpha = (0.12 + 0.1 * pulse) * (0.4 + 0.6 * envFrac);
    ctx.beginPath();
    ctx.arc(sx, sy, 6 + 2 * pulse, 0, TAU);
    ctx.fill();
    // Core
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.45 + 0.35 * pulse;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.4, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // ── 3. Reflected rays — glow couples to envelope ──────────────────────
  ctx.strokeStyle = VIZ.blue;
  ctx.shadowColor = VIZ.blue;
  ctx.lineWidth = 1.3;
  ctx.shadowBlur = 4 + 12 * envFrac;
  ctx.globalAlpha = 0.14 + 0.56 * envFrac;
  for (const r of refl) strokePolyline(ctx, r);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // ── 4. LOS ray — glow and weight couple to envelope ───────────────────
  ctx.strokeStyle = VIZ.green;
  ctx.shadowColor = VIZ.green;
  ctx.lineWidth = deepFade ? 1.2 : 2.0;
  ctx.shadowBlur = deepFade ? 3 : 8 + 8 * envFrac;
  ctx.globalAlpha = 0.5 + 0.45 * envFrac;
  strokePolyline(ctx, los);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // ── 5. Wavefront packets with comet tails ─────────────────────────────
  const SPEED = 1.3; // px/frame
  const TRAIL = 5; // trail segments behind the head
  const TRAIL_STEP = 0.024; // fraction of path per segment
  const allRays: Point[][] = [los, ...refl];

  for (let ri = 0; ri < allRays.length; ri++) {
    const pts = allRays[ri];
    const len = pathLen(pts);
    if (len === 0) continue;
    const uHead = ((t * SPEED + ri * 41) % len) / len;
    const isLos = ri === 0;
    const color = isLos ? VIZ.green : VIZ.blue;
    const headAlpha = isLos ? 1.0 : 0.3 + 0.65 * envFrac;

    // Draw trail from oldest (tr=TRAIL) to head (tr=0)
    for (let tr = TRAIL; tr >= 0; tr--) {
      const uSample = ((uHead - tr * TRAIL_STEP) + 100) % 1;
      const [px, py] = pointAt(pts, uSample);
      const frac = (TRAIL - tr) / TRAIL; // 0=tail end, 1=head
      const radius = isLos ? 1.0 + 1.6 * frac : 0.8 + 1.2 * frac;
      const alpha = headAlpha * frac * (tr === 0 ? 1.0 : 0.35);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = tr === 0 ? (isLos ? 14 : 8 + 7 * envFrac) : 3;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // ── 6. Antenna masts (drawn last so they sit on top) ──────────────────
  drawAntenna(ctx, tx[0], tx[1], stemH, VIZ.green);
  drawAntenna(ctx, rx[0], rx[1], stemH, VIZ.green);

  // ── 7. Tx / Rx labels under each antenna base ─────────────────────────
  drawLabel(ctx, tx[0], mid + 8, 'TX', VIZ.green);
  drawLabel(ctx, rx[0], mid + 8, 'RX', VIZ.blue);
};

export function FadingViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
