import { useState } from 'react';
import { Panel, Slider, Readout, TheoryBox, Formula, TransportControls } from '@/components';
import { t } from '@/i18n';
import { buildAnalogSuperView } from '../model';
import { SuperheterodynePanel } from '../panels';
import type { SectionProps } from './types';

export function AmRadioSection({ clock, loop }: SectionProps) {
  const [stationFreq, setStationFreq] = useState(1_000_000); // 1 MHz (AM band)
  const [ifFreq, setIfFreq] = useState(455_000); // 455 kHz standard IF

  const superView = buildAnalogSuperView({ stationFreq, ifFreq });

  return (
    <div className="module-layout">
      <aside className="analog__controls">
        <Panel title={t('analog.animation')}>
          <TransportControls loop={loop} />
        </Panel>
        <Panel title={t('analog.super.title')}>
          <Slider
            label={t('analog.super.station')}
            value={stationFreq}
            min={530_000}
            max={1_600_000}
            step={10_000}
            unit="Hz"
            onChange={setStationFreq}
          />
          <Slider
            label={t('analog.super.if')}
            value={ifFreq}
            min={100_000}
            max={500_000}
            step={5_000}
            unit="Hz"
            onChange={setIfFreq}
          />
        </Panel>
      </aside>

      <div className="analog__content">
        <div className="analog__readouts">
          <Readout
            label={t('analog.super.lo')}
            value={(superView.loFreq / 1000).toFixed(0)}
            unit="kHz"
          />
          <Readout
            label={t('analog.super.image')}
            value={(superView.imageFreq / 1000).toFixed(0)}
            unit="kHz"
            tone="warn"
          />
        </div>

        <div className="analog__plots">
          <Panel title={t('analog.super.title')}>
            <SuperheterodynePanel view={superView} clock={clock} />
          </Panel>
        </div>

        <TheoryBox title={t('analog.theory.title')}>
          <p>
            <strong>{t('analog.super.title')}:</strong>
            <Formula tex="f_{LO} = f_c + f_{IF}" block />
          </p>
          <p>
            <strong>{t('analog.super.image')}:</strong>
            <Formula tex="f_{image} = f_c + 2 f_{IF}" block />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
