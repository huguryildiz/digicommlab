import { useState } from 'react';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { NoisePsdSection } from './angle/NoisePsdSection';
import { ThresholdSection } from './angle/ThresholdSection';
import { EmphasisSection } from './angle/EmphasisSection';

type Sub = 'psd' | 'threshold' | 'emphasis';

export function AngleNoiseTab() {
  const [sub, setSub] = useState<Sub>('psd');

  return (
    <div className="an__section">
      <div className="an__subtabbar">
        <Segmented<Sub>
          ariaLabel={t('an.angle.sub.ariaLabel')}
          value={sub}
          options={[
            { value: 'psd', label: t('an.angle.sub.psd') },
            { value: 'threshold', label: t('an.angle.sub.threshold') },
            { value: 'emphasis', label: t('an.angle.sub.emphasis') },
          ]}
          onChange={setSub}
        />
      </div>
      {sub === 'psd' && <NoisePsdSection />}
      {sub === 'threshold' && <ThresholdSection />}
      {sub === 'emphasis' && <EmphasisSection />}
    </div>
  );
}
