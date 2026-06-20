import { describe, it, expect } from 'vitest';
import { buildIsiEyeView } from '@/modules/baseband/model';

describe('buildIsiEyeView', () => {
  it('builds all binary patterns with an open eye at isiGain=0', () => {
    const v = buildIsiEyeView({ M: 2, neighborK: 2, isiGain: 0, sps: 16 });
    expect(v.patternCount).toBe(2 ** 5);
    expect(v.traces.length).toBe(2 ** 5);
    expect(v.eyeHeight).toBeGreaterThan(0);
    expect(v.noiseMargin).toBeGreaterThan(0);
  });

  it('reports a smaller eye and margin once ISI is added', () => {
    const open = buildIsiEyeView({ M: 2, neighborK: 2, isiGain: 0, sps: 16 });
    const isi = buildIsiEyeView({ M: 2, neighborK: 2, isiGain: 0.6, sps: 16 });
    expect(isi.eyeHeight).toBeLessThan(open.eyeHeight);
    expect(isi.noiseMargin).toBeLessThan(open.noiseMargin);
  });
});
