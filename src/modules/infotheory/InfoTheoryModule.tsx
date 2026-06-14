import { useState } from 'react';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { EntropySection } from './EntropySection';
import { PrefixKraftSection } from './PrefixKraftSection';
import { HuffmanSection } from './HuffmanSection';
import { LempelZivSection } from './LempelZivSection';
import './infotheory.css';

type Tab = 'entropy' | 'prefix' | 'huffman' | 'lz';

const TABS: { value: Tab; label: string }[] = [
  { value: 'entropy', label: t('it.tab.entropy') },
  { value: 'prefix', label: t('it.tab.prefix') },
  { value: 'huffman', label: t('it.tab.huffman') },
  { value: 'lz', label: t('it.tab.lz') },
];

export function InfoTheoryModule() {
  const [tab, setTab] = useState<Tab>('entropy');
  return (
    <div className="it-module">
      <Segmented<Tab>
        ariaLabel={t('it.tab.aria')}
        value={tab}
        options={TABS}
        onChange={setTab}
      />
      {tab === 'entropy' && <EntropySection />}
      {tab === 'prefix' && <PrefixKraftSection />}
      {tab === 'huffman' && <HuffmanSection />}
      {tab === 'lz' && <LempelZivSection />}
    </div>
  );
}
