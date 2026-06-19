// Proakis §7.2.2 — vector quantization via the LBG / generalized-Lloyd (K-means)
// algorithm. Ref CCSM vq.m: nearest-neighbour assignment + centroid update, iterated
// until the relative distortion change drops below tolerance. 2-D for visualization.

export type Vec2 = [number, number];

export interface VqResult {
  codebook: Vec2[];
  assignments: number[]; // codeword index per training vector
  distortionHistory: number[]; // mean distortion after each iteration
  iterations: number;
  snapshots: { codebook: Vec2[]; assignments: number[] }[]; // per-iteration, for animation
}

function dist2(a: Vec2, b: Vec2): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/** Nearest-codeword index for every data point (ties resolve to the lowest index). */
export function voronoiAssign(data: Vec2[], codebook: Vec2[]): number[] {
  return data.map((p) => {
    let best = 0;
    let bestD = Infinity;
    for (let j = 0; j < codebook.length; j++) {
      const d = dist2(p, codebook[j]);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    return best;
  });
}

/** LBG design. Codebook initialized to the first K training vectors (as in vq.m). */
export function lbgDesign(data: Vec2[], K: number, tol = 1e-3, maxIter = 50): VqResult {
  let codebook: Vec2[] = data.slice(0, K).map((p) => [p[0], p[1]] as Vec2);
  const distortionHistory: number[] = [];
  const snapshots: VqResult['snapshots'] = [];
  let prevDist = Infinity;
  let assignments: number[] = [];
  let iterations = 0;

  for (; iterations < maxIter; iterations++) {
    assignments = voronoiAssign(data, codebook);

    let D = 0;
    for (let i = 0; i < data.length; i++) D += dist2(data[i], codebook[assignments[i]]);
    D /= data.length;
    distortionHistory.push(D);
    snapshots.push({
      codebook: codebook.map((c) => [c[0], c[1]] as Vec2),
      assignments: assignments.slice(),
    });

    const sumX = new Array<number>(K).fill(0);
    const sumY = new Array<number>(K).fill(0);
    const cnt = new Array<number>(K).fill(0);
    for (let i = 0; i < data.length; i++) {
      const a = assignments[i];
      sumX[a] += data[i][0];
      sumY[a] += data[i][1];
      cnt[a]++;
    }
    codebook = codebook.map((c, j) =>
      cnt[j] > 0 ? ([sumX[j] / cnt[j], sumY[j] / cnt[j]] as Vec2) : c,
    );

    if (Math.abs(prevDist - D) / (D || 1) < tol) {
      iterations++;
      break;
    }
    prevDist = D;
  }

  return { codebook, assignments, distortionHistory, iterations, snapshots };
}

/** Vector-quantizer rate in bits/sample = log2(K)/n (Eq. 7.2.13). */
export function vqRateBitsPerSample(K: number, dimension: number): number {
  return Math.log2(K) / dimension;
}

/** Deterministic LCG → uniform in [0,1). */
function lcg(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Box-Muller standard normal from a uniform generator. */
function gauss(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** n independent 2-D Gaussian points, deterministic for a given seed. */
export function gaussianCloud(n: number, sigma = 1, seed = 1): Vec2[] {
  const rand = lcg(seed);
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) out.push([gauss(rand) * sigma, gauss(rand) * sigma]);
  return out;
}

/** `perCluster` Gaussian points around each center; deterministic for a given seed. */
export function gaussianClusters(
  centers: Vec2[],
  perCluster: number,
  spread = 1,
  seed = 1,
): Vec2[] {
  const rand = lcg(seed);
  const out: Vec2[] = [];
  for (const c of centers) {
    for (let i = 0; i < perCluster; i++) {
      out.push([c[0] + gauss(rand) * spread, c[1] + gauss(rand) * spread]);
    }
  }
  return out;
}
