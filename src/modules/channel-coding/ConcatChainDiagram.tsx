import { Canvas } from '@/lib/plot/Canvas';
import { CHART } from '@/lib/plot/colors';

const TOP = ['data', 'RS(15,11)\nencode', 'inter-\nleave', 'conv(2,1,3)\nencode'];
const BOT = ['Viterbi\ndecode', 'de-inter-\nleave', 'RS(15,11)\ndecode', 'data'];

function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = CHART.text;
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = label.split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * 12);
  });
}

function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.strokeStyle = CHART.dim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 6 * Math.cos(a - 0.4), y2 - 6 * Math.sin(a - 0.4));
  ctx.lineTo(x2 - 6 * Math.cos(a + 0.4), y2 - 6 * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fillStyle = CHART.dim;
  ctx.fill();
}

function drawChain(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const bw = Math.min(96, (w - 40) / 4 - 12);
  const bh = 40;
  const gap = (w - 20 - 4 * bw) / 3;
  const yTop = 20;
  const yBot = h - 20 - bh;
  const xs = [0, 1, 2, 3].map((i) => 10 + i * (bw + gap));
  // top row (encode path): outer green, inner blue
  TOP.forEach((label, i) => {
    const color = i === 1 ? CHART.green : i === 3 ? CHART.blue : CHART.dim;
    box(ctx, xs[i], yTop, bw, bh, label, color);
    if (i > 0) arrow(ctx, xs[i - 1] + bw, yTop + bh / 2, xs[i], yTop + bh / 2);
  });
  // channel bridge from the end of the encode path down to the decode path
  ctx.fillStyle = CHART.orange;
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AWGN channel', xs[3] + bw / 2, (yTop + bh + yBot) / 2);
  arrow(ctx, xs[3] + bw / 2, yTop + bh, xs[3] + bw / 2, yBot);
  // bottom row (decode path), laid out right-to-left
  BOT.forEach((label, i) => {
    const color = i === 0 ? CHART.blue : i === 2 ? CHART.green : CHART.dim;
    const x = xs[3 - i];
    box(ctx, x, yBot, bw, bh, label, color);
    if (i > 0) arrow(ctx, xs[3 - i + 1], yBot + bh / 2, x + bw, yBot + bh / 2);
  });
}

export function ConcatChainDiagram() {
  return (
    <Canvas
      height={150}
      ariaLabel="Concatenated coding chain block diagram"
      deps={[]}
      draw={(ctx, w, h) => drawChain(ctx, w, h)}
    />
  );
}
