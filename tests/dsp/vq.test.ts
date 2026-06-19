import { describe, it, expect } from 'vitest';
import {
  voronoiAssign,
  lbgDesign,
  vqRateBitsPerSample,
  gaussianClusters,
} from '@/lib/dsp/vq';
import type { Vec2 } from '@/lib/dsp/vq';

describe('voronoiAssign', () => {
  it('assigns each point to its nearest codeword (ties → lowest index)', () => {
    const data: Vec2[] = [
      [0, 0],
      [3, 3],
    ];
    const cb: Vec2[] = [
      [0, 0],
      [4, 4],
    ];
    expect(voronoiAssign(data, cb)).toEqual([0, 1]);
  });
});

describe('lbgDesign', () => {
  it('distortion is non-increasing across iterations', () => {
    const data = gaussianClusters(
      [
        [0, 0],
        [10, 10],
      ],
      60,
      0.5,
      7,
    );
    const r = lbgDesign(data, 2);
    for (let i = 1; i < r.distortionHistory.length; i++) {
      expect(r.distortionHistory[i]).toBeLessThanOrEqual(r.distortionHistory[i - 1] + 1e-9);
    }
  });
  it('recovers two well-separated cluster centroids (K=2)', () => {
    const data = gaussianClusters(
      [
        [0, 0],
        [10, 10],
      ],
      60,
      0.5,
      7,
    );
    const r = lbgDesign(data, 2);
    const cx = r.codebook.map((c) => c[0]).sort((a, b) => a - b);
    expect(cx[0]).toBeCloseTo(0, 0); // within ~0.5
    expect(cx[1]).toBeCloseTo(10, 0);
  });
  it('records one snapshot per iteration for animation', () => {
    const data = gaussianClusters([[0, 0]], 20, 1, 3);
    const r = lbgDesign(data, 2);
    expect(r.snapshots).toHaveLength(r.distortionHistory.length);
    expect(r.snapshots[0].codebook).toHaveLength(2);
  });
});

describe('vqRateBitsPerSample', () => {
  it('is log2(K)/n', () => {
    expect(vqRateBitsPerSample(16, 2)).toBeCloseTo(2, 12);
    expect(vqRateBitsPerSample(8, 1)).toBeCloseTo(3, 12);
  });
});
