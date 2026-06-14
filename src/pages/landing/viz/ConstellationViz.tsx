import { useCanvasTicker, type DrawFn } from '../useCanvasTicker';
import { VIZ, alpha, gaussian } from './palette';

const TAU = Math.PI * 2;

type Point = [number, number];

interface Scheme {
  label: string;
  points: Point[];
  /** Max |coordinate| on either axis, used to scale the scheme into its panel. */
  extent: number;
}

/** 4-ASK: amplitude only → points on a single (I) axis. */
const ASK: Point[] = [
  [-3, 0],
  [-1, 0],
  [1, 0],
  [3, 0],
];

/** 8-PSK: constant amplitude, phase only → points on a circle. */
const PSK: Point[] = Array.from({ length: 8 }, (_, k) => {
  const a = (k / 8) * TAU;
  return [Math.cos(a) * 2.5, Math.sin(a) * 2.5] as Point;
});

/** 16-QAM: amplitude + phase → 4×4 grid. */
const QAM: Point[] = [];
for (let i = -3; i <= 3; i += 2) {
  for (let q = -3; q <= 3; q += 2) QAM.push([i, q]);
}

const SCHEMES: Scheme[] = [
  { label: 'ASK', points: ASK, extent: 3 },
  { label: 'PSK', points: PSK, extent: 2.5 },
  { label: 'QAM', points: QAM, extent: 3 },
];

/** A "received symbol" that falls near an ideal point, then fades out. */
interface RxSymbol {
  panel: number;
  i: number;
  q: number;
  ox: number;
  oy: number;
  age: number;
}
const rx: RxSymbol[] = [];
const TTL = 36;

/** Per-frame panel geometry: pixel center and unit (pixels per constellation unit). */
interface PanelGeom {
  cx: number;
  cy: number;
  unit: number;
}

/**
 * Flagship — Digital Modulation & Detection: three digital constellations side by side,
 * ASK | PSK | QAM, contrasting how bits map to amplitude, phase, or both. Each
 * frame, noisy "received symbols" fall around the ideal points and fade; ideal
 * points pulse and the noise amplitude breathes (E_b/N_0 appears to change).
 */
const draw: DrawFn = (ctx, t, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const colW = w / SCHEMES.length;

  // Compute each panel's pixel geometry for this frame.
  const geoms: PanelGeom[] = SCHEMES.map((scheme, j) => {
    const cx = colW * (j + 0.5);
    const cy = h / 2;
    const unit = ((Math.min(colW, h) / 2) * 0.74) / scheme.extent;
    return { cx, cy, unit };
  });

  // Faint axes + divider + label per panel.
  ctx.lineCap = 'round';
  for (let j = 0; j < SCHEMES.length; j += 1) {
    const g = geoms[j];
    const reach = SCHEMES[j].extent * g.unit * 1.15;

    ctx.strokeStyle = VIZ.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.cx, g.cy - reach);
    ctx.lineTo(g.cx, g.cy + reach);
    ctx.moveTo(g.cx - reach, g.cy);
    ctx.lineTo(g.cx + reach, g.cy);
    ctx.stroke();

    if (j > 0) {
      ctx.strokeStyle = VIZ.dim;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(colW * j, h * 0.12);
      ctx.lineTo(colW * j, h * 0.88);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = 0.6;
    ctx.fillStyle = VIZ.dim;
    ctx.font = '600 11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(SCHEMES[j].label, colW * j + 8, 6);
    ctx.globalAlpha = 1;
  }

  // Breathing noise amplitude + spawn new received symbols across the panels.
  const sigma = 0.2 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.025));
  for (let k = 0; k < 3; k += 1) {
    const panel = Math.floor(Math.random() * SCHEMES.length);
    const pts = SCHEMES[panel].points;
    const p = pts[Math.floor(Math.random() * pts.length)];
    if (p) rx.push({ panel, i: p[0], q: p[1], ox: gaussian() * sigma, oy: gaussian() * sigma, age: 0 });
  }

  // Age + draw fading received symbols.
  for (let idx = rx.length - 1; idx >= 0; idx -= 1) {
    const r = rx[idx];
    if (!r) continue;
    r.age += 1;
    if (r.age > TTL) {
      rx.splice(idx, 1);
      continue;
    }
    const g = geoms[r.panel];
    const a = 1 - r.age / TTL;
    const x = g.cx + (r.i + r.ox) * g.unit;
    const y = g.cy - (r.q + r.oy) * g.unit;
    ctx.fillStyle = alpha(VIZ.pink, 0.55 * a);
    ctx.beginPath();
    ctx.arc(x, y, 1.7 + a * 0.8, 0, TAU);
    ctx.fill();
  }

  // Ideal points — pulsing glow.
  for (let j = 0; j < SCHEMES.length; j += 1) {
    const g = geoms[j];
    for (const [i, q] of SCHEMES[j].points) {
      const bx = g.cx + i * g.unit;
      const by = g.cy - q * g.unit;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.07 + (i + q) * 0.6);
      ctx.shadowColor = VIZ.green;
      ctx.shadowBlur = 5 + pulse * 8;
      ctx.fillStyle = VIZ.green;
      ctx.beginPath();
      ctx.arc(bx, by, 2.4 + pulse * 0.8, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
};

export function ConstellationViz() {
  const ref = useCanvasTicker(draw);
  return <canvas ref={ref} className="viz-canvas" aria-hidden="true" />;
}
