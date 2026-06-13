import { useMemo, useState } from 'react';
import { t } from '@/i18n';
import { DEFAULT_PARAMS, deriveAll, type ScenarioParams } from './model';
import { ScenarioControls } from './panels';
import { DemodOutputSection } from './sections/DemodOutputSection';
import { ComparisonSection } from './sections/ComparisonSection';
import { ThresholdEmphasisSection } from './sections/ThresholdEmphasisSection';
import './analog-noise.css';

export function AnalogNoiseModule() {
  const [params, setParams] = useState<ScenarioParams>(DEFAULT_PARAMS);
  const set = (patch: Partial<ScenarioParams>) => setParams((p) => ({ ...p, ...patch }));
  const d = useMemo(() => deriveAll(params), [params]);

  return (
    <div className="an">
      <header className="an__head">
        <h1>{t('an.title')}</h1>
        <p>{t('an.subtitle')}</p>
      </header>
      <ScenarioControls params={params} set={set} />
      <div className="an__grid">
        <DemodOutputSection params={params} d={d} />
        <ComparisonSection params={params} d={d} />
        <ThresholdEmphasisSection params={params} d={d} />
      </div>
    </div>
  );
}
