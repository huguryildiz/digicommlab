import { dpskSymbolErrorProb, differentialEncode } from '@/lib/dsp/dpsk';
import { theoreticalSer } from '@/lib/dsp/ser';
import { toGray, toNBC } from '@/lib/dsp/pcm';
import { n0FromEbN0Db, sigmaFromN0, addAwgn } from '@/lib/dsp/awgn';
import { makeRng } from '@/lib/sim/sources';

export interface DpskParams {
  M: number;
  ebN0Db: number;
}

export interface DpskView {
  M: number;
  bitsPerSymbol: number;
  phaseStep: number;
  phasePoints: { x: number; y: number; label: string }[];
  theoryNow: number;
  dpskCurve: { ebN0Db: number; pe: number }[];
  pskCurve: { ebN0Db: number; pe: number }[];
}

/** Build plot-ready DPSK data for a given M and Eb/N0. */
export function buildDpskView(p: DpskParams): DpskView {
  const { M, ebN0Db } = p;
  const bits = Math.round(Math.log2(M));
  const step = (2 * Math.PI) / M;
  const phasePoints = Array.from({ length: M }, (_, i) => ({
    x: Math.cos(step * i),
    y: Math.sin(step * i),
    label: toNBC(toGray(i), bits).join(''),
  }));
  // Coherent reference: BPSK uses its own branch; M≥4 uses M-PSK.
  const scheme = M === 2 ? 'bpsk' : 'mpsk';
  const dpskCurve: { ebN0Db: number; pe: number }[] = [];
  const pskCurve: { ebN0Db: number; pe: number }[] = [];
  for (let db = 0; db <= 14; db += 1) {
    dpskCurve.push({ ebN0Db: db, pe: dpskSymbolErrorProb(M, db) });
    pskCurve.push({ ebN0Db: db, pe: theoreticalSer(scheme, M, db) });
  }
  return {
    M,
    bitsPerSymbol: bits,
    phaseStep: step,
    phasePoints,
    theoryNow: dpskSymbolErrorProb(M, ebN0Db),
    dpskCurve,
    pskCurve,
  };
}

export interface DpskScatter {
  /** Transmitted phase indices in order — drives the phase-trail animation. */
  trail: number[];
  /** Normalized differential products D_k = Y_k·conj(Y_{k-1}) / E_s. */
  cloud: { x: number; y: number; err: boolean }[];
}

/**
 * Visualization sampler: runs the noncoherent differential detector and keeps the
 * geometry (the differential products and the transmitted phase trail) instead of
 * just error counts. Mirrors simulateDpsk in @/lib/dsp/dpsk. Eb = 1, so Es = log2(M).
 */
export function sampleDpskScatter(p: {
  M: number;
  ebN0Db: number;
  n: number;
  seed?: number;
}): DpskScatter {
  const { M, ebN0Db, n, seed = 2024 } = p;
  const es = Math.log2(M); // Eb = 1
  const amp = Math.sqrt(es);
  const sigma = sigmaFromN0(n0FromEbN0Db(ebN0Db, 1));
  const step = (2 * Math.PI) / M;
  const rng = makeRng(seed);
  const phi = rng() * 2 * Math.PI; // unknown but constant carrier phase

  const info: number[] = [];
  for (let i = 0; i < n; i++) info.push(Math.floor(rng() * M));
  const tx = differentialEncode(info, M, 0);

  let prevI = amp * Math.cos(phi);
  let prevQ = amp * Math.sin(phi);
  {
    const r = addAwgn([prevI, prevQ], sigma, rng);
    prevI = r[0];
    prevQ = r[1];
  }

  const cloud: { x: number; y: number; err: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const theta = step * tx[i] + phi;
    const [yi, yq] = addAwgn([amp * Math.cos(theta), amp * Math.sin(theta)], sigma, rng);
    const dRe = yi * prevI + yq * prevQ;
    const dIm = yq * prevI - yi * prevQ;
    let idx = Math.round(Math.atan2(dIm, dRe) / step) % M;
    if (idx < 0) idx += M;
    cloud.push({ x: dRe / es, y: dIm / es, err: idx !== info[i] });
    prevI = yi;
    prevQ = yq;
  }
  return { trail: tx, cloud };
}
