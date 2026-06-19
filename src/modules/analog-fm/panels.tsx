import { Canvas } from '@/lib/plot/Canvas';
import {
  linScale,
  drawLine,
  drawStems,
  drawVLine,
  drawAxes,
  drawText,
  shadeRegion,
  type Axes,
} from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { HintText } from '@/components';
import { t } from '@/i18n';
import { besselJ } from '@/lib/dsp/analog';
import type { AnalogFmView, AnalogDemodView, FmReprView, FmSpectrumView, FmDemodView, FmPllView } from './model';

const PAD = { l: 48, r: 20, t: 20, b: 44 };

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

/** Small KaTeX-aware plot title (mirrors .analog__plot-title in analog-am). */
function PlotTitle({ textKey }: { textKey: string }) {
  return (
    <div className="analog__plot-title">
      <HintText text={t(textKey)} />
    </div>
  );
}

/**
 * Representation panel (§4.1): message, FM/PM waveform (with NBFM overlay in the
 * narrowband regime) and instantaneous frequency (FM) / phase (PM). One shared
 * time-axis zoom/pan drives all three canvases.
 */
export function FmReprPanel({ view }: { view: FmReprView }) {
  const t0 = view.time[0];
  const t1 = view.time[view.time.length - 1];
  const span = t1 - t0 || 1;
  const [tLo, tHi, onWheel, , onPan] = useZoom(t0, t1, {
    minSpan: span / 8,
    maxSpan: span,
    clampMin: t0,
    clampMax: t1,
  });
  const ms = (v: number) => (v * 1000).toFixed(1);

  const fc = (view.fiMin + view.fiMax) / 2;
  const isFm = view.mode === 'fm';

  const drawMessage = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
      y: linScale([-1.2, 1.2], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [tLo, tHi], {
      xLabel: '$t\\,(\\mathrm{ms})$',
      yLabel: '$m(t)$',
      domainY: [-1.2, 1.2],
      xTickFormat: ms,
    });
    drawLine(ctx, ax, view.time, view.message, CHART.green, 2);
  };

  const drawSignal = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const amp = Math.max(...view.modulated.map(Math.abs), 0.1) * 1.18;
    const ax: Axes = {
      x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
      y: linScale([-amp, amp], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [tLo, tHi], {
      xLabel: '$t\\,(\\mathrm{ms})$',
      yLabel: '$u(t)\\,(\\mathrm{V})$',
      domainY: [-amp, amp],
      xTickFormat: ms,
    });
    if (view.isNbfm) drawLine(ctx, ax, view.time, view.nbfm, CHART.orange, 1.5, true);
    drawLine(ctx, ax, view.time, view.modulated, CHART.blue, 1.6);
  };

  const drawInst = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (isFm) {
      const pad = Math.max(view.deltaF * 0.12, 1);
      const lo = view.fiMin - pad;
      const hi = view.fiMax + pad;
      const ax: Axes = {
        x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
        y: linScale([lo, hi], [h - PAD.b, PAD.t]),
      };
      drawAxes(ctx, ax, [tLo, tHi], {
        xLabel: '$t\\,(\\mathrm{ms})$',
        yLabel: '$f_i\\,(\\mathrm{kHz})$',
        domainY: [lo, hi],
        xTickFormat: ms,
        yTickFormat: (v) => (v / 1000).toFixed(1),
      });
      drawLine(ctx, ax, [tLo, tHi], [fc, fc], CHART.dim, 1, true); // f_c reference
      drawLine(ctx, ax, view.time, view.instFreq, CHART.orange, 2);
    } else {
      const amp = Math.max(...view.instPhase.map(Math.abs), 0.1) * 1.2;
      const ax: Axes = {
        x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
        y: linScale([-amp, amp], [h - PAD.b, PAD.t]),
      };
      drawAxes(ctx, ax, [tLo, tHi], {
        xLabel: '$t\\,(\\mathrm{ms})$',
        yLabel: '$\\theta(t)\\,(\\mathrm{rad})$',
        domainY: [-amp, amp],
        xTickFormat: ms,
      });
      drawLine(ctx, ax, view.time, view.instPhase, CHART.orange, 2);
    }
  };

  return (
    <div className="analog__fm-panel">
      <div className="analog__panel-third">
        <PlotTitle textKey="analog.fm.plot.message" />
        <Canvas height={180} draw={drawMessage} deps={[view, tLo, tHi]} ariaLabel="Message m(t)" onWheel={onWheel} onPan={onPan} />
      </div>
      <div className="analog__panel-third">
        <PlotTitle textKey={isFm ? 'analog.fm.plot.signalFm' : 'analog.fm.plot.signalPm'} />
        <Canvas height={180} draw={drawSignal} deps={[view, tLo, tHi]} ariaLabel="Angle-modulated signal u(t)" onWheel={onWheel} onPan={onPan} />
        {view.isNbfm && (
          <div className="analog__legend">
            <span className="analog__legend__item" style={{ color: CHART.blue }}>
              <span className="analog__legend__swatch" />
              {t('analog.fm.trace.exact')}
            </span>
            <span className="analog__legend__item" style={{ color: CHART.orange }}>
              <span className="analog__legend__swatch analog__legend__swatch--dashed" />
              {t('analog.fm.trace.nbfm')}
            </span>
          </div>
        )}
      </div>
      <div className="analog__panel-third">
        <PlotTitle textKey={isFm ? 'analog.fm.plot.instFreq' : 'analog.fm.plot.instPhase'} />
        <Canvas height={180} draw={drawInst} deps={[view, tLo, tHi]} ariaLabel={isFm ? 'Instantaneous frequency' : 'Instantaneous phase'} onWheel={onWheel} onPan={onPan} />
      </div>
    </div>
  );
}

