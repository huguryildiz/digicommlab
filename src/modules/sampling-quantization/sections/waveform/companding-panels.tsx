import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, type Axes } from '@/lib/plot/draw';
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

const PAD = { l: 8, r: 8, t: 10, b: 10 };

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
  return (
    <Canvas
      height={220}
      ariaLabel="Compander curve g(x)"
      deps={[law, param]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [-1, 1], [-1, 1]);
        drawAxes(ctx, ax, [-1, 1]);
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
  const x0 = lx[0];
  const x1 = lx[lx.length - 1];
  return (
    <Canvas
      height={220}
      ariaLabel="SQNR versus input amplitude"
      deps={[law, param, bits]}
      draw={(ctx, w, h) => {
        const ax = axesFor(w, h, [x0, x1], [0, yMax]);
        drawAxes(ctx, ax, [x0, x1]);
        drawLine(ctx, ax, lx, uni, COL.uniform, 2); // uniform reference
        if (law !== 'none') drawLine(ctx, ax, lx, sel, COL.curve, 2); // companded
      }}
    />
  );
}
