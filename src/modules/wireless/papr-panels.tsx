import { Panel, Slider, Select } from '@/components';
import { t } from '@/i18n';
import type { PaprParams } from './papr-model';

interface Props {
  params: PaprParams;
  set: (patch: Partial<PaprParams>) => void;
  reset: () => void;
}

const N_OPTIONS = [
  { value: '32', label: '32' },
  { value: '64', label: '64' },
  { value: '128', label: '128' },
  { value: '256', label: '256' },
];

export function PaprControls({ params, set, reset }: Props) {
  return (
    <Panel title={t('wl.papr.title')}>
      <Select
        label={t('wl.papr.subcarriers')}
        value={String(params.numSubcarriers)}
        options={N_OPTIONS}
        onChange={(v) => set({ numSubcarriers: Number(v) })}
      />
      <Slider
        label={t('wl.papr.clip')}
        min={3}
        max={13}
        step={0.5}
        value={params.clipDb}
        onChange={(v) => set({ clipDb: v })}
      />
      <Slider
        label={t('wl.papr.trials')}
        min={100}
        max={1000}
        step={100}
        value={params.trials}
        onChange={(v) => set({ trials: v })}
      />
      <button type="button" onClick={reset}>
        {t('wl.reset')}
      </button>
    </Panel>
  );
}
