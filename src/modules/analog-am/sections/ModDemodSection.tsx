import { useState } from 'react';
import { Panel, Slider, Select, Readout, TheoryBox, Formula, TransportControls } from '@/components';
import { t } from '@/i18n';
import type { AmMode } from '@/lib/dsp/analog';
import { buildAnalogDemodView, type AnalogAmParams, type AnalogDemodParams } from '../model';
import { DemodulationPanel } from '../panels';
import type { SectionProps } from './types';

type DemodMethod = AnalogDemodParams['method'];

export function ModDemodSection({ clock, loop }: SectionProps) {
  const [demodMethod, setDemodMethod] = useState<DemodMethod>('envelope');
  const [msgFreq, setMsgFreq] = useState(1000);
  const [carrierFreq, setCarrierFreq] = useState(20000);
  const [modIndex, setModIndex] = useState(0.5);

  const amParams: AnalogAmParams = {
    mode: 'conventional' as AmMode,
    messageFreq: msgFreq,
    carrierFreq,
    carrierAmp: 1,
    modIndex,
  };
  const demodView = buildAnalogDemodView({ method: demodMethod, amParams }, clock);

  return (
    <div className="module-layout">
      <aside className="analog__controls">
        <Panel title={t('analog.animation')}>
          <TransportControls loop={loop} />
        </Panel>
        <Panel title={t('analog.demod.title')}>
          <Select<DemodMethod>
            label={t('analog.demod.method')}
            value={demodMethod}
            onChange={setDemodMethod}
            options={[
              { value: 'envelope', label: t('analog.demod.method.envelope') },
              { value: 'coherent', label: t('analog.demod.method.coherent') },
              { value: 'pll', label: t('analog.demod.method.pll') },
            ]}
          />
          <Slider
            label={t('analog.am.messageFreq')}
            value={msgFreq}
            min={100}
            max={5000}
            step={100}
            unit="Hz"
            onChange={setMsgFreq}
          />
          <Slider
            label={t('analog.am.carrierFreq')}
            value={carrierFreq}
            min={5000}
            max={50000}
            step={1000}
            unit="Hz"
            onChange={setCarrierFreq}
          />
          <Slider
            label={t('analog.am.modIndex')}
            value={modIndex}
            min={0}
            max={2}
            step={0.05}
            onChange={setModIndex}
          />
        </Panel>
      </aside>

      <div className="analog__content">
        <div className="analog__readouts">
          <Readout
            label={t('analog.demod.method')}
            value={t(`analog.demod.method.${demodMethod}`)}
          />
          <Readout
            label={t('analog.demod.fidelity')}
            value={t(demodView.faithful ? 'analog.demod.faithful' : 'analog.demod.distorted')}
            tone={demodView.faithful ? 'ok' : 'err'}
          />
        </div>

        <div className="analog__plots">
          <Panel title={t('analog.demod.title')}>
            <DemodulationPanel view={demodView} />
          </Panel>
        </div>

        <TheoryBox title={t('analog.theory.title')}>
          <p>
            <strong>{t('analog.demod.method.coherent')}:</strong>
            <Formula tex="\\mathrm{LPF}\\{u(t)\\cos 2\\pi f_c t\\} \\propto \\tfrac{1}{2} m(t)" block />
          </p>
          <p>
            <strong>{t('analog.demod.method.envelope')}:</strong>
            <Formula tex="v(t) \\propto A_c[1 + a\\,m_n(t)], \\quad a \\le 1" block />
          </p>
          <p>
            <strong>{t('analog.demod.method.pll')}:</strong>
            <Formula tex="\\dot{\\hat{\\theta}}(t) = 2\\pi f_c + G\\,e(t)" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
