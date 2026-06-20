import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
import { useZoom } from '@/lib/plot/useZoom';
import {
  muLawCompress,
  aLawCompress,
  sqnrVsAmplitude,
  type CompandingLaw,
} from '@/lib/dsp/companding';

const COL = {
  curve: '#46c93a', // selected law
  uniform: '#ffb454', // uniform reference
  ref: 'rgba(154,167,180,0.35)', // identity diagonal
};

// Room for tick labels + LaTeX axis labels.
const PAD = { l: 48, r: 18, t: 16, b: 40 };

function axesFor(w: number, h: number, domX: [number, number], domY: [number, number]): Axes {
  return { x: linScale(domX, [PAD.l, w - PAD.r]), y: linScale(domY, [h - PAD.b, PAD.t]) };
}

const N = 256;

/** Compander transfer curve g(x) over x ∈ [-1,1] (diagonal when 'none'). */
export function CompanderCurvePanel({ law, param }: { law: CompandingLaw; param: number }) {
  const xs = Array.from({ length: N }, (_, i) => -1 + (2 * i) / (N - 1));
  const ys = xs.map((x) =>
    law === 'mu' ? muLawCompress(x, param) : law === 'A' ? aLawCompress(x, param) : x,
  );
  // Self-owned zoom over the fixed compander domain [-1, 1].
  const [lo, hi, onWheel, , onPan] = useZoom(-1, 1, { minSpan: 0.1, maxSpan: 2 });
  return (
    <Canvas
      height={220}
      ariaLabel="Compander curve g(x)"
      deps={[law, param, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [-1, 1]);
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$x$', yLabel: '$g(x)$' });
        drawLine(ctx, ax, [-1, 1], [-1, 1], COL.ref, 1); // identity reference
        drawLine(ctx, ax, xs, ys, COL.curve, 2);
      }}
    />
  );
}

/** SQNR (dB) vs sinusoid amplitude (log10 x-axis): selected law vs uniform. */
export function SqnrAmpPanel({
  law,
  param,
  bits,
}: {
  law: CompandingLaw;
  param: number;
  bits: number;
}) {
  const amps = Array.from({ length: 40 }, (_, i) => 0.005 * Math.pow(2, i / 5)); // 0.005 … ~1
  const lx = amps.map((a) => Math.log10(a));
  const sel = sqnrVsAmplitude(amps, bits, law, param);
  const uni = sqnrVsAmplitude(amps, bits, 'none', 0);
  const finite = [...sel, ...uni].filter((v) => Number.isFinite(v));
  const yMax = finite.length ? Math.max(...finite) * 1.1 : 1;
  // x-domain is static (derived from constant amps array, not from bits/law).
  const x0 = lx[0];
  const x1 = lx[lx.length - 1];
  // Self-owned zoom over the log10-amplitude axis.
  const [lo, hi, onWheel, , onPan] = useZoom(x0, x1, {
    minSpan: 0.3,
    maxSpan: (x1 - x0) * 4,
  });
  return (
    <Canvas
      height={220}
      ariaLabel="SQNR versus input amplitude"
      deps={[law, param, bits, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [lo, hi], [0, yMax]);
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$\\log_{10} A$',
          yLabel: '$\\mathrm{SQNR}\\,(\\mathrm{dB})$',
        });
        drawLine(ctx, ax, lx, uni, COL.uniform, 2); // uniform reference
        if (law !== 'none') drawLine(ctx, ax, lx, sel, COL.curve, 2); // companded
      }}
    />
  );
}
