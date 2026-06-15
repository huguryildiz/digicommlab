import { describe, it, expect } from 'vitest';
import { buildSpectrumExplorer, type SpectrumOps } from '@/modules/fourier/model';
import { analyticFt } from '@/lib/dsp/ftpairs';

const DEFAULT_OPS: SpectrumOps = {
  amp: 1,
  t0: 0,
  F: 1,
  tau: 0.5,
  reverse: false,
  modOn: false,
  fm: 5,
};

/** Index of the frequency bin closest to a target frequency. */
function nearestBin(freq: number[], target: number): number {
  let best = 0;
  let bestErr = Infinity;
  for (let i = 0; i < freq.length; i++) {
    const e = Math.abs(freq[i] - target);
    if (e < bestErr) {
      bestErr = e;
      best = i;
    }
  }
  return best;
}

describe('buildSpectrumExplorer', () => {
  it('produces matching-length frequency arrays', () => {
    const v = buildSpectrumExplorer('rect', DEFAULT_OPS, 'rect');
    expect(v.freq.length).toBe(v.mag.length);
    expect(v.freq.length).toBe(v.phase.length);
    expect(v.freq.length).toBe(v.magDb.length);
    expect(v.time.length).toBe(v.x.length);
  });

  it('numeric |X(0)| for rect ≈ analytic sinc(0) = 1 (physical units)', () => {
    const v = buildSpectrumExplorer('rect', DEFAULT_OPS, 'rect');
    const i0 = nearestBin(v.freq, 0);
    const analytic0 = Math.hypot(analyticFt('rect', 0).re, analyticFt('rect', 0).im);
    expect(v.mag[i0]).toBeCloseTo(analytic0, 1); // ≈ 1 within 0.05
  });

  it('satisfies Rayleigh/Parseval: E_time ≈ E_freq (rect window)', () => {
    const v = buildSpectrumExplorer('rect', DEFAULT_OPS, 'rect');
    expect(Math.abs(v.eFreq - v.eTime) / v.eTime).toBeLessThan(0.02);
  });

  it('energy signal (rect) → analytic curve overlay', () => {
    expect(buildSpectrumExplorer('rect', DEFAULT_OPS, 'rect').overlay.type).toBe('curve');
  });

  it('periodic signal (sine) → line-spectrum overlay', () => {
    expect(buildSpectrumExplorer('sine', DEFAULT_OPS, 'rect').overlay.type).toBe('line');
  });

  it('distributional/no-closed-form signal (ramp) → no overlay', () => {
    expect(buildSpectrumExplorer('ramp', DEFAULT_OPS, 'rect').overlay.type).toBe('none');
  });

  it('phase is masked (NaN) where magnitude is negligible', () => {
    const v = buildSpectrumExplorer('rect', DEFAULT_OPS, 'rect');
    const maxMag = Math.max(...v.mag);
    const hasMaskedBin = v.phase.some((p, i) => v.mag[i] < 1e-4 * maxMag && Number.isNaN(p));
    expect(hasMaskedBin).toBe(true);
  });

  it('dB magnitude peaks near 0 dB and is floored', () => {
    const v = buildSpectrumExplorer('rect', DEFAULT_OPS, 'rect');
    expect(Math.max(...v.magDb)).toBeCloseTo(0, 0);
    expect(Math.min(...v.magDb)).toBeGreaterThanOrEqual(-120);
  });

  it('bandwidth is stable under a time shift (|X(f)| is shift-invariant)', () => {
    const w0 = buildSpectrumExplorer('rect', DEFAULT_OPS, 'rect').bandwidth;
    const w2 = buildSpectrumExplorer('rect', { ...DEFAULT_OPS, t0: 2 }, 'rect').bandwidth;
    const w3 = buildSpectrumExplorer('rect', { ...DEFAULT_OPS, t0: 3.27 }, 'rect').bandwidth; // non-integer-sample
    expect(Math.abs(w2 - w0) / w0).toBeLessThan(0.05);
    expect(Math.abs(w3 - w0) / w0).toBeLessThan(0.05);
  });

  it('bandwidth grows smoothly with time-scale F (no wild jumps)', () => {
    const widths = [0.5, 1, 1.5, 2, 2.5, 3].map(
      (F) => buildSpectrumExplorer('rect', { ...DEFAULT_OPS, F }, 'rect').bandwidth,
    );
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeGreaterThanOrEqual(widths[i - 1] - 1e-6); // monotonic non-decreasing
      expect(widths[i]).toBeLessThan(widths[i - 1] * 3 + 1); // never explodes between steps
    }
  });

  it('amplitude scaling doubles the spectrum magnitude', () => {
    const v1 = buildSpectrumExplorer('rect', DEFAULT_OPS, 'rect');
    const v2 = buildSpectrumExplorer('rect', { ...DEFAULT_OPS, amp: 2 }, 'rect');
    const i0 = nearestBin(v1.freq, 0);
    expect(v2.mag[i0]).toBeCloseTo(2 * v1.mag[i0], 1);
  });
});
