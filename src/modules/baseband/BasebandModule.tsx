// src/modules/baseband/BasebandModule.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { Segmented } from '@/components';
import { t } from '@/i18n';
import { PulseShapingSection } from './PulseShapingSection';
import { ReceiverSection } from './ReceiverSection';
import { DetectionSection } from './DetectionSection';
import { PowerSpectrumSection } from './PowerSpectrumSection';
import { PartialResponseSection } from './PartialResponseSection';
import { PrDetectionSection } from './PrDetectionSection';
import { IsiEyeSection } from './IsiEyeSection';
import { EyeEqualizationSection } from './EyeEqualizationSection';
import { ChannelDistortionSection } from './ChannelDistortionSection';
import './baseband.css';

type Tab = 'pulse' | 'receiver' | 'detect' | 'psd' | 'pr' | 'prdet' | 'isi' | 'eye' | 'distortion';
const TABS: { value: Tab; key: string }[] = [
  { value: 'pulse', key: 'baseband.tab.pulse' },
  { value: 'receiver', key: 'baseband.tab.receiver' },
  { value: 'detect', key: 'baseband.tab.detect' },
  { value: 'psd', key: 'baseband.tab.psd' },
  { value: 'pr', key: 'baseband.tab.pr' },
  { value: 'prdet', key: 'baseband.tab.prdet' },
  { value: 'isi', key: 'baseband.tab.isi' },
  { value: 'eye', key: 'baseband.tab.eye' },
  { value: 'distortion', key: 'baseband.tab.distortion' },
];

export function BasebandModule() {
  const { tab: slug = '' } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: Tab = (slug as Tab) || 'pulse';

  return (
    <div className="bb-module">
      <Segmented<Tab>
        ariaLabel={t('nav.baseband')}
        value={tab}
        options={TABS.map((tb) => ({ value: tb.value, label: t(tb.key) }))}
        onChange={(v) => navigate(v === 'pulse' ? '/baseband' : `/baseband/${v}`, { replace: true })}
      />
      {tab === 'pulse' && <PulseShapingSection />}
      {tab === 'receiver' && <ReceiverSection />}
      {tab === 'detect' && <DetectionSection />}
      {tab === 'psd' && <PowerSpectrumSection />}
      {tab === 'pr' && <PartialResponseSection />}
      {tab === 'prdet' && <PrDetectionSection />}
      {tab === 'isi' && <IsiEyeSection />}
      {tab === 'eye' && <EyeEqualizationSection />}
      {tab === 'distortion' && <ChannelDistortionSection />}
    </div>
  );
}
