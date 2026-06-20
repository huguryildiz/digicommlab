import { describe, it, expect } from 'vitest';
import { buildDetectionView, type DetectionParams } from '@/modules/baseband/model';

const base: DetectionParams = {
  code: 'polar-nrz',
  bits: [0, 1, 0, 1, 1, 0, 0, 1, 0, 0],
  ebN0Db: 12,
  useMatchedFilter: false,
  sps: 32,
  seed: 7,
};

describe('buildDetectionView', () => {
  it('produces aligned waveform arrays and one sample per bit', () => {
    const v = buildDetectionView(base);
    expect(v.nBits).toBe(base.bits.length);
    expect(v.g.length).toBe(base.bits.length * base.sps);
    expect(v.x.length).toBe(v.g.length);
    expect(v.samples.length).toBe(base.bits.length);
    expect(v.sampleT.length).toBe(base.bits.length);
    expect(v.bitsTx).toEqual(base.bits);
  });
  it('recovers all bits with no errors at high Eb/N0', () => {
    const v = buildDetectionView({ ...base, ebN0Db: 20 });
    expect(v.errors).toBe(0);
    expect(v.bitsRx).toEqual(base.bits);
  });
  it('threshold is 0 for antipodal and 0.5 for OOK', () => {
    expect(buildDetectionView(base).threshold).toBe(0);
    expect(buildDetectionView({ ...base, code: 'unipolar-nrz' }).threshold).toBe(0.5);
  });
  it('is deterministic for a fixed seed', () => {
    const a = buildDetectionView({ ...base, ebN0Db: 3 });
    const b = buildDetectionView({ ...base, ebN0Db: 3 });
    expect(a.errors).toBe(b.errors);
    expect(a.x).toEqual(b.x);
  });
  it('matched-filter view exposes a longer g0 trace than the signal', () => {
    const v = buildDetectionView({ ...base, useMatchedFilter: true });
    expect(v.g0.length).toBeGreaterThan(v.g.length);
    expect(v.g0t.length).toBe(v.g0.length);
  });
});
