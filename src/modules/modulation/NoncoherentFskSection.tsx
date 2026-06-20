import { useMemo, useRef, useState } from 'react';
import {
  Panel,
  Slider,
  Select,
  Readout,
  TheoryBox,
  Formula,
  HintText,
  InfoCard,
  TransportControls,
} from '@/components';
import { t } from '@/i18n';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { simulateNoncoherentFsk } from '@/lib/dsp/noncoherent';
import { buildNoncohView, sampleNoncohBank } from './noncoh-model';
import { DetectorBankPanel, PhasorPanel, NoncohBerPanel } from './noncoh-panels';
import './modulation.css';

const M_OPTIONS = [2, 4, 8];
const BATCH = 2000;
const DEFAULT_M = 4;
const DEFAULT_EBN0 = 8;

export function NoncoherentFskSection() {
  const [M, setM] = useState(DEFAULT_M);
  const [ebN0Db, setEbN0Db] = useState(DEFAULT_EBN0);
  const [nonce, setNonce] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [liveSer, setLiveSer] = useState<{ errors: number; total: number } | null>(null);

  const errRef = useRef(0);
  const totRef = useRef(0);
  const seedRef = useRef(1000);
  const bankSeedRef = useRef(2024);

  const view = useMemo(() => buildNoncohView({ M, ebN0Db }), [M, ebN0Db]);
  const bank = useMemo(
    () => sampleNoncohBank({ M, ebN0Db, seed: bankSeedRef.current + nonce }),
    [M, ebN0Db, nonce],
  );

  const resetCounts = () => {
    errRef.current = 0;
    totRef.current = 0;
    setLiveSer(null);
  };

  const handleM = (m: number) => {
    setM(m);
    resetCounts();
  };
  const handleEbN0 = (v: number) => {
    setEbN0Db(v);
    resetCounts();
  };

  const loop = useSimulationLoop({
    ticksPerSecond: 4,
    onTick: () => {
      const r = simulateNoncoherentFsk({ M, ebN0Db, numSymbols: BATCH, seed: seedRef.current++ });
      errRef.current += r.symErrors;
      totRef.current += r.totalSymbols;
      setLiveSer({ errors: errRef.current, total: totRef.current });
      setNonce((n) => n + 1); // advance the detector-bank snapshot each tick
    },
    onReset: resetCounts,
  });

  const livePoint =
    liveSer && liveSer.total > 0 ? { ebN0Db, ser: liveSer.errors / liveSer.total } : undefined;

  const handleReset = () => {
    setM(DEFAULT_M);
    setEbN0Db(DEFAULT_EBN0);
    setNonce(0);
    resetCounts();
    loop.reset();
    setResetKey((k) => k + 1);
  };

  return (
    <div className="module-layout">
      <aside className="modulation__controls">
        <Panel title={t('modulation.noncoh.title')}>
          <Select<string>
            label={t('modulation.M')}
            value={String(M)}
            onChange={(v) => handleM(Number(v))}
            options={M_OPTIONS.map((m) => ({ value: String(m), label: String(m) }))}
          />
          <Slider
            label={t('modulation.ebn0')}
            value={ebN0Db}
            min={0}
            max={14}
            step={0.5}
            unit="dB"
            onChange={handleEbN0}
          />
          <button type="button" onClick={() => setNonce((n) => n + 1)}>
            {t('modulation.noncoh.resample')}
          </button>
          <button type="button" onClick={handleReset} className="btn--reset">
            {t('modulation.noncoh.reset')}
          </button>
          <TransportControls loop={loop} />
        </Panel>
      </aside>

      <div className="modulation__content">
        <div className="modulation__readouts">
          <Readout label={t('modulation.noncoh.readout.bits')} value={view.bitsPerSymbol} />
          <Readout
            label={t('modulation.noncoh.readout.peTheory')}
            value={view.theoryNow.toExponential(2)}
          />
          <Readout
            label={t('modulation.noncoh.readout.serLive')}
            value={livePoint ? livePoint.ser.toExponential(2) : '—'}
            tone={livePoint ? 'ok' : undefined}
          />
          <Readout
            label={t('modulation.noncoh.readout.errors')}
            value={liveSer ? `${liveSer.errors} / ${liveSer.total}` : '—'}
          />
        </div>

        <div className="modulation__plots">
          <Panel title={t('modulation.noncoh.panel.bank')}>
            <DetectorBankPanel view={view} bank={bank} />
          </Panel>
          <Panel title={<HintText text={t('modulation.noncoh.panel.phasor')} />}>
            <PhasorPanel view={view} bank={bank} />
          </Panel>
        </div>

        <Panel title={<HintText text={t('modulation.noncoh.panel.ber')} />}>
          <NoncohBerPanel key={resetKey} view={view} ebN0Db={ebN0Db} livePoint={livePoint} />
          <div className="modulation__legend">
            <span className="lg-theory">{t('modulation.noncoh.legend.noncoh')}</span>
            <span className="lg-sim">{t('modulation.noncoh.legend.coherent')}</span>
            <span className="lg-live">{t('modulation.noncoh.legend.live')}</span>
          </div>
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('modulation.noncoh.card.squarelaw.title')} accent="green">
            <HintText text={t('modulation.noncoh.card.squarelaw.body')} />
          </InfoCard>
          <InfoCard title={t('modulation.noncoh.card.nophase.title')} accent="blue">
            <HintText text={t('modulation.noncoh.card.nophase.body')} />
          </InfoCard>
          <InfoCard title={t('modulation.noncoh.card.penalty.title')} accent="orange">
            <HintText text={t('modulation.noncoh.card.penalty.body')} />
          </InfoCard>
        </div>

        <TheoryBox title={t('modulation.noncoh.theory.title')}>
          <p>{t('modulation.noncoh.theory.decide')}</p>
          <Formula tex="\hat{m}=\arg\max_m\big(y_{mc}^2+y_{ms}^2\big)" block />
          <p>{t('modulation.noncoh.theory.pb')}</p>
          <Formula tex="P_b=\tfrac12\,e^{-\mathcal{E}_b/2N_0}" block />
          <p>{t('modulation.noncoh.theory.pm')}</p>
          <Formula
            tex="P_M=\sum_{n=1}^{M-1}(-1)^{n+1}\binom{M-1}{n}\frac{1}{n+1}\,e^{-\frac{n}{n+1}\frac{\mathcal{E}_s}{N_0}}"
            block
          />
        </TheoryBox>
      </div>
    </div>
  );
}
