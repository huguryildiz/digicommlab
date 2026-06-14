import { Panel, Select, Slider, Toggle } from '@/components';
import { t } from '@/i18n';
import type { AnalogScheme, ScenarioParams } from './model';

interface Props {
  params: ScenarioParams;
  set: (patch: Partial<ScenarioParams>) => void;
}

const SCHEME_OPTIONS: { value: AnalogScheme; labelKey: string }[] = [
  { value: 'dsb', labelKey: 'an.gen.scheme.dsb' },
  { value: 'ssb', labelKey: 'an.gen.scheme.ssb' },
  { value: 'am', labelKey: 'an.gen.scheme.am' },
  { value: 'fm', labelKey: 'an.gen.scheme.fm' },
];

export function ScenarioControls({ params, set }: Props) {
  const isAm = params.scheme === 'am';
  const isFm = params.scheme === 'fm';

  return (
    <Panel title={t('an.gen.title')}>
      <Select
        label={t('an.gen.scheme')}
        value={params.scheme}
        options={SCHEME_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
        onChange={(v) => set({ scheme: v as AnalogScheme })}
      />
      <Slider
        label={t('an.gen.cnr')}
        min={0}
        max={40}
        step={1}
        value={params.cnrDb}
        onChange={(v) => set({ cnrDb: v })}
      />
      {isAm && (
        <Slider
          label={t('an.gen.amIndex')}
          min={0.1}
          max={1}
          step={0.05}
          value={params.amIndex}
          onChange={(v) => set({ amIndex: v })}
        />
      )}
      {isFm && (
        <Slider
          label={t('an.gen.beta')}
          min={1}
          max={15}
          step={1}
          value={params.beta}
          onChange={(v) => set({ beta: v })}
        />
      )}
      {isFm && (
        <Toggle
          label={t('an.gen.emphasis')}
          checked={params.emphasis}
          onChange={(v) => set({ emphasis: v })}
        />
      )}
    </Panel>
  );
}
