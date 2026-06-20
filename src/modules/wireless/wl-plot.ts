/**
 * Shared on-canvas plotting helpers for the wireless module sections.
 * Keeps the legend style consistent across every tab (see CLAUDE.md "Legend").
 */
import { CHART } from '@/lib/plot/colors';

/** Compact on-canvas legend, drawn top-right inside the plot area. */
export function drawLegend(
  ctx: CanvasRenderingContext2D,
  w: number,
  items: { color: string; label: string }[],
  topPad = 12,
  rightPad = 12,
): void {
  ctx.save();
  ctx.font = '11px var(--mono)';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let maxW = 0;
  for (const it of items) maxW = Math.max(maxW, ctx.measureText(it.label).width);
  const x = w - rightPad - (26 + maxW);
  let y = topPad + 8;
  for (const it of items) {
    ctx.strokeStyle = it.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 18, y);
    ctx.stroke();
    ctx.fillStyle = CHART.dim;
    ctx.fillText(it.label, x + 24, y);
    y += 15;
  }
  ctx.restore();
}
