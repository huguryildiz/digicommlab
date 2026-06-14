import { Canvas } from '@/lib/plot/Canvas';
import {
  linScale,
  drawLine,
  drawStems,
  drawVLine,
  drawAxes,
  drawText,
  type Axes,
} from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import type { AnalogFmView, AnalogDemodView } from './model';

const PAD = { l: 40, r: 20, t: 20, b: 40 };

/**
 * FM/PM Modulator panel: constant-envelope + instantaneous frequency + Bessel spectrum.
 */
export function FmModulatorPanel({ view }: { view: AnalogFmView }) {
  const drawModulated = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const minVal = Math.min(...view.modulated) * 1.1;
    const maxVal = Math.max(...view.modulated) * 1.1;

    const ax: Axes = {
      x: linScale([view.time[0], view.time[view.time.length - 1]], [PAD.l, w - PAD.r]),
      y: linScale([minVal, maxVal], [h - PAD.b, PAD.t]),
    };

    drawAxes(ctx, ax, [view.time[0], view.time[view.time.length - 1]]);

    // Modulated signal with varying phase
    ctx.strokeStyle = CHART.blue;
    drawLine(ctx, ax, view.time, view.modulated, CHART.blue, 1.5);

    // Message envelope (scaled for visibility)
    const msgScaled = view.message.map((m) => (m * (maxVal - minVal)) / 2);
    ctx.strokeStyle = CHART.green;
    drawLine(ctx, ax, view.time, msgScaled, CHART.green, 2);

    drawText(ctx, ax, view.time[view.time.length - 1], minVal, 't (s)', CHART.dim, 0, 10);
    drawText(ctx, ax, view.time[0], maxVal, 'u(t)', CHART.dim, -30, -5);
  };

  const drawInstFreq = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const minFreq = Math.min(...view.instantFreq) * 0.95;
    const maxFreq = Math.max(...view.instantFreq) * 1.05;

    const ax: Axes = {
      x: linScale([view.time[0], view.time[view.time.length - 1]], [PAD.l, w - PAD.r]),
      y: linScale([minFreq, maxFreq], [h - PAD.b, PAD.t]),
    };

    drawAxes(ctx, ax, [view.time[0], view.time[view.time.length - 1]]);

    // Instantaneous frequency
    ctx.strokeStyle = CHART.orange;
    drawLine(ctx, ax, view.time, view.instantFreq, CHART.orange, 2);

    drawText(ctx, ax, view.time[view.time.length - 1], minFreq, 't (s)', CHART.dim, 0, 10);
    drawText(ctx, ax, view.time[0], maxFreq, 'fᵢ(t)', CHART.dim, -40, -5);
  };

  const drawBessel = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (view.sidebandFreqs.length === 0) return;

    const minFreq = Math.min(...view.sidebandFreqs) - 2000;
    const maxFreq = Math.max(...view.sidebandFreqs) + 2000;
    const maxMag = Math.max(...view.sidebandMags, 0.5) * 1.2;

    const ax: Axes = {
      x: linScale([minFreq, maxFreq], [PAD.l, w - PAD.r]),
      y: linScale([0, maxMag], [h - PAD.b, PAD.t]),
    };

    drawAxes(ctx, ax, [minFreq, maxFreq]);

    // Bessel sidebands
    ctx.strokeStyle = CHART.blue;
    ctx.fillStyle = CHART.blue;
    drawStems(ctx, ax, view.sidebandFreqs, view.sidebandMags, CHART.blue, 2);

    // Carson bandwidth marker
    drawVLine(ctx, ax, view.sidebandFreqs[0], 0, maxMag, CHART.pink, true, 1);
    drawVLine(
      ctx,
      ax,
      view.sidebandFreqs[view.sidebandFreqs.length - 1],
      0,
      maxMag,
      CHART.pink,
      true,
      1,
    );

    drawText(ctx, ax, maxFreq, 0, 'f (Hz)', CHART.dim, -30, 10);
    drawText(ctx, ax, minFreq, maxMag, '|Jₙ(β)|', CHART.dim, -40, -5);
  };

  return (
    <div className="analog__fm-panel">
      <div className="analog__panel-third">
        <div className="analog__label">FM/PM Waveform</div>
        <Canvas
          height={160}
          draw={drawModulated}
          deps={[view]}
          ariaLabel="FM/PM modulated signal"
        />
      </div>
      <div className="analog__panel-third">
        <div className="analog__label">{t('analog.fm.instantFreq')}</div>
        <Canvas
          height={160}
          draw={drawInstFreq}
          deps={[view]}
          ariaLabel="Instantaneous frequency"
        />
      </div>
      <div className="analog__panel-third">
        <div className="analog__label">{t('analog.fm.spectrum')}</div>
        <Canvas height={160} draw={drawBessel} deps={[view]} ariaLabel="Bessel sidebands" />
      </div>
    </div>
  );
}

/**
 * FM demodulation panel: recovered message vs original (discriminator).
 */
export function FmDemodulationPanel({ view }: { view: AnalogDemodView }) {
  const drawRecovery = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const all = [...view.original, ...view.recovered];
    const lo = Math.min(...all) * 1.1 - 0.05;
    const hi = Math.max(...all) * 1.1 + 0.05;
    const ax: Axes = {
      x: linScale([view.time[0], view.time[view.time.length - 1]], [PAD.l, w - PAD.r]),
      y: linScale([lo, hi], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [view.time[0], view.time[view.time.length - 1]]);
    drawLine(ctx, ax, view.time, view.original, CHART.green, 2);
    drawLine(ctx, ax, view.time, view.recovered, CHART.blue, 1.8);
    drawText(ctx, ax, view.time[view.time.length - 1], lo, 't (s)', CHART.dim, -30, 12);
    drawText(ctx, ax, view.time[0], hi, 'm(t)', CHART.dim, -30, -5);
  };

  return (
    <div className="analog__demod-panel">
      <div className="analog__panel-half">
        <div className="analog__label">{t('analog.demod.recovered')}</div>
        <Canvas
          height={200}
          draw={drawRecovery}
          deps={[view]}
          ariaLabel={t('analog.demod.recovered')}
        />
      </div>
    </div>
  );
}
