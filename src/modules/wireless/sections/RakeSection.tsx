import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout, InfoCard, HintText } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine, drawStems, drawVLine, shadeRegion } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { useZoom } from '@/lib/plot/useZoom';
import { t } from '@/i18n';
import { DEFAULT_RAKE_PARAMS, deriveRake, type RakeParams, type RakeDerived } from '../rake-model';
import { RakeControls } from '../rake-panels';
import { drawLegend } from '../wl-plot';

const BER_FLOOR = 1e-6;
const clampBer = (y: number) => Math.max(y, BER_FLOOR);

// ---------------------------------------------------------------------------
// Power-Delay Profile panel — scroll/drag over the delay axis (µs).
// Vertical chip-grid lines mark the resolvable-finger boundaries.
// ---------------------------------------------------------------------------
function PdpPanel({ d, resetKey }: { d: RakeDerived; resetKey: number }) {
  // Display axis in µs; model data is in ns — convert at render time.
  const xMaxUs = Math.max(d.tapDelaysNs[d.tapDelaysNs.length - 1] || 1, d.chipDurationNs) / 1000;
  const [lo, hi, onWheel, , onPan] = useZoom(0, xMaxUs, {
    minSpan: xMaxUs / 8,
    maxSpan: xMaxUs * 4,
    clampMin: 0,
    clampMax: xMaxUs * 4,
  });

  return (
    <Canvas
      key={resetKey}
      height={200}
      ariaLabel="power delay profile with chip-resolution grid"
      deps={[d, lo, hi]}
      onWheel={onWheel}
      onPan={onPan}
      draw={(ctx, w, h) => {
        const yMax = Math.max(...d.tapPowers, 0.01);
        const ax = {
          x: linScale([lo, hi], [44, w - 10]),
          y: linScale([0, yMax], [h - 28, 12]),
        };
        drawAxes(ctx, ax, [lo, hi], {
          xLabel: '$\\tau\\,(\\mu\\mathrm{s})$',
          yLabel: '$|c(\\tau)|^2$',
        });
        // Chip-resolution grid: a vertical line every chip duration.
        const chipUs = d.chipDurationNs / 1000;
        for (let g = chipUs; g < hi; g += chipUs) {
          drawVLine(ctx, ax, g, 0, yMax, CHART.dim);
        }
        // Convert ns → µs for plotting.
        const delaysUs = d.tapDelaysNs.map((ns) => ns / 1000);
        drawStems(ctx, ax, delaysUs, d.tapPowers, CHART.green);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// BER vs Eb/N0 panel — log-y, scroll/drag over the dB axis.
// Three traces: single Rayleigh (dim), RAKE MRC (green), AWGN bound (blue dashed).
// ---------------------------------------------------------------------------
function BerPanel({ d, resetKey }: { d: RakeDerived; resetKey: number }) {
  const x = d.ebN0Sweep;
  const [lo, hi, onWheel, , onPan] = useZoom(x[0], x[x.length - 1], {
    minSpan: 5,
    maxSpan: x[x.length - 1] - x[0],
    clampMin: x[0],
    clampMax: x[x.length - 1],
  });

  return (
    <Canvas
      key={resetKey}
      height={240}
      ariaLabel="bit error rate versus Eb/N0 for RAKE diversity"
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
        drawLine(ctx, ax, x, d.berNoRake.map(clampBer), CHART.dim, 1.4);
        drawLine(ctx, ax, x, d.berRake.map(clampBer), CHART.green, 2);
        drawLine(ctx, ax, x, d.berAwgn.map(clampBer), CHART.blue, 1.4, true);
        drawLegend(ctx, w, [
          { color: CHART.dim, label: 'no RAKE (Rayleigh)' },
          { color: CHART.green, label: `RAKE (L = ${d.fingerCount})` },
          { color: CHART.blue, label: 'AWGN bound' },
        ]);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Per-finger SNR bar chart — finger index axis.
// ---------------------------------------------------------------------------
function FingerSnrPanel({ d }: { d: RakeDerived }) {
  return (
    <Canvas
      height={180}
      ariaLabel="per finger signal to noise ratio bars"
      deps={[d]}
      draw={(ctx, w, h) => {
        const n = d.fingerSnrsDb.length;
        const yMin = Math.min(...d.fingerSnrsDb, 0) - 2;
        const yMax = Math.max(...d.fingerSnrsDb, 1) + 2;
        const ax = {
          x: linScale([0, n], [44, w - 10]),
          y: linScale([yMin, yMax], [h - 28, 12]),
        };
        drawAxes(ctx, ax, [0, n], {
          xLabel: '$l\\,(\\mathrm{finger\\;index})$',
          yLabel: '$\\gamma_l\\,(\\mathrm{dB})$',
        });
        d.fingerSnrsDb.forEach((s, i) => {
          shadeRegion(ctx, ax, i + 0.15, i + 0.85, Math.min(yMin, 0), s, alpha(CHART.green, 0.4));
        });
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Section root — owns state, resetKey, and module-layout.
// ---------------------------------------------------------------------------
export function RakeSection() {
  const [params, setParams] = useState<RakeParams>(DEFAULT_RAKE_PARAMS);
  const [resetKey, setResetKey] = useState(0);
  const set = (patch: Partial<RakeParams>) => setParams((p) => ({ ...p, ...patch }));
  const reset = () => {
    setParams(DEFAULT_RAKE_PARAMS);
    setResetKey((k) => k + 1);
  };
  const d = useMemo(() => deriveRake(params), [params]);

  return (
    <div className="module-layout">
      <aside className="wl__controls">
        <RakeControls params={params} set={set} reset={reset} />
      </aside>

      <div className="wl__content">
        {/* Power-delay profile: multipath taps + chip-resolution finger grid */}
        <Panel title={t('wl.rake.pdp.title')}>
          <PdpPanel d={d} resetKey={resetKey} />
          <Readout label={t('wl.rake.readout.fingers')} value={`${d.fingerCount}`} />
          <Readout label={t('wl.rake.readout.chip')} value={d.chipDurationNs.toFixed(0)} unit="ns" />
          <Formula tex="T_c = 1/W,\qquad \gamma = \textstyle\sum_l \gamma_l" />
        </Panel>

        {/* BER vs Eb/N0: no-RAKE Rayleigh, RAKE MRC, AWGN bound */}
        <Panel title={t('wl.rake.ber.title')}>
          <BerPanel d={d} resetKey={resetKey} />
          <Formula tex="P_b^{\text{RAKE}} = P_b^{\text{MRC}}(\bar\gamma_b/L,\, L)" />
        </Panel>

        {/* Per-finger SNR bars at the selected operating Eb/N0 */}
        <Panel title={t('wl.rake.snr.title')}>
          <FingerSnrPanel d={d} />
        </Panel>

        {/* Info cards — key concepts glanceable on the simulation surface */}
        <div className="info-cards">
          <InfoCard title={t('wl.rake.card.resolvable.title')} accent="green">
            <p>
              <HintText text={t('wl.rake.card.resolvable.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.rake.card.fingers.title')} accent="blue">
            <p>
              <HintText text={t('wl.rake.card.fingers.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('wl.rake.card.mrc.title')} accent="orange">
            <p>
              <HintText text={t('wl.rake.card.mrc.body')} />
            </p>
          </InfoCard>
        </div>

        {/* Theory box — consolidated explanation for the RAKE receiver (§10.3) */}
        <TheoryBox title={t('wl.rake.theory.title')}>
          <p>{t('wl.rake.theory.body')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
