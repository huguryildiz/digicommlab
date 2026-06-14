/**
 * Discrete linear convolution of sampled signals.
 * Proakis & Salehi §2.1.5: y(t) = ∫ x(τ) h(t−τ) dτ; the discrete sum is
 * scaled by the sample step dt to approximate the integral.
 */
export function convolve(x: number[], h: number[], dt = 1): number[] {
  const n = x.length;
  const m = h.length;
  if (n === 0 || m === 0) return [];
  const y = new Array<number>(n + m - 1).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      y[i + j] += x[i] * h[j] * dt;
    }
  }
  return y;
}
