// Ref: Proakis & Salehi §13.6 (Low-Density Parity-Check Codes) / §13.6.1 (Decoding LDPC Codes).
// LDPC codes are defined by a sparse parity-check matrix H whose Tanner graph connects n variable
// nodes to m check nodes. They are decoded by iterative message passing (the sum-product /
// belief-propagation algorithm), exchanging soft LLRs along the graph edges until the parity
// checks are satisfied. The decoder below works on any H; the UI demos it on a small code so the
// Tanner graph stays readable (a real LDPC code uses a large, sparse H).

/**
 * Canonical small demo LDPC: n=6 variables, m=4 checks, regular (column weight 2, row weight 3),
 * girth 6 (no 4-cycles) so belief propagation behaves well. Rank 3 → a rate-1/2 [6,3] code.
 */
export const DEMO_LDPC_H: number[][] = [
  [1, 1, 1, 0, 0, 0], // c0: v0 v1 v2
  [1, 0, 0, 1, 1, 0], // c1: v0 v3 v4
  [0, 1, 0, 1, 0, 1], // c2: v1 v3 v5
  [0, 0, 1, 0, 1, 1], // c3: v2 v4 v5
];

/** Variable-node indices touching each check (rows of H): checkNeighbors[c] = [v, …]. */
export function checkNeighbors(H: number[][]): number[][] {
  return H.map((row) => row.flatMap((b, v) => (b ? [v] : [])));
}

/** Check-node indices touching each variable (columns of H): varNeighbors[v] = [c, …]. */
export function varNeighbors(H: number[][]): number[][] {
  const n = H[0]?.length ?? 0;
  const out: number[][] = Array.from({ length: n }, () => []);
  H.forEach((row, c) => row.forEach((b, v) => b && out[v].push(c)));
  return out;
}

/** Hard syndrome: true when every parity check is satisfied (H·xᵀ = 0 over GF(2)). */
export function parityOk(hard: number[], H: number[][]): boolean {
  return H.every((row) => row.reduce((a, b, v) => a ^ (b & hard[v]), 0) === 0);
}

export interface BpIter {
  iter: number;
  llr: number[]; // a-posteriori LLR per variable node
  hard: number[]; // hard decisions
  ok: boolean; // all parity checks satisfied
}

/**
 * Sum-product (belief-propagation) decoding in the log domain (§13.6.1). `llrCh[v]` is the channel
 * LLR log P(0)/P(1) for variable v. Iterates up to `maxIters`, stopping early once parity holds.
 * Check update uses the tanh product rule; variable update sums incoming extrinsic LLRs.
 */
export function sumProductDecode(llrCh: number[], H: number[][], maxIters: number): BpIter[] {
  const n = llrCh.length;
  const cn = checkNeighbors(H);
  const vn = varNeighbors(H);
  // messages keyed by "c,v"
  const v2c = new Map<string, number>(); // variable → check
  const c2v = new Map<string, number>(); // check → variable
  for (let v = 0; v < n; v++) for (const c of vn[v]) v2c.set(`${c},${v}`, llrCh[v]);

  const out: BpIter[] = [];
  for (let it = 1; it <= maxIters; it++) {
    // check-node update: L_{c→v} = 2·atanh( ∏_{v'≠v} tanh(L_{v'→c}/2) )
    for (let c = 0; c < H.length; c++) {
      for (const v of cn[c]) {
        let prod = 1;
        for (const v2 of cn[c]) {
          if (v2 === v) continue;
          prod *= Math.tanh(Math.max(-30, Math.min(30, v2c.get(`${c},${v2}`) ?? 0)) / 2);
        }
        prod = Math.max(-0.999999999999, Math.min(0.999999999999, prod));
        c2v.set(`${c},${v}`, 2 * Math.atanh(prod));
      }
    }
    // variable-node update: L_{v→c} = L_ch + Σ_{c'≠c} L_{c'→v}
    for (let v = 0; v < n; v++) {
      let total = llrCh[v];
      for (const c of vn[v]) total += c2v.get(`${c},${v}`) ?? 0;
      for (const c of vn[v]) v2c.set(`${c},${v}`, total - (c2v.get(`${c},${v}`) ?? 0));
    }
    // a-posteriori LLR + hard decision
    const llr = new Array<number>(n);
    const hard = new Array<number>(n);
    for (let v = 0; v < n; v++) {
      let total = llrCh[v];
      for (const c of vn[v]) total += c2v.get(`${c},${v}`) ?? 0;
      llr[v] = total;
      hard[v] = total < 0 ? 1 : 0;
    }
    const ok = parityOk(hard, H);
    out.push({ iter: it, llr, hard, ok });
    if (ok) break;
  }
  return out;
}
