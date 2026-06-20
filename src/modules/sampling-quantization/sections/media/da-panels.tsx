// Digital Audio panel components — Proakis §7.6
// Panels: BitstreamPanel, ReconstructionPanel, NoisePsdPanel, TdmHierarchyDiagram
// Non-component utilities (computeErrorPsd) live in da-utils.ts for react-refresh.
import '@/lib/plot/schematic.css';
import { Schematic, Block, Wire, Arrowhead, Label } from '@/lib/plot/schematic';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawStep } from '@/lib/plot/draw';
import { useZoom } from '@/lib/plot/useZoom';
import { CHART, alpha } from '@/lib/plot/colors';
import type { DsLevel } from '@/lib/dsp/tdm';

const PAD = { l: 48, r: 18, t: 16, b: 40 };

function axesFor(
  w: number,
  h: number,
  domX: [number, number],
  domY: [number, number],
) {
  return {
    x: linScale(domX, [PAD.l, w - PAD.r]),
    y: linScale(domY, [h - PAD.b, PAD.t]),
  };
}

// ── A. BitstreamPanel ─────────────────────────────────────────────────────────

export interface BitstreamPanelProps {
  /** Oversampled analog input x[n] (normalized, same length as bits) */
  analog: number[];
  /** Σ-Δ output bits (±1) */
  bits: number[];
}

export function BitstreamPanel({ analog, bits }: BitstreamPanelProps) {
  const N = Math.max(analog.length, bits.length, 1);
  const [lo, hi, onWheel, , onPan] = useZoom(0, N - 1, {
    minSpan: 16,
    maxSpan: N - 1,
  });

  const xs = analog.map((_, i) => i);
  const allVals = [...analog, ...bits];
  const yMax = Math.max(...allVals.map(Math.abs), 1.1) * 1.15;

  return (
    <Canvas
      height={200}
      ariaLabel="Σ-Δ bitstream vs oversampled analog input"
      deps={[analog, bits, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [-yMax, yMax]);
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$n$',
          yLabel: '$x[n],\\,y[n]$',
        });
        // Analog input as continuous line (blue)
        drawLine(ctx, ax, xs, analog, CHART.blue, 1.5);
        // Σ-Δ bits as step plot (green)
        drawStep(ctx, ax, xs, bits, alpha(CHART.green, 0.85), 1.5);

        // Legend
        const lx = w - PAD.r - 110;
        const ly = PAD.t + 10;
        ctx.save();
        ctx.font = '11px var(--font)';
        ctx.fillStyle = CHART.blue;
        ctx.fillRect(lx, ly, 18, 3);
        ctx.fillStyle = CHART.text;
        ctx.fillText('input', lx + 22, ly + 4);
        ctx.fillStyle = CHART.green;
        ctx.fillRect(lx, ly + 14, 18, 3);
        ctx.fillStyle = CHART.text;
        ctx.fillText('Σ−Δ bits', lx + 22, ly + 18);
        ctx.restore();
      }}
    />
  );
}

// ── B. ReconstructionPanel ────────────────────────────────────────────────────

export interface ReconstructionPanelProps {
  /** Oversampled analog input x[n] */
  analog: number[];
  /** Low-pass decoded reconstruction x̂[n] */
  reconstructed: number[];
}

export function ReconstructionPanel({ analog, reconstructed }: ReconstructionPanelProps) {
  const N = Math.max(analog.length, reconstructed.length, 1);
  const [lo, hi, onWheel, , onPan] = useZoom(0, N - 1, {
    minSpan: 16,
    maxSpan: N - 1,
  });

  const xs = analog.map((_, i) => i);
  const xsRec = reconstructed.map((_, i) => i);
  const allVals = [...analog, ...reconstructed];
  const yMax = Math.max(...allVals.map(Math.abs), 0.1) * 1.2;

  return (
    <Canvas
      height={200}
      ariaLabel="Σ-Δ reconstruction vs original analog input"
      deps={[analog, reconstructed, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [-yMax, yMax]);
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$n$',
          yLabel: '$\\hat{x}[n]$',
        });
        drawLine(ctx, ax, xs, analog, CHART.blue, 1.5);
        drawLine(ctx, ax, xsRec, reconstructed, CHART.green, 2);

        // Legend
        const lx = w - PAD.r - 126;
        const ly = PAD.t + 10;
        ctx.save();
        ctx.font = '11px var(--font)';
        ctx.fillStyle = CHART.blue;
        ctx.fillRect(lx, ly, 18, 3);
        ctx.fillStyle = CHART.text;
        ctx.fillText('input', lx + 22, ly + 4);
        ctx.fillStyle = CHART.green;
        ctx.fillRect(lx, ly + 14, 18, 3);
        ctx.fillStyle = CHART.text;
        ctx.fillText('reconstruction', lx + 22, ly + 18);
        ctx.restore();
      }}
    />
  );
}

