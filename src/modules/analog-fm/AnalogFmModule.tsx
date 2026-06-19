/**
 * Angle Modulation (FM/PM) module — 4-tab shell (Proakis & Salehi Chapter 4).
 * Tabs: Representation (§4.1) · Spectrum (§4.2) · Modulators & Demodulators (§4.3) ·
 * FM Radio Broadcasting (§4.4).
 * Tab selection is URL-addressable: /analog-fm (Representation) and /analog-fm/:tab.
 *
 * Phase 1 ships Representation + Spectrum; Mod/Demod (real discriminator) and
 * FM Radio arrive in later phases and currently render a short placeholder.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { RepresentationSection } from './sections/RepresentationSection';
import { SpectrumSection } from './sections/SpectrumSection';
import { ModDemodSection } from './sections/ModDemodSection';
import { RadioSection } from './sections/RadioSection';
import './analog-fm.css';

type Tab = 'repr' | 'spectrum' | 'moddemod' | 'radio';


export function AnalogFmModule() {
  // Tab is URL-addressable: /analog-fm → repr; /analog-fm/:tab → that tab.
  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: Tab = (slug as Tab) || 'repr';

  // Shared animation clock — drives the Mod/Demod animated diagrams.
  const [clock, setClock] = useState(0);
  const loop = useSimulationLoop({
    ticksPerSecond: 30,
    onTick: (_dt, simTime) => setClock(simTime),
    onReset: () => setClock(0),
  });
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) loop.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (v: Tab) => {
    navigate(v === 'repr' ? '/analog-fm' : `/analog-fm/${v}`, { replace: true });
  };

  return (
    <div className="analog">
      <div className="analog__tabbar">
        <Segmented<Tab>
          ariaLabel={t('analog.fm.tab.ariaLabel')}
          value={tab}
          options={[
            { value: 'repr', label: t('analog.fm.tab.repr') },
            { value: 'spectrum', label: t('analog.fm.tab.spectrum') },
            { value: 'moddemod', label: t('analog.fm.tab.moddemod') },
            { value: 'radio', label: t('analog.fm.tab.radio') },
          ]}
          onChange={handleTabChange}
        />
      </div>

      {tab === 'repr' && <RepresentationSection />}
      {tab === 'spectrum' && <SpectrumSection />}
      {tab === 'moddemod' && <ModDemodSection clock={clock} loop={loop} />}
      {tab === 'radio' && <RadioSection />}
    </div>
  );
}
