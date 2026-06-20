/**
 * Plot-ready derivation for the OFDM PAPR sub-tab. Delegates to the pure PAPR
 * DSP in `@/lib/dsp/papr`. Proakis & Salehi §11.5, p.631.
 */
import type { Complex } from '@/lib/dsp/fft';
import { makeRng } from '@/lib/dsp/random';
import {
  oversampledOfdmEnvelope,
  paprDbFromEnvelope,
  clipEnvelope,
  paprCcdfEmpirical,
  paprCcdfTheoretical,
} from '@/lib/dsp/papr';

export interface PaprParams {
  numSubcarriers: number; // N
  clipDb: number; // clip ratio (dB above RMS); high ⇒ no clipping
  trials: number; // Monte-Carlo symbols for the empirical CCDF
  seed: number;
}

export const DEFAULT_PAPR_PARAMS: PaprParams = {
  numSubcarriers: 64,
  clipDb: 12,
  trials: 400,
  seed: 7,
};

export interface PaprDerived {
  envelope: number[]; // |x(t)| of one representative symbol (oversampled)
  clipped: number[]; // clipped envelope at clipDb
  clipLevel: number; // clip threshold (× RMS), in the same units as envelope
  paprDb: number; // PAPR of the representative symbol
  clippedPaprDb: number; // PAPR after clipping
  evm: number; // clipping-induced EVM
  ccdf: { gammaDb: number; ccdf: number }[]; // empirical CCDF
  ccdfTheory: { gammaDb: number; p: number }[]; // theoretical 1-(1-e^{-γ})^N
}

const OVER = 4;

/** Pure derivation of PAPR plot data. Memoize on params. */
export function derivePapr(p: PaprParams): PaprDerived {
  const rng = makeRng(p.seed);
  const a = 1 / Math.SQRT2;
  const symbols: Complex[] = Array.from({ length: p.numSubcarriers }, () => ({
    re: rng() < 0.5 ? -a : a,
    im: rng() < 0.5 ? -a : a,
  }));
  const envelope = oversampledOfdmEnvelope(symbols, OVER);
  const paprDb = paprDbFromEnvelope(envelope);
  const clip = clipEnvelope(envelope, p.clipDb);

  // Clip level in envelope units = RMS · 10^{clipDb/20}.
  let sumSq = 0;
  for (const v of envelope) sumSq += v * v;
  const clipLevel = Math.sqrt(sumSq / envelope.length) * 10 ** (p.clipDb / 20);

  const ccdf = paprCcdfEmpirical(p.numSubcarriers, p.trials, p.seed, OVER);
  const ccdfTheory = ccdf.map((pt) => ({
    gammaDb: pt.gammaDb,
    p: paprCcdfTheoretical(pt.gammaDb, p.numSubcarriers),
  }));

  return {
    envelope,
    clipped: clip.clipped,
    clipLevel,
    paprDb,
    clippedPaprDb: clip.paprDb,
    evm: clip.evm,
    ccdf,
    ccdfTheory,
  };
}
