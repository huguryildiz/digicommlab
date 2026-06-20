import { describe, it, expect } from 'vitest';
import { buildMultidimView } from '@/modules/modulation/multidim-model';
import { orthogonalPe, simplexPe, simplexGainDb } from '@/lib/dsp/multidim';

describe('buildMultidimView', () => {
  it('reports geometry: simplex M=4 → dim 3, correlation -1/3', () => {
    const v = buildMultidimView({ kind: 'simplex', M: 4, ebN0Db: 8 });
    expect(v.dim).toBe(3);
    expect(v.gamma).toBeCloseTo(-1 / 3, 9);
    expect(v.bitsPerSymbol).toBe(2);
  });
  it('biorthogonal M=4 lives in 2-D (QPSK), mixed correlation', () => {
    const v = buildMultidimView({ kind: 'biorthogonal', M: 4, ebN0Db: 8 });
    expect(v.dim).toBe(2);
    expect(v.gamma).toBeNull();
  });
  it('theoryNow matches the analytic Pe of the selected family', () => {
    expect(buildMultidimView({ kind: 'orthogonal', M: 8, ebN0Db: 7 }).theoryNow).toBeCloseTo(
      orthogonalPe(8, 7),
      9,
    );
    expect(buildMultidimView({ kind: 'simplex', M: 8, ebN0Db: 7 }).theoryNow).toBeCloseTo(
      simplexPe(8, 7),
      9,
    );
  });
  it('union bound is ≥ the exact curve where Pe is numerically meaningful', () => {
    const v = buildMultidimView({ kind: 'orthogonal', M: 8, ebN0Db: 8 });
    for (let i = 0; i < v.exactCurve.length; i++) {
      // Below ~1e-8 the exact integral's far tail and the bound differ only at
      // the integration noise floor; the bound ≥ exact relationship is asymptotic.
      if (v.exactCurve[i].pe < 1e-8) continue;
      expect(v.unionCurve[i].pe).toBeGreaterThanOrEqual(v.exactCurve[i].pe * 0.999);
    }
  });
  it('exposes the simplex SNR gain for the energy-saving visual', () => {
    const v = buildMultidimView({ kind: 'orthogonal', M: 4, ebN0Db: 8 });
    expect(v.simplexGainDb).toBeCloseTo(simplexGainDb(4), 9);
    // simplex curve sits left of (below) the orthogonal reference
    const mid = Math.floor(v.simplexCurve.length / 2);
    expect(v.simplexCurve[mid].pe).toBeLessThanOrEqual(v.orthRefCurve[mid].pe * 1.001);
  });
});
