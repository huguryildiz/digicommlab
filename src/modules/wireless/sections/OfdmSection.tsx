import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout, Segmented, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine, drawScatter, shadeRegion } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { DEFAULT_OFDM_PARAMS, deriveOfdm, type OfdmParams, type OfdmDerived } from '../ofdm-model';
import { DEFAULT_PAPR_PARAMS, derivePapr, type PaprParams, type PaprDerived } from '../papr-model';
import { OfdmControls } from '../ofdm-panels';
import { PaprControls } from '../papr-panels';
import { drawLegend } from '../wl-plot';

type OfdmSubTab = 'eq' | 'papr' | 'apps';

export function OfdmSection() {
  const [subTab, setSubTab] = useState<OfdmSubTab>('eq');
  return (
    <div>
      <div className="wl__subtabbar">
        <Segmented<OfdmSubTab>
          ariaLabel={t('wl.ofdm.subtab.ariaLabel')}
          value={subTab}
          options={[
            { value: 'eq', label: t('wl.ofdm.subtab.eq') },
            { value: 'papr', label: t('wl.ofdm.subtab.papr') },
            { value: 'apps', label: t('wl.ofdm.subtab.apps') },
          ]}
          onChange={setSubTab}
        />
      </div>
      {subTab === 'eq' && <EqualizationView />}
      {subTab === 'papr' && <PaprView />}
      {subTab === 'apps' && <ApplicationsView />}
    </div>
  );
}

/* ── Equalization (existing demo, retrofitted to the design system) ─────────── */

function OfdmTimePanel({ d }: { d: OfdmDerived }) {
  const n = d.timeReal.length;
  const [lo, hi, onWheel, , onPan] = useZoom(0, n - 1, {
    minSpan: 4,
    maxSpan: n - 1,
    clampMin: 0,
    clampMax: n - 1,
  });
  const yMax = Math.max(0.01, ...d.timeReal.map((v) => Math.abs(v)));
  return (
    <Canvas
      height={200}
      ariaLabel="OFDM time-domain symbol with cyclic prefix highlighted"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([lo, hi], [40, w - 10]), y: linScale([-yMax, yMax], [h - 28, 12]) };
        if (d.cpLength > 0) shadeRegion(ctx, ax, 0, d.cpLength - 1, -yMax, yMax, alpha(CHART.orange, 0.18));
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$n\\,(\\mathrm{sample})$', yLabel: '$x[n]$' });
        drawLine(
          ctx,
          ax,
          d.timeReal.map((_, i) => i),
          d.timeReal,
          CHART.blue,
          1.6,
        );
      }}
    />
  );
}

function OfdmChannelPanel({ d }: { d: OfdmDerived }) {
  const [lo, hi, onWheel, , onPan] = useZoom(0, d.N - 1, {
    minSpan: 2,
    maxSpan: d.N - 1,
    clampMin: 0,
    clampMax: d.N - 1,
  });
  return (
    <Canvas
      height={200}
      ariaLabel="channel frequency response magnitude across subcarriers"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const yMax = Math.max(0.01, ...d.channelMag);
        const ax = { x: linScale([lo, hi], [40, w - 10]), y: linScale([0, yMax], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$k\\,(\\mathrm{subcarrier})$', yLabel: '$|H[k]|$' });
        drawLine(
          ctx,
          ax,
          d.channelMag.map((_, k) => k),
          d.channelMag,
          CHART.orange,
          1.8,
        );
      }}
    />
  );
}

function ConstellationPanel({
  reX,
  imX,
  refRe,
  refIm,
  color,
  aria,
}: {
  reX: number[];
  imX: number[];
  refRe?: number[];
  refIm?: number[];
  color: string;
  aria: string;
}) {
  const lim = 1.8;
  return (
    <Canvas
      height={240}
      ariaLabel={aria}
      deps={[reX, imX]}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([-lim, lim], [40, w - 10]), y: linScale([-lim, lim], [h - 28, 12]) };
        drawAxes(ctx, ax, [-lim, lim], { xLabel: '$\\mathrm{Re}$', yLabel: '$\\mathrm{Im}$', domainY: [-lim, lim] });
        if (refRe && refIm) drawScatter(ctx, ax, refRe, refIm, CHART.dim, 4);
        drawScatter(ctx, ax, reX, imX, color, 2.5);
      }}
    />
  );
}