// ── C. NoisePsdPanel ──────────────────────────────────────────────────────────

export interface NoisePsdPanelProps {
  /** Normalized frequencies [0 … 0.5] */
  freqNorm: number[];
  /** PSD in dB */
  noiseDb: number[];
}

export function NoisePsdPanel({ freqNorm, noiseDb }: NoisePsdPanelProps) {
  const [lo, hi, onWheel, , onPan] = useZoom(0, 0.5, {
    minSpan: 0.02,
    maxSpan: 0.5,
    clampMin: 0,
  });

  const finite = noiseDb.filter(isFinite);
  const dbMax = Math.max(...finite, -20) + 6;
  const dbMin = Math.min(...finite, -80) - 4;

  return (
    <Canvas
      height={200}
      ariaLabel="Σ-Δ quantization-error noise PSD — noise shaping"
      deps={[freqNorm, noiseDb, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [dbMin, dbMax]);
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$f/f_s$',
          yLabel: '$S_e(f)\\,(\\mathrm{dB})$',
        });
        drawLine(ctx, ax, freqNorm, noiseDb, CHART.orange, 2);

        // Label
        const lx = w - PAD.r - 120;
        const ly = PAD.t + 10;
        ctx.save();
        ctx.font = '11px var(--font)';
        ctx.fillStyle = CHART.orange;
        ctx.fillRect(lx, ly, 18, 3);
        ctx.fillStyle = CHART.text;
        ctx.fillText('error PSD', lx + 22, ly + 4);
        ctx.restore();
      }}
    />
  );
}

// ── D. TdmHierarchyDiagram ────────────────────────────────────────────────────

export interface TdmHierarchyDiagramProps {
  level: DsLevel;
}

// Block diagram: tributaries × [tributaryName] → [level.name] MUX → output

const DIAG_W = 400;
const DIAG_H = 140;
const BH = 28;

export function TdmHierarchyDiagram({ level }: TdmHierarchyDiagramProps) {
  // Show at most 4 tributary rows in the diagram; show "×N" label for higher counts
  const MAX_ROWS = 4;
  const showRows = Math.min(level.tributaries, MAX_ROWS);
  // Distribute rows evenly: use the diagram height split across rows
  const rowSpacing = Math.floor((DIAG_H - 20) / (showRows + 1));
  const muxCY = Math.floor(DIAG_H / 2);
  const MUX_X = 220;
  const MUX_W = 96;
  const TRIB_X = 10;
  const TRIB_W = 120;
  const OUT_X = MUX_X + MUX_W;

  const rateMbps = (level.rate / 1e6).toFixed(3);

  return (
    <div style={{ maxWidth: 720 }}>
      <Schematic
        width={DIAG_W}
        height={DIAG_H}
        ariaLabel={`${level.name} TDM multiplexer block diagram — ${level.tributaries} × ${level.tributaryName} → ${level.name}`}
      >
        {/* Tributary input boxes */}
        {Array.from({ length: showRows }, (_, i) => {
          const cy = Math.round(muxCY - ((showRows - 1) / 2 - i) * rowSpacing);
          return (
            <g key={i}>
              {/* cx label: first row is normal, last shown row gets a "… ×N" note */}
              <Block
                x={TRIB_X}
                y={cy - BH / 2}
                w={TRIB_W}
                h={BH}
                label={
                  i === showRows - 1 && level.tributaries > MAX_ROWS
                    ? `⋯ (${level.tributaries}×)`
                    : level.tributaryName
                }
              />
              <Wire
                points={[
                  TRIB_X + TRIB_W,
                  cy,
                  MUX_X - 6,
                  cy,
                  MUX_X - 6,
                  muxCY,
                ]}
              />
              <Arrowhead x={MUX_X - 4} y={muxCY} />
            </g>
          );
        })}

        {/* MUX block */}
        {/* cy=muxCY: block spans [muxCY-BH/2 … muxCY+BH/2] */}
        <Block
          x={MUX_X}
          y={muxCY - BH / 2}
          w={MUX_W}
          h={BH}
          label={`${level.name} MUX`}
        />

        {/* Output wire + labels */}
        <Wire points={[OUT_X, muxCY, DIAG_W - 10, muxCY]} />
        <Arrowhead x={DIAG_W - 8} y={muxCY} />
        <Label
          x={OUT_X + 18}
          y={muxCY - 8}
          text={`${rateMbps} Mbps`}
        />
        <Label
          x={OUT_X + 18}
          y={muxCY + 14}
          text={`${level.channels} ch`}
        />
      </Schematic>
    </div>
  );
}
