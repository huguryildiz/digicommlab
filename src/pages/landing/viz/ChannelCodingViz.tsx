import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ, alpha } from './palette';

const TAU = Math.PI * 2;

/**
 * Channel Capacity & Coding (Proakis & Salehi, Ch. 13 — Coding for Reliable
 * Communications, §13.2.3 Error Detection vs. Error Correction).
 *
 * Narrative, left → right, as a coding pipeline:
 *   ENCODED  → a clean coded bitstream of cells streams in from the left.
 *   CHANNEL  → a noisy band in the middle flips some bits (errors glow pink).
 *   DECODED  → the decoder corrects recoverable errors back to green with a
 *              pulse/ring; a rare uncorrectable error slips through (dim pink),
 *              the way a real code has a residual bit-error rate.
 */

type State = 0 | 1 | 2; // 0 clean · 1 error · 2 corrected

interface Bit {
  lane: number;
  x: number; // CSS-px center, advances rightward
  on: boolean; // bit value → subtle fill variation
  state: State;
  diced: boolean; // channel error roll done
  decoded: boolean; // passed the decoder line
  uncorr: boolean; // uncorrectable (residual error)
  pulse: number; // correction flash, 1 → 0
}

// Persistent stream state (module-level, like the other landing viz).
const bits: Bit[] = [];
let lanesN = 0;
let lastW = 0;
let lastH = 0;

const SPEED = 0.72; // px per frame — calm, premium drift
const PITCH_X = 17; // spacing between cells in a lane
const LANE_PITCH = 20; // vertical spacing between lanes
const ERR_PROB = 0.26; // P(bit flipped in the channel)
const UNCORR_PROB = 0.12; // of errors, fraction the decoder cannot fix

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Roll the channel for a single bit as it enters the noisy band. */
function diceChannel(b: Bit): void {
  b.diced = true;
  if (Math.random() < ERR_PROB) {
    b.state = 1;
    b.uncorr = Math.random() < UNCORR_PROB;
  }
}

