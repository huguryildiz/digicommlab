import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import type { LandingModule, VizKind } from './modules.config';
import { ConstellationViz } from './viz/ConstellationViz';
import { SamplingViz } from './viz/SamplingViz';
import { EntropyViz } from './viz/EntropyViz';
import { LinkPulseViz } from './viz/LinkPulseViz';
import { FourierViz } from './viz/FourierViz';
import { AmViz } from './viz/AmViz';
import { FmViz } from './viz/FmViz';
import { NoiseViz } from './viz/NoiseViz';
import { NoisySignalViz } from './viz/NoisySignalViz';
import { EyeDiagramViz } from './viz/EyeDiagramViz';
import { ChannelCodingViz } from './viz/ChannelCodingViz';
import { FadingViz } from './viz/FadingViz';
import { ChainViz } from './viz/ChainViz';

function Viz({ kind }: { kind: VizKind }) {
  switch (kind) {
    case 'constellation':
      return <ConstellationViz />;
    case 'sampling':
      return <SamplingViz />;
    case 'entropy':
      return <EntropyViz />;
    case 'linkpulse':
      return <LinkPulseViz />;
    case 'fourier':
      return <FourierViz />;
    case 'am':
      return <AmViz />;
    case 'fm':
      return <FmViz />;
    case 'noise':
      return <NoiseViz />;
    case 'noisysignal':
      return <NoisySignalViz />;
    case 'eye':
      return <EyeDiagramViz />;
    case 'channelcoding':
      return <ChannelCodingViz />;
    case 'fading':
      return <FadingViz />;
    case 'chain':
      return <ChainViz />;
    default:
      return null;
  }
}

export function ModuleTile({ m }: { m: LandingModule }) {
  const soon = m.status === 'soon';
  const description = t(m.descKey);
  const className = [
    'tile',
    m.flagship && 'tile--flagship',
    m.feature && 'tile--feature',
    m.compact && 'tile--compact',
    soon && 'tile--soon',
  ]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      <div className="tile__body">
        <div className="tile__top">
          <span className="tile__num">
            {t('landing.module')} {m.num}
          </span>
          {soon ? (
            <span className="tile__soon">{t('landing.tile.soon')}</span>
          ) : (
            <span className="tile__chapter">{m.chapter}</span>
          )}
        </div>
        <h3 className="tile__title">{t(m.titleKey)}</h3>
        {description ? <p className="tile__desc">{description}</p> : null}
        <span className="tile__open">{soon ? m.chapter : `${t('landing.tile.open')} →`}</span>
      </div>
      {m.viz ? (
        <div className={`tile__viz tile__viz--${m.viz}`} aria-hidden="true">
          <Viz kind={m.viz} />
        </div>
      ) : null}
    </>
  );

  if (soon) {
    return (
      <div className={className} aria-disabled="true">
        {body}
      </div>
    );
  }
  return (
    <Link to={m.route} className={className}>
      {body}
    </Link>
  );
}
