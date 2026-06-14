import { t } from '@/i18n';
import { LANDING_MODULES } from './modules.config';
import { ModuleTile } from './ModuleTile';

export function ModuleBento() {
  return (
    <section className="lab" id="lab">
      <div className="lab__head">
        <span className="lab__kicker">{t('landing.section.kicker')}</span>
        <span className="lab__rule" />
      </div>
      <h2 className="lab__title">
        The <em className="lab__title-em">Modules</em>
      </h2>
      <div className="bento">
        {LANDING_MODULES.map((m) => (
          <ModuleTile key={m.id} m={m} />
        ))}
      </div>
    </section>
  );
}
