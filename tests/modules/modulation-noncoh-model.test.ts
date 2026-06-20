import { describe, it, expect } from 'vitest';
import { buildNoncohView, sampleNoncohBank } from '@/modules/modulation/noncoh-model';
import { noncoherentFskPm } from '@/lib/dsp/noncoherent';

describe('buildNoncohView', () => {
  it('exposes bits/symbol and theoryNow = noncoherentFskPm at the current SNR', () => {
    const v = buildNoncohView({ M: 4, ebN0Db: 8 });
    expect(v.bitsPerSymbol).toBe(2);
    expect(v.theoryNow).toBeCloseTo(noncoherentFskPm(4, 8), 12);
  });
  it('noncoherent FSK lies at or above coherent FSK (penalty) across the sweep', () => {
    const v = buildNoncohView({ M: 4, ebN0Db: 8 });
    expect(v.noncohCurve).toHaveLength(v.coherentCurve.length);
    for (let i = 0; i < v.noncohCurve.length; i++) {
      expect(v.noncohCurve[i].pe).toBeGreaterThanOrEqual(v.coherentCurve[i].pe * 0.999);
    }
  });
});

describe('sampleNoncohBank', () => {
  it('returns M branches and rx = argmax envelope', () => {
    const b = sampleNoncohBank({ M: 8, ebN0Db: 10, seed: 3 });
    expect(b.branches).toHaveLength(8);
    let arg = 0;
    for (let m = 1; m < 8; m++) if (b.branches[m].env > b.branches[arg].env) arg = m;
    expect(b.rx).toBe(arg);
  });
  it('at high SNR the decision is usually correct', () => {
    let correct = 0;
    for (let s = 0; s < 40; s++) {
      const b = sampleNoncohBank({ M: 4, ebN0Db: 16, seed: 100 + s });
      if (b.rx === b.tx) correct++;
    }
    expect(correct).toBeGreaterThan(36);
  });
});
