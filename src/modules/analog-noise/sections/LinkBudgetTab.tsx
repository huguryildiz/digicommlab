import { useState } from 'react';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { ThermalNoiseSection } from './link/ThermalNoiseSection';
import { NoiseFigureSection } from './link/NoiseFigureSection';
import { PathLossSection } from './link/PathLossSection';
import { RepeaterSection } from './link/RepeaterSection';

type Sub = 'thermal' | 'figure' | 'pathloss' | 'repeater';

export function LinkBudgetTab() {
  const [sub, setSub] = useState<Sub>('thermal');

  return (
    <div className="an__section">
      <div className="an__subtabbar">
        <Segmented<Sub>
          ariaLabel={t('an.link.sub.ariaLabel')}
          value={sub}
          options={[
            { value: 'thermal', label: t('an.link.sub.thermal') },
            { value: 'figure', label: t('an.link.sub.figure') },
            { value: 'pathloss', label: t('an.link.sub.pathloss') },
            { value: 'repeater', label: t('an.link.sub.repeater') },
          ]}
          onChange={setSub}
        />
      </div>
      {sub === 'thermal' && <ThermalNoiseSection />}
      {sub === 'figure' && <NoiseFigureSection />}
      {sub === 'pathloss' && <PathLossSection />}
      {sub === 'repeater' && <RepeaterSection />}
    </div>
  );
}