/**
 * Spectrum panel (§4.2): tone Bessel line spectrum or arbitrary-message magnitude
 * spectrum, with the Carson bandwidth band shaded and its edges marked.
 */
export function FmSpectrumPanel({ view }: { view: FmSpectrumView }) {
  const margin = view.carsonBw * 0.6 + 1;
  const f0 = Math.max(0, view.carsonLo - margin);
  const f1 = view.carsonHi + margin;
  const fspan = f1 - f0 || 1;
  const [fLo, fHi, onWheel, , onPan] = useZoom(f0, f1, {
    minSpan: fspan / 12,
    maxSpan: fspan * 1.5,
    clampMin: 0,
  });
  const kHz = (v: number) => (v / 1000).toFixed(v >= 1e6 ? 1 : 0);

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const mags = view.isTone ? view.sidebandMags : view.fftMags;
    const maxMag = Math.max(...mags, 1e-6) * 1.18;
    const ax: Axes = {
      x: linScale([fLo, fHi], [PAD.l, w - PAD.r]),
      y: linScale([0, maxMag], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [fLo, fHi], {
      xLabel: '$f\\,(\\mathrm{kHz})$',
      yLabel: view.isTone ? '$A_c\\,|J_n(\\beta)|$' : '$|U(f)|$',
      domainY: [0, maxMag],
      xTickFormat: kHz,
      tickCount: 10,
    });
    shadeRegion(ctx, ax, view.carsonLo, view.carsonHi, 0, maxMag, alpha(CHART.blue, 0.1));
    drawVLine(ctx, ax, view.carsonLo, 0, maxMag, CHART.pink, true, 1);
    drawVLine(ctx, ax, view.carsonHi, 0, maxMag, CHART.pink, true, 1);
    if (view.isTone) {
      drawStems(ctx, ax, view.sidebandFreqs, view.sidebandMags, CHART.blue, 3);
    } else {
      drawLine(ctx, ax, view.fftFreqs, view.fftMags, CHART.blue, 1.5);
    }
  };

  return (
    <div className="analog__panel-half">
      <PlotTitle textKey={view.isTone ? 'analog.fm.spectrum.plotBessel' : 'analog.fm.spectrum.plotFft'} />
      <Canvas height={300} draw={draw} deps={[view, fLo, fHi]} ariaLabel="FM magnitude spectrum" onWheel={onWheel} onPan={onPan} />
      <div className="analog__legend">
        <span className="analog__legend__item" style={{ color: CHART.pink }}>
          <span className="analog__legend__swatch analog__legend__swatch--dashed" />
          {t('analog.fm.spectrum.trace.carson')}
        </span>
      </div>
      <p className="analog__hint analog__hint--note">
        <HintText text={t('analog.fm.spectrum.carsonNote')} />
      </p>
    </div>
  );
}

