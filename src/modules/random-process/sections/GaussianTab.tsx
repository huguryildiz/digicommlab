import { useState } from 'react';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { GaussianProcessSection } from './gaussian/GaussianProcessSection';
import { WhiteNoiseSection } from './gaussian/WhiteNoiseSection';
import { FilteredNoiseSection } from './gaussian/FilteredNoiseSection';

type Sub = 'gaussian' | 'white' | 'filtered';

/**
 * §5.3 Gaussian and White Processes.
 * Three sub-tabs: Gaussian processes (5.3.1), white & thermal noise (5.3.2), and
 * bandpass-filtered noise with in-phase/quadrature decomposition + noise-equivalent
 * bandwidth (5.3.3).
 */
export function GaussianTab() {
  const [sub, setSub] = useState<Sub>('gaussian');

  return (
    <div className="rp__section">
      <div className="rp__subtabbar">
        <Segmented<Sub>
          ariaLabel={t('rp.gauss.sub.ariaLabel')}
          value={sub}
          options={[
            { value: 'gaussian', label: t('rp.gauss.sub.gaussian') },
            { value: 'white', label: t('rp.gauss.sub.white') },
            { value: 'filtered', label: t('rp.gauss.sub.filtered') },
          ]}
          onChange={setSub}
        />
      </div>

      {sub === 'gaussian' && <GaussianProcessSection />}
      {sub === 'white' && <WhiteNoiseSection />}
      {sub === 'filtered' && <FilteredNoiseSection />}
    </div>
  );
}
