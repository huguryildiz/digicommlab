import { Panel } from '@/components';
import { t } from '@/i18n';

/** Stub shown for sub-tabs whose simulation is planned but not yet built. */
export function PlaceholderSection({ bodyKey }: { bodyKey: string }) {
  return (
    <Panel title={t('adc.placeholder.title')}>
      <p className="adc__placeholder">{t(bodyKey)}</p>
    </Panel>
  );
}
