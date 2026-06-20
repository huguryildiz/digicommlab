// JPEG panel components (Proakis §7.7, Fig. 7.26–7.27)
// BlockHeatmap: renders an 8×8 block as a colored cell grid (no useZoom — heatmaps
// are 2-D spatial grids, not time/frequency plots, so scroll-zoom/pan is exempt).
// QuantTablePanel: renders the scaled Q-table as a heatmap.
// ZigzagOverlay: draws zig-zag scan-order index labels (0–63) on top of a block.

import { Canvas } from '@/lib/plot/Canvas';
import { CHART, alpha } from '@/lib/plot/colors';
import { zigzagOrder } from '@/lib/dsp/dct';

// ── Constants ────────────────────────────────────────────────────────────────

const CELL = 8; // 8×8 block
const PAD = { l: 20, r: 4, t: 20, b: 4 }; // room for row/col index ticks

// ── Colour ramps (token-based, no hardcoded hex) ─────────────────────────────

/** Linearly interpolate two hex colours by t ∈ [0, 1]. */
function lerpColor(a: string, b: string, t: number): string {
  const ah = a.replace('#', '');
  const bh = b.replace('#', '');
  const r = Math.round(parseInt(ah.slice(0, 2), 16) * (1 - t) + parseInt(bh.slice(0, 2), 16) * t);
  const g = Math.round(parseInt(ah.slice(2, 4), 16) * (1 - t) + parseInt(bh.slice(2, 4), 16) * t);
  const bl = Math.round(parseInt(ah.slice(4, 6), 16) * (1 - t) + parseInt(bh.slice(4, 6), 16) * t);
  return `rgb(${r},${g},${bl})`;
}

/**
 * Map a pixel value [0..255] to a colour: bgDeep (dark) → green (bright).
 * Used for 'pixel' mode (original / reconstructed blocks).
 */
function pixelColor(v: number): string {
  const t = Math.min(1, Math.max(0, v / 255));
  return lerpColor(CHART.bgDeep, CHART.green, t);
}

/**
 * Map a DCT coefficient log-magnitude to a colour: bgDeep → orange.
 * Used for 'coeff' mode. Uses log scale for visibility of small coefficients.
 */
function coeffColor(v: number, maxAbs: number): string {
  if (maxAbs <= 0) return CHART.bgDeep;
  const logMax = Math.log1p(maxAbs);
  const t = Math.min(1, Math.log1p(Math.abs(v)) / logMax);
  return lerpColor(CHART.bgDeep, CHART.orange, t);
}

/**
 * Map a quantized level (small signed integer) to a colour.
 * Zero → bgDeep (dark), non-zero → blue scaled by magnitude.
 * Used for 'level' mode.
 */
function levelColor(v: number, maxAbs: number): string {
  if (v === 0) return CHART.bgDeep;
  if (maxAbs <= 0) return CHART.bgDeep;
  const t = Math.min(1, Math.abs(v) / maxAbs);
  return lerpColor(CHART.bgDeep, CHART.blue, Math.max(0.15, t));
}

// ── BlockHeatmap ─────────────────────────────────────────────────────────────

export type HeatmapMode = 'pixel' | 'coeff' | 'level';

export interface BlockHeatmapProps {
  /** 8×8 matrix of values. */
  block: number[][];
  /** Short caption shown below or via aria. */
  title: string;
  /**
   * Render mode:
   * - 'pixel'  — spatial [0..255] values, labelled numerically in each cell.
   * - 'coeff'  — DCT log-magnitude, label only the DC (top-left) cell.
   * - 'level'  — small signed quantized integers, labelled in each cell.
   */
  mode: HeatmapMode;
  /** Highlight the DC coefficient (top-left cell) with a pink border. */
  highlightDc?: boolean;
}

/**
 * Renders an 8×8 heatmap of a JPEG processing block.
 * Each cell is colour-coded by mode; row/col indices 0–7 are drawn along top/left.
 * No scroll-zoom — heatmaps are spatial grids, not time/frequency axes.
 */
export function BlockHeatmap({ block, title, mode, highlightDc = false }: BlockHeatmapProps) {
  // Pre-compute range for colour mapping (stable across renders)
  const flat = block.flat();
  const maxAbs = Math.max(...flat.map(Math.abs), 1);

  return (
    <Canvas
      height={200}
      ariaLabel={title}
      deps={[block, mode, highlightDc]}
      draw={(ctx, w, h) => {
        // Available drawing area (inside tick-label padding)
        const areaW = w - PAD.l - PAD.r;
        const areaH = h - PAD.t - PAD.b;
        const cellW = areaW / CELL;
        const cellH = areaH / CELL;

        ctx.save();

        // ── Row/col index ticks ─────────────────────────────────────────────
        ctx.font = `9px var(--mono)`;
        ctx.fillStyle = CHART.dim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < CELL; i++) {
          // Column index along top
          ctx.fillText(
            String(i),
            PAD.l + (i + 0.5) * cellW,
            PAD.t / 2,
          );
          // Row index along left
          ctx.fillText(
            String(i),
            PAD.l / 2,
            PAD.t + (i + 0.5) * cellH,
          );
        }

        // ── Cells ───────────────────────────────────────────────────────────
        for (let r = 0; r < CELL; r++) {
          for (let c = 0; c < CELL; c++) {
            const v = block[r]?.[c] ?? 0;
            const x = PAD.l + c * cellW;
            const y = PAD.t + r * cellH;

            // Fill
            let fill: string;
            if (mode === 'pixel') {
              fill = pixelColor(v);
            } else if (mode === 'coeff') {
              fill = coeffColor(v, maxAbs);
            } else {
              fill = levelColor(v, maxAbs);
            }
            ctx.fillStyle = fill;
            ctx.fillRect(x, y, cellW, cellH);

            // Cell border (subtle)
            ctx.strokeStyle = alpha(CHART.dim, 0.3);
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x + 0.25, y + 0.25, cellW - 0.5, cellH - 0.5);

            // DC highlight (pink border, top-left cell)
            if (highlightDc && r === 0 && c === 0) {
              ctx.strokeStyle = CHART.pink;
              ctx.lineWidth = 1.5;
              ctx.strokeRect(x + 0.75, y + 0.75, cellW - 1.5, cellH - 1.5);
            }

            // Value label
            const shouldLabel =
              mode === 'pixel' ||
              mode === 'level' ||
              (mode === 'coeff' && r === 0 && c === 0); // DC only for coeff mode

            if (shouldLabel && cellW > 18 && cellH > 12) {
              const label =
                mode === 'pixel'
                  ? Math.round(v).toString()
                  : mode === 'level'
                    ? v.toString()
                    : Math.round(v).toString(); // DC coefficient value
              ctx.font = `bold ${Math.max(7, Math.min(9, cellW * 0.38))}px var(--mono)`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              // Choose text colour for contrast against fill
              const brightness = mode === 'pixel' ? v / 255 : 0;
              ctx.fillStyle = brightness > 0.55 ? CHART.bgDeep : CHART.text;
              ctx.fillText(label, x + cellW / 2, y + cellH / 2);
            }
          }
        }

        // ── Caption (bottom of canvas) ───────────────────────────────────────
        ctx.font = `10px var(--font)`;
        ctx.fillStyle = CHART.dim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(title, w / 2, h - 1);

        ctx.restore();
      }}
    />
  );
}

