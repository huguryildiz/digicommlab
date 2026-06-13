import { describe, it, expect } from 'vitest';
import { buildSeriesSynth } from '@/modules/fourier/model';
import { buildAnalogAmView } from '@/modules/analog/model';

// The animation clock feeds `tStart` into the time-domain builders. The display
// axis stays fixed (local [0, T]) while samples are taken tStart ahead, so the
// waveform scrolls. tStart defaults to 0 → unchanged from the static behaviour.

describe('buildSeriesSynth tStart scrolling', () => {
  it('keeps a fixed local time axis regardless of tStart', () => {
    const a = buildSeriesSynth('square', 1, 10, 0.5, 0);
    const b = buildSeriesSynth('square', 1, 10, 0.5, 1.3);
    expect(b.time[0]).toBeCloseTo(a.time[0], 12);
    expect(b.time[b.time.length - 1]).toBeCloseTo(a.time[a.time.length - 1], 12);
  });

  it('shifts the sampled waveform by tStart (one period -> identical samples)', () => {
    // f0 = 1 Hz -> period 1 s; sampling one period ahead reproduces the wave.
    const a = buildSeriesSynth('square', 1, 12, 0.5, 0);
    const shifted = buildSeriesSynth('square', 1, 12, 0.5, 1);
    for (let i = 0; i < a.ideal.length; i++) {
      expect(shifted.ideal[i]).toBeCloseTo(a.ideal[i], 9);
    }
  });

  it('leaves the line spectrum unchanged when scrolling', () => {
    const a = buildSeriesSynth('square', 1, 10, 0.5, 0);
    const b = buildSeriesSynth('square', 1, 10, 0.5, 0.37);
    expect(b.mags).toEqual(a.mags);
  });
});

describe('buildAnalogAmView tStart scrolling', () => {
  it('samples the message tStart ahead (quarter period -> zero crossing)', () => {
    const fm = 1000; // period 1 ms
    const quarter = 0.25 / fm; // 0.25 ms
    const view = buildAnalogAmView(
      { mode: 'conventional', messageFreq: fm, carrierFreq: 20000, carrierAmp: 1, modIndex: 0.5 },
      quarter,
    );
    // message[0] = cos(2π fm · tStart) = cos(π/2) = 0
    expect(view.message[0]).toBeCloseTo(0, 6);
  });

  it('keeps the analytic AM spectrum lines unchanged when scrolling', () => {
    const params = {
      mode: 'conventional' as const,
      messageFreq: 1000,
      carrierFreq: 20000,
      carrierAmp: 1,
      modIndex: 0.5,
    };
    const a = buildAnalogAmView(params, 0);
    const b = buildAnalogAmView(params, 0.0013);
    expect(b.specFreq).toEqual(a.specFreq);
    expect(b.specMag).toEqual(a.specMag);
  });
});
