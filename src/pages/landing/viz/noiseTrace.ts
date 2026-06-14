/**
 * Ring-buffer model for a scrolling noise trace: a fixed-length list of samples
 * that advances by dropping the oldest and appending a fresh one. Pure and
 * UI-free so it can be unit-tested independently of canvas drawing.
 */

/** Create a buffer of `len` samples drawn from `sample`. */
export function makeNoiseTrace(len: number, sample: () => number): number[] {
  const buf: number[] = [];
  for (let i = 0; i < len; i += 1) buf.push(sample());
  return buf;
}

/** Advance one step: drop the oldest sample, append a fresh one. Mutates `buf`. */
export function advanceNoiseTrace(buf: number[], sample: () => number): void {
  buf.shift();
  buf.push(sample());
}

/**
 * Band-limited (temporally correlated) Gaussian source: a first-order
 * autoregressive / Ornstein–Uhlenbeck process. Each call returns
 * `x = a·x_prev + √(1−a²)·white()`, so consecutive samples stay close — the
 * trace flows like a finite-bandwidth random process instead of razor-spiked
 * white noise, which reads as much smoother when the texture scrolls. The
 * √(1−a²) gain keeps the marginal variance at 1 (white()'s), so downstream
 * amplitude scaling is unchanged. `a` in [0, 1): 0 = white, higher = smoother.
 * Stateful — create one sampler per independent trace.
 */
export function makeBandLimitedSampler(correlation: number, white: () => number): () => number {
  const a = correlation;
  const b = Math.sqrt(1 - a * a);
  let prev = white();
  return () => {
    prev = a * prev + b * white();
    return prev;
  };
}
