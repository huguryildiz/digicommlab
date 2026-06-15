import { describe, it, expect } from 'vitest';
import { analyticFt, type AnalyticFtKind } from '@/lib/dsp/ftpairs';
import { sinc } from '@/lib/dsp/math';

/**
 * Analytic Fourier-transform pairs — Proakis & Salehi, Table 2.1.
 * Time-domain definitions match src/lib/dsp/signals.ts so the analytic curve
 * overlays the numerically computed spectrum.
 */
describe('analyticFt', () => {
  describe('rect Π(t) ↔ sinc(f)', () => {
    it('X(0) = 1', () => {
      const X = analyticFt('rect', 0);
      expect(X.re).toBeCloseTo(1, 6);
      expect(X.im).toBeCloseTo(0, 6);
    });
    it('first zero at f = 1 (sinc)', () => {
      expect(analyticFt('rect', 1).re).toBeCloseTo(0, 6);
    });
    it('matches sinc(f) at arbitrary f', () => {
      expect(analyticFt('rect', 0.37).re).toBeCloseTo(sinc(0.37), 6);
    });
  });

  describe('tri Λ(t) ↔ sinc²(f)', () => {
    it('X(0) = 1', () => {
      expect(analyticFt('tri', 0).re).toBeCloseTo(1, 6);
    });
    it('is non-negative and equals sinc²', () => {
      expect(analyticFt('tri', 0.8).re).toBeCloseTo(sinc(0.8) ** 2, 6);
      expect(analyticFt('tri', 0.8).re).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exp e^{-t/τ}u(t) ↔ 1/(1/τ + j2πf)', () => {
    it('X(0) = τ (real)', () => {
      const tau = 0.5;
      const X = analyticFt('exp', 0, tau);
      expect(X.re).toBeCloseTo(tau, 6);
      expect(X.im).toBeCloseTo(0, 6);
    });
    it('|X(f)| = τ / sqrt(1 + (2πfτ)²)', () => {
      const tau = 0.5;
      const f = 1.3;
      const X = analyticFt('exp', f, tau);
      const mag = Math.hypot(X.re, X.im);
      expect(mag).toBeCloseTo(tau / Math.sqrt(1 + (2 * Math.PI * f * tau) ** 2), 6);
    });
    it('phase is negative for f > 0 (lagging)', () => {
      expect(Math.atan2(analyticFt('exp', 1, 0.5).im, analyticFt('exp', 1, 0.5).re)).toBeLessThan(0);
    });
  });

  describe('exp2 e^{-|t|/τ} ↔ 2a/(a²+4π²f²), a=1/τ', () => {
    it('X(0) = 2τ (real, even signal → real spectrum)', () => {
      const tau = 0.5;
      const X = analyticFt('exp2', 0, tau);
      expect(X.re).toBeCloseTo(2 * tau, 6); // 2a/a² = 2/a = 2τ
      expect(X.im).toBeCloseTo(0, 6);
    });
    it('spectrum is purely real (even signal)', () => {
      expect(analyticFt('exp2', 2.1, 0.5).im).toBeCloseTo(0, 6);
    });
  });

  describe('sinc(t) ↔ Π(f)', () => {
    it('X(0) = 1 (inside the unit-width rect)', () => {
      expect(analyticFt('sinc', 0).re).toBeCloseTo(1, 6);
    });
    it('X(f) = 0 for |f| > 1/2', () => {
      expect(analyticFt('sinc', 0.7).re).toBeCloseTo(0, 6);
      expect(analyticFt('sinc', -0.7).re).toBeCloseTo(0, 6);
    });
  });

  describe('damped_sine sin(2πt)e^{-t/τ}u(t) ↔ 2π/((1/τ+j2πf)²+(2π)²)', () => {
    it('X(0) is real and ≈ 2π/(a²+4π²)', () => {
      const tau = 0.5;
      const a = 1 / tau;
      const X = analyticFt('damped_sine', 0, tau);
      expect(X.im).toBeCloseTo(0, 6);
      expect(X.re).toBeCloseTo((2 * Math.PI) / (a * a + (2 * Math.PI) ** 2), 6);
    });
  });

  describe('conjugate symmetry of real signals', () => {
    it('X(-f) = conj(X(f)) for exp', () => {
      const f = 0.9;
      const Xp = analyticFt('exp', f, 0.5);
      const Xm = analyticFt('exp', -f, 0.5);
      expect(Xm.re).toBeCloseTo(Xp.re, 6);
      expect(Xm.im).toBeCloseTo(-Xp.im, 6);
    });
  });

  it('all kinds return finite values', () => {
    const kinds: AnalyticFtKind[] = ['rect', 'tri', 'exp', 'exp2', 'sinc', 'damped_sine'];
    for (const k of kinds) {
      const X = analyticFt(k, 0.5, 0.5);
      expect(Number.isFinite(X.re)).toBe(true);
      expect(Number.isFinite(X.im)).toBe(true);
    }
  });
});
