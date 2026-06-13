import { useMemo, useState } from 'react';
import { t } from '@/i18n';
import { DEFAULT_PARAMS, deriveAll, type ScenarioParams } from './model';
import { ScenarioControls } from './panels';
import { FadingChannelSection } from './sections/FadingChannelSection';
import './wireless.css';

export function WirelessModule() {
  const [params, setParams] = useState<ScenarioParams>(DEFAULT_PARAMS);
  const set = (patch: Partial<ScenarioParams>) => setParams((p) => ({ ...p, ...patch }));
  const d = useMemo(() => deriveAll(params), [params]);

  return (
    <div className="wl">
      <header className="wl__head">
        <h1>{t('wl.title')}</h1>
        <p>{t('wl.subtitle')}</p>
      </header>
      <ScenarioControls params={params} set={set} />
      <div className="wl__grid">
        <FadingChannelSection params={params} d={d} />
      </div>
    </div>
  );
}
