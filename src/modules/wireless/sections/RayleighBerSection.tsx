import { useMemo, useState } from 'react';
import { Panel, Formula, TheoryBox, Readout } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawAxes, drawLine } from '@/lib/plot/draw';
import { CHART } from '@/lib/plot/colors';
import { t } from '@/i18n';
import { DEFAULT_BER_PARAMS, deriveBer, type BerParams } from '../ber-model';
import { BerControls } from '../ber-panels';

const BER_FLOOR = 1e-6; // clamp for the log axis
const OUTAGE_FLOOR = 1e-3; // clamp for outage log axis

export function RayleighBerSection() {
  const [params, setParams] = useState<BerParams>(DEFAULT_BER_PARAMS);
  const set = (patch: Partial<BerParams>) => setParams((p) => ({ ...p, ...patch }));
  const d = useMemo(() => deriveBer(params), [params]);

  const clampBer = (y: number) => Math.max(y, BER_FLOOR);
  const clampOutage = (y: number) => Math.max(y, OUTAGE_FLOOR);

  return (
    <>
      <BerControls params={params} set={set} />

      <Panel title={t('wl.ber.curve.title')}>
        <Canvas
          height={260}
          ariaLabel="bit error rate versus Eb/N0"
          deps={[d]}
          draw={(ctx, w, h) => {
            const ax = {
              x: linScale([d.ebN0[0], d.ebN0[d.ebN0.length - 1]], [36, w - 8]),
              y: logScale([BER_FLOOR, 0.5], [h - 20, 12]),
            };
            drawAxes(ctx, ax, [d.ebN0[0], d.ebN0[d.ebN0.length - 1]]);
            drawLine(ctx, ax, d.ebN0, d.awgn.map(clampBer), CHART.blue, 1.8);
            drawLine(ctx, ax, d.ebN0, d.rayleigh.map(clampBer), CHART.green, 1.8);
            drawLine(ctx, ax, d.ebN0, d.mrc.map(clampBer), CHART.orange, 1.8);
          }}
        />
        <Formula tex="P_b^{\text{AWGN}} = Q(\sqrt{2\gamma_b}),\quad P_b^{\text{Ray}} = \tfrac12\!\left(1-\sqrt{\tfrac{\bar\gamma_b}{1+\bar\gamma_b}}\right)" />
        <TheoryBox>
          On an AWGN channel the bit-error rate falls exponentially with E_b/N₀ (blue). On a
          Rayleigh-fading channel deep fades dominate, so the averaged BER (green) decays only
          inversely with SNR — a huge penalty. L-branch maximal-ratio combining (orange) restores
          the slope toward 1/SNR^L: each extra independent branch makes a deep fade far less likely.
        </TheoryBox>
      </Panel>

      <Panel title={t('wl.ber.outage.title')}>
        <Canvas
          height={240}
          ariaLabel="outage probability versus average SNR for several shadowing levels"
          deps={[d]}
          draw={(ctx, w, h) => {
            const gb = d.outage.gammaBar;
            const ax = {
              x: linScale([gb[0], gb[gb.length - 1]], [36, w - 8]),
              y: logScale([OUTAGE_FLOOR, 1], [h - 20, 12]),
            };
            drawAxes(ctx, ax, [gb[0], gb[gb.length - 1]]);
            const colors = [CHART.dim, CHART.blue, CHART.pink];
            d.outage.curves.forEach((c, i) => {
              const col = colors[Math.min(i, colors.length - 1)];
              const isHeadline = i === d.outage.curves.length - 1;
              drawLine(
                ctx,
                ax,
                gb,
                c.pout.map(clampOutage),
                col,
                isHeadline ? 2.2 : 1.4,
              );
            });
          }}
        />
        <Readout label={t('wl.ber.threshold')} value={params.outageThreshDb} unit="dB" />
        <Formula tex="P_{\text{out}} = \Pr(\gamma<\gamma_{th}) = 1-e^{-\gamma_{th}/\bar\gamma}\;\;(\sigma=0)" />
        <TheoryBox>
          Outage is the probability the instantaneous SNR drops below the threshold γ_th. Without
          shadowing (σ = 0) it follows the Rayleigh curve; log-normal shadowing makes the average
          SNR itself random (σ = 5–12 dB in cellular), so a larger fade margin is needed for the
          same outage — the composite (Suzuki) effect. The boldest curve is your selected σ.
        </TheoryBox>
      </Panel>
    </>
  );
}