function EqualizationView() {
  const [params, setParams] = useState<OfdmParams>(DEFAULT_OFDM_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<OfdmParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_OFDM_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => deriveOfdm(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <OfdmControls params={params} set={set} reset={reset} />
      </aside>
      <div className="wl__content">
        <Panel title={t('wl.ofdm.time.title')}>
          <OfdmTimePanel key={resetKey} d={d} />
          <Readout label={t('wl.ofdm.readout.cp')} value={`${d.cpLength}`} unit="samples" />
          <Readout
            label={t('wl.ofdm.readout.cpState')}
            value={d.cpSufficient ? t('wl.ofdm.cp.ok') : t('wl.ofdm.cp.bad')}
            tone={d.cpSufficient ? 'ok' : 'warn'}
          />
        </Panel>

        <Panel title={t('wl.ofdm.channel.title')}>
          <OfdmChannelPanel key={resetKey} d={d} />
          <Formula tex="H[k] = \mathrm{FFT}\{h\}[k],\qquad Y[k] = H[k]\,X[k] + n[k]" />
        </Panel>

        <Panel title={t('wl.ofdm.preeq.title')}>
          <ConstellationPanel
            reX={d.rxPreEq.map((z) => z.re)}
            imX={d.rxPreEq.map((z) => z.im)}
            color={CHART.orange}
            aria="received subcarrier constellation before equalization"
          />
        </Panel>

        <Panel title={t('wl.ofdm.posteq.title')}>
          <ConstellationPanel
            reX={d.rxPostEq.map((z) => z.re)}
            imX={d.rxPostEq.map((z) => z.im)}
            refRe={d.txSymbols.map((z) => z.re)}
            refIm={d.txSymbols.map((z) => z.im)}
            color={CHART.green}
            aria="subcarrier constellation after one-tap equalization"
          />
          <Readout label={t('wl.ofdm.readout.evm')} value={d.evmPostEq.toFixed(3)} />
          <Formula tex="\hat{X}[k] = \dfrac{Y[k]}{H[k]}" />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('wl.ofdm.card.cp.title')} accent="orange">
            <p>
              <HintText text={t('wl.ofdm.card.cp.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.ofdm.card.eq.title')} accent="green">
            <p>
              <HintText text={t('wl.ofdm.card.eq.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.ofdm.card.orth.title')} accent="blue">
            <p>
              <HintText text={t('wl.ofdm.card.orth.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('wl.ofdm.theory.title')}>
          <p>{t('wl.ofdm.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}

/* ── PAPR (§11.5) ──────────────────────────────────────────────────────────── */

function PaprCcdfPanel({ d }: { d: PaprDerived }) {
  const [lo, hi, onWheel, , onPan] = useZoom(0, 13, { minSpan: 2, maxSpan: 13, clampMin: 0, clampMax: 13 });
  return (
    <Canvas
      height={240}
      ariaLabel="complementary CDF of OFDM peak-to-average power ratio"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const ax = { x: linScale([lo, hi], [46, w - 10]), y: logScale([1e-3, 1], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$\\gamma\\,(\\mathrm{dB})$',
          yLabel: '$\\Pr(\\mathrm{PAPR}>\\gamma)$',
        });
        const clamp = (v: number) => Math.max(v, 1e-3);
        drawLine(
          ctx,
          ax,
          d.ccdfTheory.map((p) => p.gammaDb),
          d.ccdfTheory.map((p) => clamp(p.p)),
          CHART.blue,
          1.6,
          true,
        );
        drawLine(
          ctx,
          ax,
          d.ccdf.map((p) => p.gammaDb),
          d.ccdf.map((p) => clamp(p.ccdf)),
          CHART.orange,
          1.8,
        );
        drawLegend(ctx, w, [
          { color: CHART.orange, label: 'empirical' },
          { color: CHART.blue, label: 'theory' },
        ]);
      }}
    />
  );
}

function PaprEnvelopePanel({ d }: { d: PaprDerived }) {
  const n = d.envelope.length;
  const [lo, hi, onWheel, , onPan] = useZoom(0, n - 1, { minSpan: 8, maxSpan: n - 1, clampMin: 0, clampMax: n - 1 });
  return (
    <Canvas
      height={200}
      ariaLabel="OFDM symbol envelope with clip level"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const yMax = Math.max(...d.envelope) * 1.1;
        const ax = { x: linScale([lo, hi], [40, w - 10]), y: linScale([0, yMax], [h - 28, 12]) };
        drawAxes(ctx, ax, [lo, hi], { xLabel: '$t\\,(\\mathrm{sample})$', yLabel: '$|x(t)|$' });
        const idx = d.envelope.map((_, i) => i);
        drawLine(ctx, ax, idx, d.envelope, CHART.blue, 1.4);
        drawLine(ctx, ax, idx, d.clipped, CHART.green, 1.4);
        drawLine(ctx, ax, [0, n - 1], [d.clipLevel, d.clipLevel], CHART.pink, 1, true);
        drawLegend(ctx, w, [
          { color: CHART.blue, label: 'envelope' },
          { color: CHART.green, label: 'clipped' },
          { color: CHART.pink, label: 'clip level' },
        ]);
      }}
    />
  );
}

function PaprView() {
  const [params, setParams] = useState<PaprParams>(DEFAULT_PAPR_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<PaprParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_PAPR_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => derivePapr(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <PaprControls params={params} set={set} reset={reset} />
      </aside>
      <div className="wl__content">
        <Panel title={t('wl.papr.ccdf.title')}>
          <PaprCcdfPanel key={resetKey} d={d} />
          <Formula tex="\Pr(\mathrm{PAPR}>\gamma) = 1-(1-e^{-\gamma})^{N}" />
        </Panel>

        <Panel title={t('wl.papr.env.title')}>
          <PaprEnvelopePanel key={resetKey} d={d} />
          <Readout label={t('wl.papr.readout.papr')} value={d.paprDb.toFixed(2)} unit="dB" />
          <Readout label={t('wl.papr.readout.clipped')} value={d.clippedPaprDb.toFixed(2)} unit="dB" />
          <Readout label={t('wl.papr.readout.evm')} value={(d.evm * 100).toFixed(1)} unit="%" />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('wl.papr.card.papr.title')} accent="orange">
            <p>
              <HintText text={t('wl.papr.card.papr.body')} />
            </p>
            <Formula tex="\mathrm{PAPR}=\dfrac{\max|x(t)|^2}{\mathrm{E}[|x(t)|^2]}" block />
          </InfoCard>
          <InfoCard title={t('wl.papr.card.ccdf.title')} accent="blue">
            <p>
              <HintText text={t('wl.papr.card.ccdf.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.papr.card.clip.title')} accent="green">
            <p>
              <HintText text={t('wl.papr.card.clip.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('wl.papr.theory.title')}>
          <p>{t('wl.papr.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}

/* ── Applications of OFDM (§11.6) ──────────────────────────────────────────── */

function ApplicationsView() {
  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <Panel title={t('wl.ofdm.apps.title')}>
          <p className="wl__note">{t('wl.ofdm.apps.intro')}</p>
        </Panel>
      </aside>
      <div className="wl__content">
        <div className="info-cards">
          <InfoCard title={t('wl.ofdm.apps.dsl.title')} accent="green">
            <p>
              <HintText text={t('wl.ofdm.apps.dsl.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.ofdm.apps.dvb.title')} accent="orange">
            <p>
              <HintText text={t('wl.ofdm.apps.dvb.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.ofdm.apps.wifi.title')} accent="blue">
            <p>
              <HintText text={t('wl.ofdm.apps.wifi.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.ofdm.apps.lte.title')} accent="green">
            <p>
              <HintText text={t('wl.ofdm.apps.lte.body')} />
            </p>
          </InfoCard>
        </div>
        <TheoryBox title={t('wl.ofdm.apps.theory.title')}>
          <p>{t('wl.ofdm.apps.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
