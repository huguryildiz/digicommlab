import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { Oscilloscope } from './viz/Oscilloscope';
import { ScopeReadout } from './viz/ScopeReadout';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero__copy">
        <span className="hero__eyebrow">{t('landing.eyebrow')}</span>
        <h1 className="hero__title">
          {t('landing.headline.l1')}
          <br />
          <span className="hero__title-em">{t('landing.headline.l2')}</span>
        </h1>
        <p className="hero__lead">{t('landing.lead')}</p>

        <div className="hero__cta">
          <Link to="/start" className="btn btn--primary">
            ▶ {t('landing.cta.primary')}
          </Link>
        </div>
      </div>

      <div className="hero__scope">
        <Oscilloscope />
        <ScopeReadout />
      </div>
    </section>
  );
}
