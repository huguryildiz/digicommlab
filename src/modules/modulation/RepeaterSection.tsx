import { useMemo, useState } from 'react';
import { Panel, Slider, Select, Readout, TheoryBox, Formula, HintText, InfoCard } from '@/components';
import { t } from '@/i18n';
import { buildRepeaterView } from './repeater-model';
import { RepeaterBerPanel, HopNoisePanel } from './repeater-panels';
import './modulation.css';

const TARGET_OPTIONS = [1e-3, 1e-5, 1e-7];
const DEFAULT_K = 100;
const DEFAULT_EBN0 = 11;
const DEFAULT_TARGET = 1e-5;

export function RepeaterSection() {
  const [K, setK] = useState(DEFAULT_K);
  const [ebN0Db, setEbN0Db] = useState(DEFAULT_EBN0);
  const [targetBer, setTargetBer] = useState(DEFAULT_TARGET);
  const [resetKey, setResetKey] = useState(0);

  const view = useMemo(
    () => buildRepeaterView({ K, ebN0Db, targetBer }),
    [K, ebN0Db, targetBer],
  );

  const handleReset = () => {
    setK(DEFAULT_K);
    setEbN0Db(DEFAULT_EBN0);
    setTargetBer(DEFAULT_TARGET);
    setResetKey((k) => k + 1);
  };

  return (
    <div className="module-layout">
      <aside className="modulation__controls">
        <Panel title={t('modulation.repeater.title')}>
          <Slider
            label={t('modulation.repeater.hops')}
            value={K}
            min={1}
            max={200}
            step={1}
            onChange={setK}
          />
          <Slider
            label={t('modulation.ebn0')}
            value={ebN0Db}
            min={0}
            max={20}
            step={0.5}
            unit="dB"
            onChange={setEbN0Db}
          />
          <Select<string>
            label={t('modulation.repeater.target')}
            value={String(targetBer)}
            onChange={(v) => setTargetBer(Number(v))}
            options={TARGET_OPTIONS.map((b) => ({ value: String(b), label: b.toExponential(0) }))}
          />
          <button type="button" onClick={handleReset} className="btn--reset">
            {t('modulation.repeater.reset')}
          </button>
        </Panel>
      </aside>

      <div className="modulation__content">
        <div className="modulation__readouts">
          <Readout
            label={t('modulation.repeater.readout.regenNow')}
            value={view.regenNow.toExponential(2)}
            tone="ok"
          />
          <Readout
            label={t('modulation.repeater.readout.analogNow')}
            value={view.analogNow.toExponential(2)}
          />
          <Readout
            label={t('modulation.repeater.readout.reqRegen')}
            value={`${view.reqRegenDb.toFixed(1)} dB`}
          />
          <Readout
            label={t('modulation.repeater.readout.reqAnalog')}
            value={`${view.reqAnalogDb.toFixed(1)} dB`}
          />
          <Readout
            label={t('modulation.repeater.readout.gap')}
            value={`${view.gapDb.toFixed(1)} dB`}
            tone="ok"
          />
        </div>

        <Panel title={t('modulation.repeater.panel.ber')}>
          <RepeaterBerPanel key={`ber-${resetKey}`} view={view} ebN0Db={ebN0Db} />
          <div className="modulation__legend">
            <span className="lg-live">{t('modulation.repeater.legend.regen')}</span>
            <span className="lg-sim">{t('modulation.repeater.legend.analog')}</span>
          </div>
        </Panel>

        <Panel title={t('modulation.repeater.panel.hop')}>
          <HopNoisePanel view={view} />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('modulation.repeater.card.regen.title')} accent="green">
            <HintText text={t('modulation.repeater.card.regen.body')} />
          </InfoCard>
          <InfoCard title={t('modulation.repeater.card.analog.title')} accent="orange">
            <HintText text={t('modulation.repeater.card.analog.body')} />
          </InfoCard>
          <InfoCard title={t('modulation.repeater.card.why.title')} accent="blue">
            <HintText text={t('modulation.repeater.card.why.body')} />
          </InfoCard>
        </div>

        <TheoryBox title={t('modulation.repeater.theory.title')}>
          <p>{t('modulation.repeater.theory.regen')}</p>
          <Formula tex="P_b \approx K\,Q\!\left(\sqrt{2\mathcal{E}_b/N_0}\right)" block />
          <p>{t('modulation.repeater.theory.analog')}</p>
          <Formula tex="P_b = Q\!\left(\sqrt{2\mathcal{E}_b/(K N_0)}\right)" block />
        </TheoryBox>
      </div>
    </div>
  );
}
