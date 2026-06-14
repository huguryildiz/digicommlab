import { describe, it, expect } from 'vitest';
import { buildModulatorView } from '@/modules/analog-am/model';

describe('buildModulatorView', () => {
  const base = { messageFreq: 1000, carrierFreq: 20000, carrierAmp: 1 };

  it('returns time, node signal, and dirty+clean spectra of matching lengths', () => {
    const v = buildModulatorView({ ...base, modulator: 'switching' });
    expect(v.time.length).toBeGreaterThan(0);
    expect(v.node.length).toBe(v.time.length);
    expect(v.output.length).toBe(v.time.length);
    expect(v.dirtyFreq.length).toBe(v.dirtyMag.length);
    expect(v.cleanFreq.length).toBe(v.cleanMag.length);
  });

  it('balanced/ring modulators produce a DSB-SC clean spectrum (carrier suppressed)', () => {
    for (const modulator of ['balanced', 'ring'] as const) {
      const v = buildModulatorView({ ...base, modulator });
      const peak = Math.max(...v.cleanMag);
      const ci = v.cleanFreq.reduce(
        (b, f, i) => (Math.abs(f - base.carrierFreq) < Math.abs(v.cleanFreq[b] - base.carrierFreq) ? i : b),
        0,
      );
      expect(v.cleanMag[ci]).toBeLessThan(0.2 * peak);
    }
  });

  it('power-law/switching produce a clean spectrum with a carrier (conventional AM)', () => {
    for (const modulator of ['power-law', 'switching'] as const) {
      const v = buildModulatorView({ ...base, modulator });
      const peak = Math.max(...v.cleanMag);
      const ci = v.cleanFreq.reduce(
        (b, f, i) => (Math.abs(f - base.carrierFreq) < Math.abs(v.cleanFreq[b] - base.carrierFreq) ? i : b),
        0,
      );
      expect(v.cleanMag[ci]).toBeGreaterThan(0.4 * peak);
    }
  });
});
