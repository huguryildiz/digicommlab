import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawVLine, shadeRegion } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { DEFAULT_DOPPLER_PARAMS, deriveDoppler, type DopplerParams, type DopplerDerived } from '../doppler-model';
import { DopplerControls } from '../doppler-panels';
import { drawLegend } from '../wl-plot';

// ---------------------------------------------------------------------------
// Panel sub-components — each owns its own useZoom instance so that key={resetKey}
// on the section's panels triggers a full unmount/remount and resets zoom state.
// ---------------------------------------------------------------------------

/** Jakes U-shaped Doppler power spectrum S(f) vs frequency. */
function PsdPanel({ d }: { d: DopplerDerived }) {
  const fMax = d.fmHz || 1;
  // Two-sided spectrum: zoom over [−fMax, fMax].
  const [lo, hi, onWheel, , onPan] = useZoom(-fMax, fMax, {
    minSpan: fMax / 4,
    maxSpan: fMax * 2,
    clampMin: -fMax,
    clampMax: fMax,
  });
  return (
    <Canvas
      height={200}
      ariaLabel="U-shaped classical Doppler power spectrum"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const yMax = Math.max(...d.psdVal) * 1.05 || 1;
        const ax = {
          x: linScale([lo, hi], [40, w - 8]),
          y: linScale([0, yMax], [h - 28, 12]),
        };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$f\\,(\\mathrm{Hz})$',
          yLabel: '$S(f)$',
        });
        drawLine(ctx, ax, d.psdFreq, d.psdVal, CHART.blue, 2);
      }}
    />
  );
}

/** Rayleigh fading envelope (dB) vs time, with threshold shading. */
function EnvPanel({ d }: { d: DopplerDerived }) {
  const tMax = d.envTimeMs[d.envTimeMs.length - 1] || 1;
  const [lo, hi, onWheel, , onPan] = useZoom(0, tMax, {
    minSpan: tMax / 8,
    maxSpan: tMax,
    clampMin: 0,
    clampMax: tMax,
  });
  return (
    <Canvas
      height={220}
      ariaLabel="Rayleigh fading envelope versus time with fade intervals"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const yMin = -30;
        const yMax = 10;
        const ax = {
          x: linScale([lo, hi], [40, w - 8]),
          y: linScale([yMin, yMax], [h - 28, 12]),
        };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$t\\,(\\mathrm{ms})$',
          yLabel: '$|r(t)|\\,(\\mathrm{dB})$',
        });
        // Shade below-threshold fade intervals.
        for (let i = 1; i < d.envDb.length; i++) {
          if (d.envDb[i] < d.thresholdDb) {
            shadeRegion(ctx, ax, d.envTimeMs[i - 1], d.envTimeMs[i], yMin, d.thresholdDb, alpha(CHART.red, 0.22));
          }
        }
        // Dashed threshold line ρ across the whole time axis.
        drawLine(ctx, ax, [lo, hi], [d.thresholdDb, d.thresholdDb], CHART.red, 1.2, true);
        drawLine(ctx, ax, d.envTimeMs, d.envDb, CHART.green, 1.6);
        drawLegend(ctx, w, [
          { color: CHART.green, label: 'envelope' },
          { color: CHART.red, label: 'threshold ρ' },
        ]);
      }}
    />
  );
}

/** Autocorrelation R(τ) = J₀(2π f_m τ) with coherence-time marker. */
function AcfPanel({ d }: { d: DopplerDerived }) {
  const tMax = d.acfTauMs[d.acfTauMs.length - 1] || 1;
  const [lo, hi, onWheel, , onPan] = useZoom(0, tMax, {
    minSpan: tMax / 8,
    maxSpan: tMax,
    clampMin: 0,
    clampMax: tMax,
  });
  return (
    <Canvas
      height={180}
      ariaLabel="Doppler autocorrelation Bessel function with coherence-time marker"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = {
          x: linScale([lo, hi], [40, w - 8]),
          y: linScale([-0.5, 1], [h - 28, 12]),
        };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$\\tau\\,(\\mathrm{ms})$',
          yLabel: '$R(\\tau)$',
        });
        drawVLine(ctx, ax, d.coherenceTimeMs, -0.5, 1, CHART.orange, true);
        drawLine(ctx, ax, d.acfTauMs, d.acfVal, CHART.blue, 2);
        drawLegend(ctx, w, [
          { color: CHART.blue, label: 'J₀(2π f_m τ)' },
          { color: CHART.orange, label: 'T_ct' },
        ]);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export function DopplerSection() {
  const [params, setParams] = useState<DopplerParams>(DEFAULT_DOPPLER_PARAMS);
  // resetKey unmounts/remounts panel sub-components, reinitialising their useZoom hooks.
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<DopplerParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_DOPPLER_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => deriveDoppler(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <DopplerControls params={params} set={set} reset={reset} />
      </aside>

      <div className="wl__content">
        {/* --- Doppler power spectrum --- */}
        <Panel title={t('wl.doppler.psd.title')}>
          <PsdPanel key={resetKey} d={d} />
          <Readout label={t('wl.doppler.readout.fm')} value={d.fmHz.toFixed(1)} unit="Hz" />
          <Formula tex="S(f) = \dfrac{1}{\pi f_m\sqrt{1-(f/f_m)^2}},\quad |f|<f_m" />
        </Panel>

        {/* --- Fading envelope vs time --- */}
        <Panel title={t('wl.doppler.env.title')}>
          <EnvPanel key={resetKey} d={d} />
          <Readout label={t('wl.doppler.readout.tc')} value={d.coherenceTimeMs.toFixed(2)} unit="ms" />
          <Readout label={t('wl.doppler.readout.tcRule')} value={d.coherenceTimeRuleMs.toFixed(2)} unit="ms" />
          <Readout label={t('wl.doppler.readout.lcr')} value={d.lcrHz.toFixed(1)} unit="/s" />
          <Readout label={t('wl.doppler.readout.afd')} value={d.afdMs.toFixed(2)} unit="ms" />
          <Formula tex="N_R = \sqrt{2\pi}\,f_m\,\rho\,e^{-\rho^2},\qquad \bar\tau = \dfrac{e^{\rho^2}-1}{\rho f_m\sqrt{2\pi}}" />
        </Panel>

        {/* --- Channel autocorrelation --- */}
        <Panel title={t('wl.doppler.acf.title')}>
          <AcfPanel key={resetKey} d={d} />
          <Formula tex="R(\tau) = J_0(2\pi f_m \tau),\qquad T_{ct} = 1/B_d" />
        </Panel>

        {/* --- Info cards --- */}
        <div className="info-cards">
          <InfoCard title={t('wl.doppler.card.spread.title')} accent="green">
            <p>
              <HintText text={t('wl.doppler.card.spread.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.doppler.card.jakes.title')} accent="blue">
            <p>
              <HintText text={t('wl.doppler.card.jakes.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.doppler.card.coherence.title')} accent="orange">
            <p>
              <HintText text={t('wl.doppler.card.coherence.body')} />
            </p>
          </InfoCard>
        </div>

        {/* --- Consolidated theory box --- */}
        <TheoryBox title={t('wl.doppler.theory.title')}>
          <p>{t('wl.doppler.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
