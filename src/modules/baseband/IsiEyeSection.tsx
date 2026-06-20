// src/modules/baseband/IsiEyeSection.tsx
import { useState, useMemo, useEffect } from 'react';
import {
  Panel,
  Select,
  Slider,
  Toggle,
  Readout,
  InfoCard,
  HintText,
  TheoryBox,
  Formula,
  TransportControls,
} from '@/components';
import { t } from '@/i18n';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { buildIsiEyeView, type IsiEyeParams } from './model';
import { IsiFormationPanel, AnnotatedEyePanel } from './panels';

export function IsiEyeSection() {
  const [M, setM] = useState<2 | 4>(2);
  const [isiGain, setIsiGain] = useState(0.3);
  const [neighborK, setNeighborK] = useState(2);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [visibleCount, setVisibleCount] = useState(1);
  const [resetKey, setResetKey] = useState(0);

  const view = useMemo(() => {
    const params: IsiEyeParams = { M, neighborK, isiGain, sps: 16 };
    return buildIsiEyeView(params);
  }, [M, neighborK, isiGain]);

  const total = view.traces.length;

  const loop = useSimulationLoop({
    ticksPerSecond: 6,
    onTick: () => setVisibleCount((c) => Math.min(c + 1, total)),
    onReset: () => setVisibleCount(1),
  });

  // Rebuild → show the fully-formed eye (so the annotated panel is always complete);
  // the user replays the formation with Reset + Play.
  useEffect(() => {
    setVisibleCount(total);
  }, [total]);

  // Stop the loop once the eye is fully formed.
  useEffect(() => {
    if (loop.running && visibleCount >= total) loop.stop();
  }, [loop, visibleCount, total]);

  const reset = () => {
    setM(2);
    setIsiGain(0.3);
    setNeighborK(2);
    setShowAnnotations(true);
    loop.reset();
    setResetKey((k) => k + 1);
  };

  return (
    <div className="module-layout">
      <aside className="baseband__controls">
        <Panel title={t('baseband.tab.isi')}>
          <Select
            label={t('baseband.isi.M')}
            value={String(M)}
            options={[
              { value: '2', label: '2-PAM' },
              { value: '4', label: '4-PAM' },
            ]}
            onChange={(v) => setM(Number(v) as 2 | 4)}
          />
          <Slider
            label={t('baseband.isi.isiGain')}
            value={isiGain}
            min={0}
            max={0.9}
            step={0.05}
            onChange={setIsiGain}
          />
          <Slider
            label={t('baseband.isi.K')}
            value={neighborK}
            min={1}
            max={2}
            step={1}
            onChange={(v) => setNeighborK(v as number)}
          />
          <Toggle
            label={t('baseband.isi.annotations')}
            checked={showAnnotations}
            onChange={setShowAnnotations}
          />
          <button type="button" onClick={reset}>
            {t('baseband.reset')}
          </button>
        </Panel>
      </aside>

      <div className="baseband__content">
        <div className="baseband__readouts">
          <Readout label={t('baseband.readout.eyeHeight')} value={view.eyeHeight.toFixed(2)} />
          <Readout label={t('baseband.readout.noiseMargin')} value={view.noiseMargin.toFixed(2)} />
          <Readout label={t('baseband.readout.peakDistortion')} value={view.peakDistortion.toFixed(2)} />
          <Readout label={t('baseband.readout.patternCount')} value={String(view.patternCount)} />
        </div>

        <Panel title={t('baseband.panel.isiFormation')}>
          <TransportControls loop={loop} />
          <IsiFormationPanel key={resetKey} view={view} visibleCount={visibleCount} />
        </Panel>

        <Panel title={t('baseband.panel.isiAnnotated')}>
          <AnnotatedEyePanel key={`${resetKey}-a`} view={view} showAnnotations={showAnnotations} />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('baseband.card.isiForm.title')} accent="green">
            <p>
              <HintText text={t('baseband.card.isiForm.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.card.isiMargin.title')} accent="orange">
            <p>
              <HintText text={t('baseband.card.isiMargin.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.card.isiJitter.title')} accent="blue">
            <p>
              <HintText text={t('baseband.card.isiJitter.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('baseband.card.isiSlope.title')} accent="green">
            <p>
              <HintText text={t('baseband.card.isiSlope.body')} />
            </p>
          </InfoCard>
        </div>

        <TheoryBox title={t('baseband.theory.isi')}>
          <p>
            <Formula
              tex="y_m=x_0 a_m+\sum_{n\neq m} a_n x_{m-n}+w_m\quad(\text{ISI term in the middle})"
              block
            />
          </p>
          <p>
            <Formula
              tex="\text{noise margin}=\tfrac12\,(\text{eye opening}),\qquad \text{peak distortion}=\sum_{n\neq m}|x_{m-n}|"
              block
            />
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
