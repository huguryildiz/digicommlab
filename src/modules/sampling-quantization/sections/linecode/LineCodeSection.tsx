// §8.3 Baseband Digital Data Transmission — Line Coding (Proakis Ch. 8).
// Draws and compares up to 8 line-code waveforms for a configurable bit pattern.
// DSP lives in src/lib/dsp/linecode.ts (do not modify).

import { useMemo, useState } from 'react';
import {
  Panel,
  Slider,
  Select,
  Toggle,
  Readout,
  InfoCard,
  HintText,
} from '@/components';
import { t } from '@/i18n';
import { useZoom } from '@/lib/plot/useZoom';
import {
  LINE_CODES,
  lineCodeWaveform,
  dcLevel,
  transitionCount,
  type LineCode,
} from '@/lib/dsp/linecode';
import { LineCodePanel } from './linecode-panels';
import '@/modules/sampling-quantization/sampling-quantization.css';

// ---------------------------------------------------------------------------
// Bit-pattern presets — fully deterministic, no Math.random in render
// ---------------------------------------------------------------------------

type PresetKey = 'alt' | 'burst' | 'ones';

// Fixed pattern arrays; count slider trims or tiles these
const PRESET_ARRAYS: Record<PresetKey, number[]> = {
  alt: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  burst: [1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1],
  ones: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};

/** Tile/trim the source pattern to exactly `n` bits. */
function makeBits(source: number[], n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(source[i % source.length]);
  return out;
}

// Default visible codes (pedagogically important subset)
const DEFAULT_ENABLED = new Set<LineCode>(['unipolar-nrz', 'polar-nrz', 'ami', 'manchester']);

// ---------------------------------------------------------------------------
// Section component
// ---------------------------------------------------------------------------

/** §8.3 Line Coding — comparison of baseband waveform formats. */
export function LineCodeSection() {
  const [preset, setPreset] = useState<PresetKey>('alt');
  const [count, setCount] = useState(8);
  const [enabled, setEnabled] = useState<Set<LineCode>>(DEFAULT_ENABLED);

  // Derive bit pattern deterministically from preset + count
  const bits = useMemo(() => makeBits(PRESET_ARRAYS[preset], count), [preset, count]);

  // Key that identifies the pattern length — used to reset zoom when N changes
  const N = bits.length;

  // Single shared zoom/pan instance drives all stacked waveform panels
  const [lo, hi, onWheel, , onPan] = useZoom(0, N, {
    minSpan: 2,
    maxSpan: N,
    clampMin: 0,
    clampMax: N,
  });
  const domain: [number, number] = [lo, hi];

  // Toggle a single line code on/off
  function toggleCode(code: LineCode, on: boolean) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (on) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  // Selected codes in pedagogical order
  const selectedCodes = LINE_CODES.filter((info) => enabled.has(info.code));

  // Readout metrics — computed per selected code
  const metrics = useMemo(
    () =>
      selectedCodes.map((info) => {
        const wave = lineCodeWaveform(bits, info.code);
        return {
          code: info.code,
          label: info.label,
          dc: dcLevel(wave),
          transPerBit: N > 0 ? transitionCount(wave) / N : 0,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bits, enabled],
  );

  return (
    <div className="module-layout">
      {/* ------------------------------------------------------------------ */}
      {/* LEFT SIDEBAR — controls                                             */}
      {/* ------------------------------------------------------------------ */}
      <aside className="sampling__controls">
        <Panel title={t('adc.lc.pattern')}>
          <Select<PresetKey>
            label={t('adc.lc.pattern')}
            value={preset}
            onChange={setPreset}
            options={[
              { value: 'alt', label: t('adc.lc.preset.alt') },
              { value: 'burst', label: t('adc.lc.preset.burst') },
              { value: 'ones', label: t('adc.lc.preset.ones') },
            ]}
          />
          <Slider
            label={t('adc.lc.count')}
            value={count}
            min={4}
            max={16}
            step={1}
            unit="bits"
            onChange={setCount}
          />
        </Panel>

        <Panel title={t('adc.lc.codes')}>
          {LINE_CODES.map((info) => (
            <Toggle
              key={info.code}
              label={info.label}
              checked={enabled.has(info.code)}
              onChange={(on) => toggleCode(info.code, on)}
            />
          ))}
        </Panel>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* RIGHT CONTENT — stacked waveform panels + readouts + info cards     */}
      {/* ------------------------------------------------------------------ */}
      <div className="sampling__content">
        {/* Stacked line-code panels — one per selected code */}
        {selectedCodes.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', padding: '16px 0' }}>
            Select at least one line code to display.
          </p>
        ) : (
          <div className="sampling__panels">
            {selectedCodes.map((info) => (
              // key includes pattern + N so zoom resets when pattern changes
              <Panel
                key={`${info.code}-${preset}-${N}`}
                title={info.label}
              >
                <LineCodePanel
                  bits={bits}
                  code={info.code}
                  label={info.label}
                  domain={domain}
                  onWheel={onWheel}
                  onPan={onPan}
                />
              </Panel>
            ))}
          </div>
        )}

        {/* Readouts: DC level + transitions/bit for each selected code */}
        {selectedCodes.length > 0 && (
          <div className="sampling__readouts">
            {metrics.map((m) => (
              <Readout
                key={`dc-${m.code}`}
                label={`${m.label} — ${t('adc.lc.dc')}`}
                value={m.dc.toFixed(3)}
              />
            ))}
            {metrics.map((m) => (
              <Readout
                key={`tr-${m.code}`}
                label={`${m.label} — ${t('adc.lc.transitions')}`}
                value={m.transPerBit.toFixed(2)}
                unit="/bit"
              />
            ))}
          </div>
        )}

        {/* Info cards */}
        <div className="info-cards">
          <InfoCard title={t('adc.card.linecode.title')} accent="green">
            <p>
              <HintText text={t('adc.card.linecode.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.dcbalance.title')} accent="orange">
            <p>
              <HintText text={t('adc.card.dcbalance.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.selfclock.title')} accent="blue">
            <p>
              <HintText text={t('adc.card.selfclock.body')} />
            </p>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
