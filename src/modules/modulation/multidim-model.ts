import {
  buildFamily,
  orthogonalPe,
  simplexPe,
  simplexGainDb,
  type FamilyKind,
} from '@/lib/dsp/multidim';
import { unionBoundSer } from '@/lib/dsp/ser';
import { ebN0Linear } from '@/lib/dsp/awgn';

export interface MultidimParams {
  kind: FamilyKind;
  M: number;
  ebN0Db: number;
}

type Pt = { ebN0Db: number; pe: number };

export interface MultidimView {
  kind: FamilyKind;
  M: number;
  dim: number;
  dMin: number;
  energyAvg: number;
  /** Per-pair correlation (orthogonal 0, simplex −1/(M−1)); null for the mixed biorthogonal set. */
  gamma: number | null;
  bitsPerSymbol: number;
  simplexGainDb: number;
  theoryNow: number;
  exactCurve: Pt[]; // analytic Pe of the selected family (union bound for biorthogonal)
  unionCurve: Pt[]; // union bound for the selected family (§8.4.2 / §9.1.2 overlay)
  orthRefCurve: Pt[]; // orthogonal reference
  simplexCurve: Pt[]; // simplex (energy-saving visual)
}

/** Per-symbol energy that makes Eb = 1 for the given family (so curves share an Eb/N0 axis). */
function esForEb1(kind: FamilyKind, M: number): number {
  const k = Math.log2(M);
  // energyAvg: orthogonal/biorthogonal = es; simplex = es·(M−1)/M.
  return kind === 'simplex' ? (k * M) / (M - 1) : k;
}

function selectedExactPe(kind: FamilyKind, M: number, db: number, pointsEb1: number[][]): number {
  if (kind === 'orthogonal') return orthogonalPe(M, db);
  if (kind === 'simplex') return simplexPe(M, db);
  // biorthogonal: union bound (Ch 13 treats coded performance; §9.2 closed form deferred).
  return unionBoundSer(pointsEb1, 1 / ebN0Linear(db));
}

/** Build plot-ready multidimensional-signal data for the selected family. */
export function buildMultidimView(p: MultidimParams): MultidimView {
  const { kind, M, ebN0Db } = p;
  const geom = buildFamily(kind, M, 1); // unit-energy geometry for the readouts
  const pointsEb1 = buildFamily(kind, M, esForEb1(kind, M)).points;

  const gamma = kind === 'orthogonal' ? 0 : kind === 'simplex' ? -1 / (M - 1) : null;

  const exactCurve: Pt[] = [];
  const unionCurve: Pt[] = [];
  const orthRefCurve: Pt[] = [];
  const simplexCurve: Pt[] = [];
  for (let db = 0; db <= 14; db += 1) {
    exactCurve.push({ ebN0Db: db, pe: selectedExactPe(kind, M, db, pointsEb1) });
    unionCurve.push({ ebN0Db: db, pe: unionBoundSer(pointsEb1, 1 / ebN0Linear(db)) });
    orthRefCurve.push({ ebN0Db: db, pe: orthogonalPe(M, db) });
    simplexCurve.push({ ebN0Db: db, pe: simplexPe(M, db) });
  }

  return {
    kind,
    M,
    dim: geom.dim,
    dMin: geom.dMin,
    energyAvg: geom.energyAvg,
    gamma,
    bitsPerSymbol: Math.round(Math.log2(M)),
    simplexGainDb: simplexGainDb(M),
    theoryNow: selectedExactPe(kind, M, ebN0Db, pointsEb1),
    exactCurve,
    unionCurve,
    orthRefCurve,
    simplexCurve,
  };
}
