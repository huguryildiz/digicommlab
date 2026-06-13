// src/modules/baseband/BasebandModule.tsx
import { useState } from 'react';
import { t } from '@/i18n';
import { PulseShapingSection } from './PulseShapingSection';
import './baseband.css';

type Tab = 'pulse' | 'receiver' | 'eye';
const TABS: { id: Tab; key: string }[] = [
  { id: 'pulse', key: 'baseband.tab.pulse' },
  { id: 'receiver', key: 'baseband.tab.receiver' },
  { id: 'eye', key: 'baseband.tab.eye' },
];

export function BasebandModule() {
  const [tab, setTab] = useState<Tab>('pulse');
  return (
    <div className="bb-module">
      <nav className="bb-tabs">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            className={tab === tb.id ? 'bb-tab bb-tab--active' : 'bb-tab'}
            onClick={() => setTab(tb.id)}
          >
            {t(tb.key)}
          </button>
        ))}
      </nav>
      {tab === 'pulse' && <PulseShapingSection />}
      {tab === 'receiver' && <div className="bb-section" />}
      {tab === 'eye' && <div className="bb-section" />}
    </div>
  );
}
