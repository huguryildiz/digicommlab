import { describe, it, expect } from 'vitest';
import { mimoSpatialMuxBer } from '@/lib/dsp/mimo';

describe('mimoSpatialMuxBer', () => {
  it('BER decreases with SNR', () => {
    const lo = mimoSpatialMuxBer(0, 2, 2, 'zf', 300, 11);
    const hi = mimoSpatialMuxBer(20, 2, 2, 'zf', 300, 11);
    expect(hi).toBeLessThan(lo);
  });
  it('MMSE is no worse than ZF at the same SNR/seed', () => {
    const zf = mimoSpatialMuxBer(8, 2, 2, 'zf', 400, 3);
    const mmse = mimoSpatialMuxBer(8, 2, 2, 'mmse', 400, 3);
    expect(mmse).toBeLessThanOrEqual(zf + 1e-3);
  });
  it('more receive antennas (2x4) beat 2x2 at the same SNR', () => {
    const a = mimoSpatialMuxBer(10, 2, 2, 'mmse', 400, 5);
    const b = mimoSpatialMuxBer(10, 2, 4, 'mmse', 400, 5);
    expect(b).toBeLessThan(a);
  });
});
