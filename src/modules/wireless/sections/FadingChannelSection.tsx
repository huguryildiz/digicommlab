import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, drawLine, drawStems, drawVLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { DEFAULT_PARAMS, deriveAll, type ScenarioParams, type Derived } from '../model';
import { ScenarioControls } from '../panels';
import { drawLegend } from '../wl-plot';

// Power-delay profile panel — stems at each tap delay, dB y-axis
function PdpPanel({ d }: { d: Derived }) {
  const tapDelaysUs = d.taps.map((tp) => tp.delay * 1e6);
  const tapPowers = d.taps.map((tp) => tp.power);
  const xMax = Math.max(...tapDelaysUs, 1);
  // Convert linear power to dB for display (§10.2, Proakis & Salehi)
  const tapPowersDb = tapPowers.map((p) => 10 * Math.log10(Math.max(p, 1e-10)));
  const yDbMin = Math.min(...tapPowersDb) - 3;
  const yDbMax = Math.max(...tapPowersDb) + 2;

  const [lo, hi, onWheel, , onPan] = useZoom(0, xMax, {
    minSpan: xMax / 8,
    maxSpan: xMax * 4,
    clampMin: 0,
    clampMax: xMax * 4,
  });

  return (
    <Canvas
      height={220}
      ariaLabel="power delay profile"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = {
          x: linScale([lo, hi], [44, w - 10]),
          y: linScale([yDbMin, yDbMax], [h - 28, 12]),
        };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$\\tau\\,(\\mu\\mathrm{s})$',
          yLabel: '$P(\\tau)\\,(\\mathrm{dB})$',
        });
        drawStems(ctx, ax, tapDelaysUs, tapPowersDb, CHART.orange);
      }}
    />
  );
}

// Channel frequency response |H(f)| panel with coherence bandwidth markers
function FreqPanel({ d }: { d: Derived }) {
  const freqsMhz = d.freqs.map((f) => f / 1e6);
  const mag = d.magResponse;
  const fLo = freqsMhz[0];
  const fHi = freqsMhz[freqsMhz.length - 1];
  const yMax = Math.max(...mag, 0.01);
  const bcMhz = d.coherenceBw / 1e6;

  const [lo, hi, onWheel, , onPan] = useZoom(fLo, fHi, {
    minSpan: (fHi - fLo) / 8,
    maxSpan: fHi - fLo,
    clampMin: fLo,
    clampMax: fHi,
  });

  return (
    <Canvas
      height={220}
      ariaLabel="channel frequency response magnitude"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = {
          x: linScale([lo, hi], [44, w - 10]),
          y: linScale([0, yMax], [h - 28, 12]),
        };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$f\\,(\\mathrm{MHz})$',
          yLabel: '$|H(f)|$',
        });
        drawLine(ctx, ax, freqsMhz, mag, CHART.blue, 1.8);
        // Draw coherence bandwidth markers at ±B_c (§10.3.2)
        if (Number.isFinite(bcMhz)) {
          drawVLine(ctx, ax, -bcMhz, 0, yMax, CHART.pink);
          drawVLine(ctx, ax, bcMhz, 0, yMax, CHART.pink);
        }
        drawLegend(ctx, w, [
          { color: CHART.blue, label: '|H(f)|' },
          { color: CHART.pink, label: '±B_c' },
        ]);
      }}
    />
  );
}

// Fading envelope |r(t)| panel
function EnvelopePanel({ d }: { d: Derived }) {
  const env = Array.from(d.envelope);
  // x-axis in ms — fs matches DEFAULT_PARAMS.fs (1000 Hz)
  const fs = 1000;
  const tMs = env.map((_, i) => (i / fs) * 1000);
  const tMax = tMs[tMs.length - 1] || 1;
  const yMax = Math.max(...env, 0.01);

  const [lo, hi, onWheel, , onPan] = useZoom(0, tMax, {
    minSpan: tMax / 8,
    maxSpan: tMax * 4,
    clampMin: 0,
    clampMax: tMax * 4,
  });

  return (
    <Canvas
      height={220}
      ariaLabel="fading envelope over time"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = {
          x: linScale([lo, hi], [44, w - 10]),
          y: linScale([0, yMax], [h - 28, 12]),
        };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$t\\,(\\mathrm{ms})$',
          yLabel: '$|r(t)|$',
        });
        drawLine(ctx, ax, tMs, env, CHART.green, 1.6);
      }}
    />
  );
}

// Envelope probability density function panel
function PdfPanel({ d, resetKey }: { d: Derived; resetKey: number }) {
  const r = d.pdf.r;
  const fr = d.pdf.fr;
  const xLo = r[0];
  const xHi = r[r.length - 1];
  const yMax = Math.max(...fr, 0.01);

  const [lo, hi, onWheel, , onPan] = useZoom(xLo, xHi, {
    minSpan: (xHi - xLo) / 8,
    maxSpan: xHi - xLo,
    clampMin: xLo,
    clampMax: xHi,
  });

  return (
    <Canvas
      key={resetKey}
      height={180}
      ariaLabel="envelope probability density"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = {
          x: linScale([lo, hi], [44, w - 10]),
          y: linScale([0, yMax], [h - 28, 12]),
        };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$|r|$',
          yLabel: '$p(|r|)$',
        });
        drawLine(ctx, ax, r, fr, CHART.pink, 1.8);
      }}
    />
  );
}

export function FadingChannelSection() {
  const [params, setParams] = useState<ScenarioParams>(DEFAULT_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<ScenarioParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => deriveAll(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <ScenarioControls params={params} set={set} reset={reset} />
      </aside>
      <div className="wl__content">
        <Panel title={t('wl.pdp.title')}>
          <PdpPanel key={resetKey} d={d} />
          <Readout label={t('wl.readout.sigmaTau')} value={`${(d.sigmaTau * 1e6).toFixed(3)} µs`} />
          <Formula tex="\sigma_\tau = \sqrt{\overline{\tau^2} - \bar{\tau}^2}" />
        </Panel>

        <Panel title={t('wl.freq.title')}>
          <FreqPanel key={resetKey} d={d} />
          <Readout
            label={t('wl.readout.coherenceBw')}
            value={Number.isFinite(d.coherenceBw) ? `${(d.coherenceBw / 1e6).toFixed(3)} MHz` : '∞'}
          />
          <Formula tex="B_c \approx \dfrac{1}{2\pi\,\sigma_\tau}" />
        </Panel>

        <Panel title={t('wl.env.title')}>
          <EnvelopePanel key={resetKey} d={d} />
          <PdfPanel d={d} resetKey={resetKey} />
          <Readout
            label={t('wl.readout.coherenceTime')}
            value={
              Number.isFinite(d.coherenceTime) ? `${(d.coherenceTime * 1e3).toFixed(2)} ms` : '∞'
            }
          />
          <Formula tex="f(r) = \dfrac{r}{\sigma^2}\,e^{-r^2/2\sigma^2}\quad(K=0)" />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('wl.fading.card.multipath.title')} accent="green">
            <p>
              <HintText text={t('wl.fading.card.multipath.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.fading.card.coherence.title')} accent="blue">
            <p>
              <HintText text={t('wl.fading.card.coherence.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.fading.card.distrib.title')} accent="orange">
            <p>
              <HintText text={t('wl.fading.card.distrib.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('wl.fading.theory.title')}>
          <p>{t('wl.fading.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