// ── QuantTablePanel ──────────────────────────────────────────────────────────

export interface QuantTablePanelProps {
  /** Scaled 8×8 JPEG luminance quantization table (from scaleQuantTable). */
  qTable: number[][];
}

/**
 * Heatmap of the scaled JPEG quantization table Q(u,v).
 * Higher step sizes (coarser quantization) appear brighter orange; DC
 * entry (top-left, usually smallest) is highlighted in pink.
 */
export function QuantTablePanel({ qTable }: QuantTablePanelProps) {
  return (
    <BlockHeatmap
      block={qTable}
      title="Q-table (step sizes)"
      mode="level"
      highlightDc
    />
  );
}

// ── ZigzagOverlay ────────────────────────────────────────────────────────────

export interface ZigzagPanelProps {
  /** Height of the canvas (default 200). */
  height?: number;
}

/**
 * Draws the JPEG zig-zag scan order as a grid showing scan indices 0–63
 * in each cell (Fig. 7.27), with a connecting polyline in green.
 * Useful for visualising how DC/low-frequency coefficients are read first.
 */
export function ZigzagPanel({ height = 200 }: ZigzagPanelProps) {
  const order = zigzagOrder();

  // Build index → scan position map
  const scanIndex: number[][] = Array.from({ length: CELL }, () =>
    new Array<number>(CELL).fill(0),
  );
  order.forEach(([r, c], idx) => {
    scanIndex[r][c] = idx;
  });

  return (
    <Canvas
      height={height}
      ariaLabel="JPEG zig-zag scan order — scan indices 0–63 in each 8×8 cell"
      deps={[]}
      draw={(ctx, w, h) => {
        const areaW = w - PAD.l - PAD.r;
        const areaH = h - PAD.t - PAD.b;
        const cellW = areaW / CELL;
        const cellH = areaH / CELL;

        ctx.save();

        // ── Column/row index ticks ───────────────────────────────────────────
        ctx.font = `9px var(--mono)`;
        ctx.fillStyle = CHART.dim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < CELL; i++) {
          ctx.fillText(String(i), PAD.l + (i + 0.5) * cellW, PAD.t / 2);
          ctx.fillText(String(i), PAD.l / 2, PAD.t + (i + 0.5) * cellH);
        }

        // ── Cell fills and scan-index labels ────────────────────────────────
        for (let r = 0; r < CELL; r++) {
          for (let c = 0; c < CELL; c++) {
            const idx = scanIndex[r][c];
            const x = PAD.l + c * cellW;
            const y = PAD.t + r * cellH;
            const t = idx / 63;

            // Color: bgDeep (DC=0) → dim (high freq)
            ctx.fillStyle = lerpColor(CHART.green, CHART.bgDeep, t * 0.85);
            ctx.fillRect(x, y, cellW, cellH);

            // Cell border
            ctx.strokeStyle = alpha(CHART.dim, 0.3);
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x + 0.25, y + 0.25, cellW - 0.5, cellH - 0.5);

            // DC cell highlight
            if (r === 0 && c === 0) {
              ctx.strokeStyle = CHART.pink;
              ctx.lineWidth = 1.5;
              ctx.strokeRect(x + 0.75, y + 0.75, cellW - 1.5, cellH - 1.5);
            }

            // Scan index number
            ctx.font = `bold ${Math.max(7, Math.min(9, cellW * 0.38))}px var(--mono)`;
            ctx.fillStyle = idx < 20 ? CHART.bgDeep : CHART.text;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(idx), x + cellW / 2, y + cellH / 2);
          }
        }

        // ── Zig-zag connecting polyline ──────────────────────────────────────
        ctx.beginPath();
        order.forEach(([r, c], idx) => {
          const cx = PAD.l + (c + 0.5) * cellW;
          const cy = PAD.t + (r + 0.5) * cellH;
          if (idx === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        });
        ctx.strokeStyle = alpha(CHART.pink, 0.5);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Caption
        ctx.font = `10px var(--font)`;
        ctx.fillStyle = CHART.dim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('Zig-zag scan order', w / 2, h - 1);

        ctx.restore();
      }}
    />
  );
}
