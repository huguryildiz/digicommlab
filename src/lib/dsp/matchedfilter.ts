/** Full linear convolution; length = x.length + h.length − 1. */
export function convolve(x: number[], h: number[]): number[] {
  if (x.length === 0 || h.length === 0) return [];
  const out = new Array(x.length + h.length - 1).fill(0);
  for (let i = 0; i < x.length; i++) {
    for (let j = 0; j < h.length; j++) out[i + j] += x[i] * h[j];
  }
  return out;
}
