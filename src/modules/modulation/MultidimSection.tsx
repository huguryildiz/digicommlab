import { useMemo, useState } from 'react';
import { Panel, Slider, Select, Readout, TheoryBox, Formula, HintText, InfoCard } from '@/components';
import { t } from '@/i18n';
import type { FamilyKind } from '@/lib/dsp/multidim';
import { buildMultidimView } from './multidim-model';
import { MultidimPePanel, SimplexGainPanel } from './multidim-panels';
import './modulation.css';

const KIND_OPTIONS: FamilyKind[] = ['orthogonal', 'biorthogonal', 'simplex'];
const M_OPTIONS = [4, 8, 16];
const DEFAULT_KIND: FamilyKind = 'simplex';
const DEFAULT_M = 8;
const DEFAULT_EBN0 = 8;

export function MultidimSection() {
  const [kind, setKind] = useState<FamilyKind>(DEFAULT_KIND);
  const [M, setM] = useState(DEFAULT_M);
  const [ebN0Db, setEbN0Db] = useState(DEFAULT_EBN0);
  const [resetKey, setResetKey] = useState(0);

  const view = useMemo(() => buildMultidimView({ kind, M, ebN0Db }), [kind, M, ebN0Db]);

  const handleReset = () => {
    setKind(DEFAULT_KIND);
    setM(DEFAULT_M);
    setEbN0Db(DEFAULT_EBN0);
    setResetKey((k) => k + 1);
  };

  const gammaText = view.gamma === null ? t('modulation.multidim.gamma.mixed') : view.gamma.toFixed(3);

  return (
    <div className="module-layout">
      <aside className="modulation__controls">
        <Panel title={t('modulation.multidim.title')}>
          <Select<FamilyKind>
            label={t('modulation.multidim.family')}
            value={kind}
            onChange={setKind}
            options={KIND_OPTIONS.map((k) => ({
              value: k,
              label: t(`modulation.multidim.family.${k}`),
            }))}
          />
          <Select<string>
            label={t('modulation.M')}
            value={String(M)}
            onChange={(v) => setM(Number(v))}
            options={M_OPTIONS.map((m) => ({ value: String(m), label: String(m) }))}
          />
          <Slider
            label={t('modulation.ebn0')}
            value={ebN0Db}
            min={0}
            max={14}
            step={0.5}
            unit="dB"
            onChange={setEbN0Db}
          />
          <button type="button" onClick={handleReset} className="btn--reset">
            {t('modulation.multidim.reset')}
          </button>
        </Panel>
      </aside>

      <div className="modulation__content">
        <div className="modulation__readouts">
          <Readout label={t('modulation.multidim.readout.bits')} value={view.bitsPerSymbol} />
          <Readout label={t('modulation.multidim.readout.dim')} value={view.dim} />
          <Readout label={t('modulation.multidim.readout.dmin')} value={view.dMin.toFixed(3)} />
          <Readout
            label={t('modulation.multidim.readout.energy')}
            value={view.energyAvg.toFixed(3)}
          />
          <Readout label={t('modulation.multidim.readout.gamma')} value={gammaText} />
          <Readout
            label={t('modulation.multidim.readout.peTheory')}
            value={view.theoryNow.toExponential(2)}
          />
        </div>

        <Panel title={t('modulation.multidim.panel.pe')}>
          <MultidimPePanel key={`pe-${resetKey}`} view={view} ebN0Db={ebN0Db} />
          <div className="modulation__legend">
            <span className="lg-theory">{t('modulation.multidim.legend.exact')}</span>
            <span className="lg-marker">{t('modulation.multidim.legend.union')}</span>
          </div>
        </Panel>

        <Panel title={t('modulation.multidim.panel.gain')}>
          <SimplexGainPanel key={`gain-${resetKey}`} view={view} />
          <div className="modulation__legend">
            <span className="lg-sim">{t('modulation.multidim.legend.orth')}</span>
            <span className="lg-live">{t('modulation.multidim.legend.simplex')}</span>
          </div>
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('modulation.multidim.card.orthogonal.title')} accent="orange">
            <HintText text={t('modulation.multidim.card.orthogonal.body')} />
          </InfoCard>
          <InfoCard title={t('modulation.multidim.card.biorthogonal.title')} accent="blue">
            <HintText text={t('modulation.multidim.card.biorthogonal.body')} />
          </InfoCard>
          <InfoCard title={t('modulation.multidim.card.simplex.title')} accent="green">
            <HintText text={t('modulation.multidim.card.simplex.body')} />
          </InfoCard>
          <InfoCard title={t('modulation.multidim.card.union.title')} accent="blue">
            <HintText text={t('modulation.multidim.card.union.body')} />
          </InfoCard>
        </div>

        <TheoryBox title={t('modulation.multidim.theory.title')}>
          <p>{t('modulation.multidim.theory.simplex')}</p>
          <Formula tex="s'_m(t)=s_m(t)-\tfrac1M\sum_{k=1}^{M}s_k(t)" block />
          <p>{t('modulation.multidim.theory.gain')}</p>
          <Formula tex="\Delta_{\mathrm{dB}}=10\log_{10}\frac{M}{M-1}" block />
          <p>{t('modulation.multidim.theory.union')}</p>
          <Formula tex="P_M\le(M-1)\,Q\!\left(\frac{d_{\min}}{\sqrt{2N_0}}\right)" block />
          <p className="muted">{t('modulation.multidim.note.coded')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