const draw: DrawFn = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h);

  const lanes = Math.max(3, Math.min(6, Math.floor((h - 8) / LANE_PITCH)));
  const channelX = w * 0.5;
  const channelW = Math.max(26, w * 0.15);
  const decoderX = w * 0.78;
  const cell = Math.min(LANE_PITCH * 0.6, 12);
  const top = (h - lanes * LANE_PITCH) / 2 + LANE_PITCH / 2;
  const laneY = (l: number): number => top + l * LANE_PITCH;
  const showLabels = w > 230;

  // (Re)seed the stream on first frame or when the canvas is resized.
  if (lanes !== lanesN || w !== lastW || h !== lastH) {
    bits.length = 0;
    lanesN = lanes;
    lastW = w;
    lastH = h;
    for (let l = 0; l < lanes; l += 1) {
      const phase = (l * PITCH_X * 0.5) % PITCH_X;
      for (let x = -PITCH_X + phase; x < w + PITCH_X; x += PITCH_X) {
        const b: Bit = {
          lane: l,
          x,
          on: Math.random() > 0.5,
          state: 0,
          diced: false,
          decoded: false,
          uncorr: false,
          pulse: 0,
        };
        // Pre-roll history so the right half isn't suspiciously pristine.
        if (x >= channelX) diceChannel(b);
        if (x >= decoderX && b.state === 1 && !b.uncorr) b.state = 2;
        bits.push(b);
      }
    }
  }

  // ── Background: the noisy channel band ───────────────────────────────────
  const band = ctx.createLinearGradient(channelX - channelW, 0, channelX + channelW, 0);
  band.addColorStop(0, alpha(VIZ.pink, 0));
  band.addColorStop(0.5, alpha(VIZ.pink, 0.12));
  band.addColorStop(1, alpha(VIZ.pink, 0));
  ctx.fillStyle = band;
  ctx.fillRect(channelX - channelW, 0, channelW * 2, h);

  // Drifting noise speckle inside the band.
  ctx.fillStyle = alpha(VIZ.pink, 0.5);
  for (let i = 0; i < 7; i += 1) {
    const sx = channelX + Math.sin(t * 0.05 + i * 1.7) * channelW * 0.8;
    const sy = (((i * 53 + t * 1.3) % (h + 10)) + h + 10) % (h + 10);
    ctx.globalAlpha = 0.18 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.08 + i));
    ctx.beginPath();
    ctx.arc(sx, sy, 1.1, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Decoder gate ─────────────────────────────────────────────────────────
  ctx.strokeStyle = alpha(VIZ.green, 0.28);
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(decoderX, 6);
  ctx.lineTo(decoderX, h - 6);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Advance + draw the stream ────────────────────────────────────────────
  // Track the leftmost (most-recently-spawned) cell per lane so we can refill
  // the ENCODED side as cells drift right toward DECODED.
  const leftX: number[] = new Array(lanes).fill(Infinity);

  for (let idx = bits.length - 1; idx >= 0; idx -= 1) {
    const b = bits[idx];
    if (!b) continue;

    b.x += SPEED;
    if (!b.diced && b.x >= channelX) diceChannel(b);
    if (!b.decoded && b.x >= decoderX) {
      b.decoded = true;
      if (b.state === 1 && !b.uncorr) {
        b.state = 2;
        b.pulse = 1;
      }
    }
    if (b.pulse > 0) b.pulse = Math.max(0, b.pulse - 0.045);

    // Retire off the right edge.
    if (b.x > w + PITCH_X) {
      bits.splice(idx, 1);
      continue;
    }
    if (b.x < leftX[b.lane]) leftX[b.lane] = b.x;

    const y = laneY(b.lane);
    // Fade in at the left, out at the right.
    const edge = Math.min(1, (b.x + PITCH_X) / (PITCH_X * 2), (w + PITCH_X - b.x) / (PITCH_X * 2));
    const edgeAlpha = Math.max(0, edge);
    const cx = b.x;
    const cy = y;
    const s = cell * (b.on ? 1 : 0.82);

    ctx.globalAlpha = edgeAlpha;
    if (b.state === 1) {
      // Error — pink, glowing (dim if uncorrectable).
      const a = b.uncorr ? 0.5 : 0.95;
      ctx.shadowColor = VIZ.pink;
      ctx.shadowBlur = b.uncorr ? 4 : 9;
      ctx.fillStyle = alpha(VIZ.pink, a);
      roundRect(ctx, cx - s / 2, cy - s / 2, s, s, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (b.state === 2) {
      // Corrected — green with a fading pulse + expanding ring.
      ctx.shadowColor = VIZ.green;
      ctx.shadowBlur = 6 + b.pulse * 14;
      ctx.fillStyle = VIZ.green;
      roundRect(ctx, cx - s / 2, cy - s / 2, s, s, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (b.pulse > 0.01) {
        ctx.strokeStyle = alpha(VIZ.green, b.pulse * 0.6);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.7 + (1 - b.pulse) * 11, 0, TAU);
        ctx.stroke();
      }
    } else {
      // Clean coded bit — soft green→blue gradient cell.
      const g = ctx.createLinearGradient(0, cy - s / 2, 0, cy + s / 2);
      g.addColorStop(0, alpha(VIZ.green, 0.85));
      g.addColorStop(1, alpha(VIZ.blue, 0.6));
      ctx.fillStyle = g;
      roundRect(ctx, cx - s / 2, cy - s / 2, s, s, 3);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Refill from the left: when the leftmost cell has cleared the spawn point,
  // drop a new one one PITCH_X behind it (empty lane → seed just off-screen).
  for (let l = 0; l < lanes; l += 1) {
    const anchor = leftX[l] === Infinity ? 0 : leftX[l];
    if (anchor >= 0) {
      bits.push({
        lane: l,
        x: anchor - PITCH_X,
        on: Math.random() > 0.5,
        state: 0,
        diced: false,
        decoded: false,
        uncorr: false,
        pulse: 0,
      });
    }
  }

  // ── Micro-labels (premium editorial touch) ───────────────────────────────
  if (showLabels) {
    ctx.font = '600 9px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = VIZ.dim;
    ctx.globalAlpha = 0.55;
    ctx.textAlign = 'left';
    ctx.fillText('ENCODED', 6, 4);
    ctx.textAlign = 'center';
    ctx.fillStyle = alpha(VIZ.pink, 0.7);
    ctx.fillText('CHANNEL', channelX, 4);
    ctx.fillStyle = alpha(VIZ.green, 0.7);
    ctx.textAlign = 'right';
    ctx.fillText('DECODED', w - 6, 4);
    ctx.globalAlpha = 1;
  }
};

export function ChannelCodingViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
