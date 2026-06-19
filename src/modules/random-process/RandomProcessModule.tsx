/**
 * Probability & Random Processes module — 3-tab shell (Proakis & Salehi Chapter 5).
 * Tabs: Probability & Random Variables (§5.1) · Random Processes: Basic Concepts (§5.2) ·
 * Gaussian & White Processes (§5.3). Tab selection is URL-addressable:
 * /random-process (Probability) and /random-process/:tab.
 *
 * All three tabs are complete: §5.1 (Bayes, random variables + Q-function, functions of an RV,
 * joint Gaussian, sums & CLT), §5.2 (single/multiple process views), and §5.3 (Gaussian, white,
 * filtered noise). Every section also renders book-formula info cards (see `cards.tsx`).
 */
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { DEFAULT_PARAMS, deriveAll, type ProcessParams } from './model';
import { ProbabilityTab } from './sections/ProbabilityTab';
import { ProcessTab } from './sections/ProcessTab';
import { GaussianTab } from './sections/GaussianTab';
import './random-process.css';

type Tab = 'prob' | 'process' | 'gaussian';

export function RandomProcessModule() {
  // Tab is URL-addressable: /random-process → prob; /random-process/:tab → that tab.
  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: Tab = (slug as Tab) || 'prob';

  // Shared process parameters drive both the §5.2 and §5.3 views.
  const [params, setParams] = useState<ProcessParams>(DEFAULT_PARAMS);
  const set = (patch: Partial<ProcessParams>) => setParams((p) => ({ ...p, ...patch }));
  const resample = () => setParams((p) => ({ ...p, seed: p.seed + 1 }));
  const reset = () => setParams(DEFAULT_PARAMS);

  const d = useMemo(() => deriveAll(params), [params]);

  const handleTabChange = (v: Tab) => {
    navigate(v === 'prob' ? '/random-process' : `/random-process/${v}`, { replace: true });
  };

  return (
    <div className="rp">
      <div className="rp__tabbar">
        <Segmented<Tab>
          ariaLabel={t('rp.tab.ariaLabel')}
          value={tab}
          options={[
            { value: 'prob', label: t('rp.tab.prob') },
            { value: 'process', label: t('rp.tab.process') },
            { value: 'gaussian', label: t('rp.tab.gaussian') },
          ]}
          onChange={handleTabChange}
        />
      </div>

      {tab === 'prob' && <ProbabilityTab />}
      {tab === 'process' && (
        <ProcessTab params={params} set={set} resample={resample} reset={reset} d={d} />
      )}
      {tab === 'gaussian' && <GaussianTab />}
    </div>
  );
}