// ─── Bessel curves panel ──────────────────────────────────────────────────────

const N_BESSEL = 8;
const BETA_AXIS_MAX = 10;
const BESSEL_N_PTS = 201;

// Precomputed once at module load — β axis + curves for J_0..J_7
const BETAS = Array.from({ length: BESSEL_N_PTS }, (_, i) => (i / (BESSEL_N_PTS - 1)) * BETA_AXIS_MAX);
const BESSEL_CURVES = Array.from({ length: N_BESSEL }, (_, n) => BETAS.map((b) => besselJ(n, b)));

// Returns a theme-aware color for order n; called inside draw callbacks so CHART proxy resolves live.
function besselColor(n: number): string {
  const base = [CHART.green, CHART.orange, CHART.blue, CHART.pink, CHART.cyan, CHART.red];
  return n < 6 ? base[n] : alpha(base[n - 6], 0.55);
}

/**
 * Bessel curves panel: J_0(β)..J_7(β) plotted over β ∈ [0, 10].
 * Draws a live vertical marker at the current β value from the slider.
 * Proakis & Salehi Fig. 4.13 (§4.2.1).
 */
export function BesselCurvesPanel({ beta }: { beta: number }) {
  const [bLo, bHi, onWheel, , onPan] = useZoom(0, BETA_AXIS_MAX, {
    minSpan: 1,
    maxSpan: BETA_AXIS_MAX,
    clampMin: 0,
    clampMax: BETA_AXIS_MAX,
  });

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const yLo = -0.65;
    const yHi = 1.08;
    const ax: Axes = {
      x: linScale([bLo, bHi], [PAD.l, w - PAD.r]),
      y: linScale([yLo, yHi], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [bLo, bHi], {
      xLabel: '$\\beta$',
      yLabel: '$J_n(\\beta)$',
      domainY: [yLo, yHi],
    });
    for (let n = 0; n < N_BESSEL; n++) {
      drawLine(ctx, ax, BETAS, BESSEL_CURVES[n], besselColor(n), n < 6 ? 2 : 1.5);
    }
    // Live β marker
    drawVLine(ctx, ax, beta, yLo, yHi, alpha(CHART.pink, 0.7), true, 1.5);
  };

  return (
    <div>
      <PlotTitle textKey="analog.fm.spectrum.besselCurves" />
      <Canvas
        height={240}
        draw={draw}
        deps={[bLo, bHi, beta]}
        ariaLabel="Bessel functions J_n(β) for n = 0 to 7"
        onWheel={onWheel}
        onPan={onPan}
      />
      <div className="analog__legend">
        {Array.from({ length: N_BESSEL }, (_, n) => (
          <span key={n} className="analog__legend__item" style={{ color: besselColor(n) }}>
            <span className="analog__legend__swatch" />
            <HintText text={`$J_{${n}}(\\beta)$`} />
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── FM Discriminator simulation panel (§4.3.2) ───────────────────────────────

/**
 * PLL FM demodulator simulation panel. (§4.3.3, Fig. 4.14)
 * Canvas 1: original m(t) vs PLL-recovered m̂(t) — shows demodulation quality.
 * Canvas 2: phase error e(t) — shows PLL lock-in transient decaying to steady state.
 */
export function FmPllPanel({ view }: { view: FmPllView }) {
  const t0 = view.time[0];
  const t1 = view.time[view.time.length - 1];
  const span = t1 - t0 || 1;
  const [tLo, tHi, onWheel, , onPan] = useZoom(t0, t1, {
    minSpan: span / 8,
    maxSpan: span,
    clampMin: t0,
    clampMax: t1,
  });

  const ms = (v: number) => (v * 1000).toFixed(1);

  const drawRecov = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
      y: linScale([-1.35, 1.35], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [tLo, tHi], {
      xLabel: '$t\\,(\\mathrm{ms})$',
      yLabel: '$m(t)$',
      domainY: [-1.35, 1.35],
      xTickFormat: ms,
    });
    drawLine(ctx, ax, view.time, view.original, CHART.green, 2);
    drawLine(ctx, ax, view.time, view.recovered, CHART.blue, 1.8, true);
  };

  const drawPe = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
      y: linScale([-1.35, 1.35], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [tLo, tHi], {
      xLabel: '$t\\,(\\mathrm{ms})$',
      yLabel: '$e(t)$',
      domainY: [-1.35, 1.35],
      xTickFormat: ms,
    });
    drawLine(ctx, ax, view.time, view.phaseError, CHART.orange, 1.8);
  };

  return (
    <div>
      <PlotTitle textKey="analog.fm.moddemod.panel.pll" />
      <Canvas
        height={220}
        draw={drawRecov}
        deps={[view, tLo, tHi]}
        ariaLabel="PLL FM demodulator: original vs recovered message"
        onWheel={onWheel}
        onPan={onPan}
      />
      <div className="analog__legend">
        <span className="analog__legend__item" style={{ color: CHART.green }}>
          <span className="analog__legend__swatch" />
          <HintText text={t('analog.fm.moddemod.trace.original')} />
        </span>
        <span className="analog__legend__item" style={{ color: CHART.blue }}>
          <span className="analog__legend__swatch analog__legend__swatch--dashed" />
          <HintText text={t('analog.fm.moddemod.trace.pllRecovered')} />
        </span>
      </div>
      <div style={{ marginTop: 12 }}>
        <PlotTitle textKey="analog.fm.moddemod.panel.pllPhaseError" />
      </div>
      <Canvas
        height={140}
        draw={drawPe}
        deps={[view, tLo, tHi]}
        ariaLabel="PLL phase error convergence"
        onWheel={onWheel}
        onPan={onPan}
      />
      <div className="analog__legend">
        <span className="analog__legend__item" style={{ color: CHART.orange }}>
          <span className="analog__legend__swatch" />
          <HintText text={t('analog.fm.moddemod.trace.phaseError')} />
        </span>
      </div>
    </div>
  );
}

/**
 * FM discriminator simulation panel. Shows original m(t) vs recovered m̂(t)
 * with an animated sweep cursor driven by `clock`.
 * Proakis & Salehi §4.3.2, Eq. 4.3.12.
 */
export function FmDiscrimPanel({ view }: { view: FmDemodView }) {
  const t0 = view.time[0];
  const t1 = view.time[view.time.length - 1];
  const span = t1 - t0 || 1;
  const [tLo, tHi, onWheel, , onPan] = useZoom(t0, t1, {
    minSpan: span / 8,
    maxSpan: span,
    clampMin: t0,
    clampMax: t1,
  });

  const ms = (v: number) => (v * 1000).toFixed(1);

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ax: Axes = {
      x: linScale([tLo, tHi], [PAD.l, w - PAD.r]),
      y: linScale([-1.35, 1.35], [h - PAD.b, PAD.t]),
    };
    drawAxes(ctx, ax, [tLo, tHi], {
      xLabel: '$t\\,(\\mathrm{ms})$',
      yLabel: '$m(t)$',
      domainY: [-1.35, 1.35],
      xTickFormat: ms,
    });
    // Original m(t) — green solid
    drawLine(ctx, ax, view.time, view.original, CHART.green, 2);
    // Recovered m̂(t) — blue dashed
    drawLine(ctx, ax, view.time, view.recovered, CHART.blue, 1.8, true);
  };

  return (
    <div>
      <PlotTitle textKey="analog.fm.moddemod.panel.discrim" />
      <Canvas
        height={220}
        draw={draw}
        deps={[view, tLo, tHi]}
        ariaLabel="FM discriminator: original vs recovered message"
        onWheel={onWheel}
        onPan={onPan}
      />
      <div className="analog__legend">
        <span className="analog__legend__item" style={{ color: CHART.green }}>
          <span className="analog__legend__swatch" />
          <HintText text={t('analog.fm.moddemod.trace.original')} />
        </span>
        <span className="analog__legend__item" style={{ color: CHART.blue }}>
          <span className="analog__legend__swatch analog__legend__swatch--dashed" />
          <HintText text={t('analog.fm.moddemod.trace.recovered')} />
        </span>
      </div>
    </div>
  );
}
