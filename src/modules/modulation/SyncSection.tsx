import { useMemo, useState } from 'react';
import {
  Panel,
  Slider,
  Readout,
  TheoryBox,
  Formula,
  HintText,
  InfoCard,
  Segmented,
} from '@/components';
import { t } from '@/i18n';
import { buildPllView, buildTimingView } from './sync-model';
import { PllLockPanel, EarlyLatePanel, TimingSCurvePanel } from './sync-panels';
import './modulation.css';

type SyncView = 'carrier' | 'timing';

export function SyncSection() {
  const [view, setView] = useState<SyncView>('carrier');

  // Carrier-phase state
  const [zeta, setZeta] = useState(0.707);
  const [omegaN, setOmegaN] = useState(2.5);
  const [phi0Deg, setPhi0Deg] = useState(60);
  // Symbol-timing state
  const [tau, setTau] = useState(0.2);
  const [delta, setDelta] = useState(0.25);
  const [resetKey, setResetKey] = useState(0);

  const pll = useMemo(() => buildPllView({ zeta, omegaN, phi0Deg }), [zeta, omegaN, phi0Deg]);
  const timing = useMemo(() => buildTimingView({ tau, delta }), [tau, delta]);

  const handleReset = () => {
    setZeta(0.707);
    setOmegaN(2.5);
    setPhi0Deg(60);
    setTau(0.2);
    setDelta(0.25);
    setResetKey((k) => k + 1);
  };

  return (
    <div className="modulation__tabwrap">
      <Segmented<SyncView>
        ariaLabel={t('modulation.sync.view')}
        value={view}
        onChange={setView}
        options={[
          { value: 'carrier', label: t('modulation.sync.view.carrier') },
          { value: 'timing', label: t('modulation.sync.view.timing') },
        ]}
      />

      {view === 'carrier' ? (
        <div className="module-layout">
          <aside className="modulation__controls">
            <Panel title={t('modulation.sync.view.carrier')}>
              <Slider label={t('modulation.sync.zeta')} value={zeta} min={0.2} max={3} step={0.05} onChange={setZeta} />
              <Slider label={t('modulation.sync.omegan')} value={omegaN} min={0.5} max={6} step={0.1} onChange={setOmegaN} />
              <Slider
                label={t('modulation.sync.phi0')}
                value={phi0Deg}
                min={-150}
                max={150}
                step={5}
                unit="°"
                onChange={setPhi0Deg}
              />
              <button type="button" onClick={handleReset} className="btn--reset">
                {t('modulation.repeater.reset')}
              </button>
            </Panel>
          </aside>

          <div className="modulation__content">
            <div className="modulation__readouts">
              <Readout
                label={t('modulation.sync.readout.regime')}
                value={t(`modulation.sync.regime.${pll.regime}`)}
              />
              <Readout
                label={t('modulation.sync.readout.finalerr')}
                value={`${pll.finalErrDeg.toFixed(2)}°`}
                tone="ok"
              />
            </div>

            <Panel title={t('modulation.sync.panel.lock')}>
              <PllLockPanel key={`lock-${resetKey}`} view={pll} />
            </Panel>

            <div className="info-cards">
              <InfoCard title={t('modulation.sync.card.pll.title')} accent="blue">
                <HintText text={t('modulation.sync.card.pll.body')} />
              </InfoCard>
              <InfoCard title={t('modulation.sync.card.costas.title')} accent="green">
                <HintText text={t('modulation.sync.card.costas.body')} />
              </InfoCard>
              <InfoCard title={t('modulation.sync.card.ml.title')} accent="orange">
                <HintText text={t('modulation.sync.card.ml.body')} />
              </InfoCard>
            </div>

            <TheoryBox title={t('modulation.sync.theory.carrier.title')}>
              <p>{t('modulation.sync.theory.loop')}</p>
              <Formula tex="H(s)=\dfrac{2\zeta\omega_n s+\omega_n^2}{s^2+2\zeta\omega_n s+\omega_n^2}" block />
              <p>{t('modulation.sync.theory.var')}</p>
              <Formula tex="\sigma_\phi^2=\dfrac{1}{\rho_L}" block />
            </TheoryBox>
          </div>
        </div>
      ) : (
        <div className="module-layout">
          <aside className="modulation__controls">
            <Panel title={t('modulation.sync.view.timing')}>
              <Slider label={t('modulation.sync.tau')} value={tau} min={-0.4} max={0.4} step={0.01} onChange={setTau} />
              <Slider label={t('modulation.sync.delta')} value={delta} min={0.1} max={0.45} step={0.01} onChange={setDelta} />
              <button type="button" onClick={handleReset} className="btn--reset">
                {t('modulation.repeater.reset')}
              </button>
            </Panel>
          </aside>

          <div className="modulation__content">
            <div className="modulation__readouts">
              <Readout
                label={t('modulation.sync.readout.errnow')}
                value={timing.errorNow.toFixed(3)}
                tone={Math.abs(timing.errorNow) < 0.02 ? 'ok' : undefined}
              />
            </div>

            <div className="modulation__plots">
              <Panel title={t('modulation.sync.panel.earlylate')}>
                <EarlyLatePanel view={timing} />
              </Panel>
              <Panel title={t('modulation.sync.panel.scurve')}>
                <TimingSCurvePanel view={timing} tau={tau} />
              </Panel>
            </div>

            <div className="info-cards">
              <InfoCard title={t('modulation.sync.card.earlylate.title')} accent="green">
                <HintText text={t('modulation.sync.card.earlylate.body')} />
              </InfoCard>
              <InfoCard title={t('modulation.sync.card.scurve.title')} accent="blue">
                <HintText text={t('modulation.sync.card.scurve.body')} />
              </InfoCard>
              <InfoCard title={t('modulation.sync.card.ml2.title')} accent="orange">
                <HintText text={t('modulation.sync.card.ml2.body')} />
              </InfoCard>
            </div>

            <TheoryBox title={t('modulation.sync.theory.timing.title')}>
              <p>{t('modulation.sync.theory.earlylate')}</p>
              <Formula tex="\varepsilon=\big|y(\tau-\delta)\big|-\big|y(\tau+\delta)\big|" block />
            </TheoryBox>
          </div>
        </div>
      )}
    </div>
  );
}
