import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { DEFAULT_BER_PARAMS, deriveBer, type BerParams, type BerDerived } from '../ber-model';
import { BerControls } from '../ber-panels';
import { drawLegend } from '../wl-plot';

const BER_FLOOR = 1e-6;   // clamp for the BER log axis
const OUTAGE_FLOOR = 1e-3; // clamp for the outage log axis

const clampBer = (y: number) => Math.max(y, BER_FLOOR);
const clampOutage = (y: number) => Math.max(y, OUTAGE_FLOOR);

// ──────────────────────────────────────────────
// Sub-panels that own their own zoom state so
// key={resetKey} unmounts & reinitialises them.
// ──────────────────────────────────────────────

function BerCurvePanel({ d }: { d: BerDerived }) {
  const x0 = d.ebN0[0];
  const x1 = d.ebN0[d.ebN0.length - 1];
  // dB x-axis zoom; clamp to [x0, x1] so the user cannot scroll off the data
  const [lo, hi, onWheel, , onPan] = useZoom(x0, x1, {
    minSpan: 5,
    maxSpan: x1 - x0,
    clampMin: x0,
    clampMax: x1,
  });

  return (
    <>
      <Canvas
        height={260}
        ariaLabel="bit error rate versus Eb/N0"
        deps={[d, lo, hi]}
        onWheel={onWheel}
        onPan={onPan}
        draw={(ctx, w, h) => {
          const ax = {
            x: linScale([lo, hi], [44, w - 10]),
            y: logScale([BER_FLOOR, 0.5], [h - 28, 12]),
          };
          drawAxes(ctx, ax, [lo, hi], {
            xLabel: '$E_b/N_0\\,(\\mathrm{dB})$',
            yLabel: '$P_b$',
          });
          drawLine(ctx, ax, d.ebN0, d.awgn.map(clampBer), CHART.blue, 1.8);
          drawLine(ctx, ax, d.ebN0, d.rayleigh.map(clampBer), CHART.green, 1.8);
          drawLine(ctx, ax, d.ebN0, d.mrc.map(clampBer), CHART.orange, 1.8);
          drawLegend(ctx, w, [
            { color: CHART.blue, label: 'AWGN' },
            { color: CHART.green, label: 'Rayleigh' },
            { color: CHART.orange, label: 'MRC' },
          ]);
        }}
      />
      <Formula tex="P_b^{\text{AWGN}} = Q(\sqrt{2\gamma_b}),\quad P_b^{\text{Ray}} = \tfrac12\!\left(1-\sqrt{\tfrac{\bar\gamma_b}{1+\bar\gamma_b}}\right)" />
    </>
  );
}

interface OutagePanelProps {
  d: BerDerived;
  outageThreshDb: number;
}

function OutagePanel({ d, outageThreshDb }: OutagePanelProps) {
  const gb = d.outage.gammaBar;
  const x0 = gb[0];
  const x1 = gb[gb.length - 1];
  // dB x-axis zoom for the outage plot
  const [lo, hi, onWheel, , onPan] = useZoom(x0, x1, {
    minSpan: 5,
    maxSpan: x1 - x0,
    clampMin: x0,
    clampMax: x1,
  });

  // Build legend labels from actual sigmaDb values on each curve
  const sigmaColors = [CHART.dim, CHART.blue, CHART.pink];
  const legendItems = d.outage.curves.map((c, i) => ({
    color: sigmaColors[Math.min(i, sigmaColors.length - 1)],
    label: c.sigmaDb === 0 ? 'σ = 0' : `σ = ${c.sigmaDb} dB`,
  }));

  return (
    <>
      <Canvas
        height={240}
        ariaLabel="outage probability versus average SNR for several shadowing levels"
        deps={[d, lo, hi]}
        onWheel={onWheel}
        onPan={onPan}
        draw={(ctx, w, h) => {
          const ax = {
            x: linScale([lo, hi], [44, w - 10]),
            y: logScale([OUTAGE_FLOOR, 1], [h - 28, 12]),
          };
          drawAxes(ctx, ax, [lo, hi], {
            xLabel: '$\\bar\\gamma\\,(\\mathrm{dB})$',
            yLabel: '$P_{\\mathrm{out}}$',
          });
          d.outage.curves.forEach((c, i) => {
            const col = sigmaColors[Math.min(i, sigmaColors.length - 1)];
            const isHeadline = i === d.outage.curves.length - 1;
            drawLine(ctx, ax, gb, c.pout.map(clampOutage), col, isHeadline ? 2.2 : 1.4);
          });
          drawLegend(ctx, w, legendItems);
        }}
      />
      <Readout label={t('wl.ber.threshold')} value={outageThreshDb} unit="dB" />
      <Formula tex="P_{\text{out}} = \Pr(\gamma<\gamma_{th}) = 1-e^{-\gamma_{th}/\bar\gamma}\;\;(\sigma=0)" />
    </>
  );
}

// ──────────────────────────────────────────────
// Main section
// ──────────────────────────────────────────────

export function RayleighBerSection() {
  const [params, setParams] = useState<BerParams>(DEFAULT_BER_PARAMS);
  // resetKey unmounts panel sub-components, reinitialising their useZoom hooks
  const [resetKey, setResetKey] = useState(0);

  const set = (patch: Partial<BerParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_BER_PARAMS);
    setResetKey((k) => k + 1);
  };

  const d = useMemo(() => deriveBer(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <BerControls params={params} set={set} reset={reset} />
      </aside>

      <div className="wl__content">
        <Panel title={t('wl.ber.curve.title')}>
          <BerCurvePanel key={resetKey} d={d} />
        </Panel>

        <Panel title={t('wl.ber.outage.title')}>
          <OutagePanel key={resetKey} d={d} outageThreshDb={params.outageThreshDb} />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('wl.ber.card.penalty.title')} accent="green">
            <p><HintText text={t('wl.ber.card.penalty.body')} /></p>
          </InfoCard>
          <InfoCard title={t('wl.ber.card.diversity.title')} accent="blue">
            <p><HintText text={t('wl.ber.card.diversity.body')} /></p>
          </InfoCard>
          <InfoCard title={t('wl.ber.card.outage.title')} accent="orange">
            <p><HintText text={t('wl.ber.card.outage.body')} /></p>
          </InfoCard>
        </div>

        <TheoryBox title={t('wl.ber.theory.title')}>
          <p>{t('wl.ber.theory.body.ber')}</p>
          <p>{t('wl.ber.theory.body.outage')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
