import { noncoherentFskPm, squareLawDecide } from '@/lib/dsp/noncoherent';
import { theoreticalSer } from '@/lib/dsp/ser';
import { n0FromEbN0Db, sigmaFromN0, gaussian } from '@/lib/dsp/awgn';
import { makeRng } from '@/lib/sim/sources';

export interface NoncohParams {
  M: number;
  ebN0Db: number;
}

export interface NoncohView {
  M: number;
  bitsPerSymbol: number;
  theoryNow: number;
  noncohCurve: { ebN0Db: number; pe: number }[];
  coherentCurve: { ebN0Db: number; pe: number }[];
}

/** Build plot-ready noncoherent-FSK data for a given M and Eb/N0. */
export function buildNoncohView(p: NoncohParams): NoncohView {
  const { M, ebN0Db } = p;
  const bits = Math.round(Math.log2(M));
  const scheme = M === 2 ? 'bfsk' : 'mfsk';
  const noncohCurve: { ebN0Db: number; pe: number }[] = [];
  const coherentCurve: { ebN0Db: number; pe: number }[] = [];
  for (let db = 0; db <= 14; db += 1) {
    noncohCurve.push({ ebN0Db: db, pe: noncoherentFskPm(M, db) });
    coherentCurve.push({ ebN0Db: db, pe: theoreticalSer(scheme, M, db) });
  }
  return {
    M,
    bitsPerSymbol: bits,
    theoryNow: noncoherentFskPm(M, ebN0Db),
    noncohCurve,
    coherentCurve,
  };
}

export interface NoncohBank {
  tx: number;
  rx: number;
  /** Per-tone quadrature outputs, normalised so the signal phasor ≈ unit length. */
  branches: { yc: number; ys: number; env: number }[];
}

/**
 * One-symbol snapshot of the square-law detector bank: the transmitted tone
 * arrives with a random unknown phase φ; each tone's (yc, ys) and envelope are
 * returned for the animated bank. Mirrors simulateNoncoherentFsk. Eb = 1.
 */
export function sampleNoncohBank(p: { M: number; ebN0Db: number; seed?: number }): NoncohBank {
  const { M, ebN0Db, seed = 2024 } = p;
  const es = Math.log2(M);
  const amp = Math.sqrt(es);
  const sigma = sigmaFromN0(n0FromEbN0Db(ebN0Db, 1));
  const rng = makeRng(seed);
  const tx = Math.floor(rng() * M);
  const phi = rng() * 2 * Math.PI;

  const raw: { yc: number; ys: number }[] = [];
  for (let m = 0; m < M; m++) {
    if (m === tx) {
      raw.push({
        yc: amp * Math.cos(phi) + sigma * gaussian(rng),
        ys: amp * Math.sin(phi) + sigma * gaussian(rng),
      });
    } else {
      raw.push({ yc: sigma * gaussian(rng), ys: sigma * gaussian(rng) });
    }
  }
  const rx = squareLawDecide(raw);
  const branches = raw.map(({ yc, ys }) => {
    const ycN = yc / amp;
    const ysN = ys / amp;
    return { yc: ycN, ys: ysN, env: ycN * ycN + ysN * ysN };
  });
  return { tx, rx, branches };
}
