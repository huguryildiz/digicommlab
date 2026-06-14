// Ref: Proakis & Salehi §9.6 (Cyclic Codes). GF(2) polynomials as LSB-first coefficient
// arrays: poly[i] = coefficient of p^i. All sums are mod 2.

/** Highest set index (degree); -1 for the zero polynomial. */
export function polyDeg(a: number[]): number {
  for (let i = a.length - 1; i >= 0; i--) if (a[i] & 1) return i;
  return -1;
}

/** Coefficientwise XOR (GF(2) addition). */
export function polyAdd(a: number[], b: number[]): number[] {
  const n = Math.max(a.length, b.length);
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) out[i] = ((a[i] ?? 0) ^ (b[i] ?? 0)) & 1;
  return out;
}

/** GF(2) polynomial multiplication (convolution mod 2). */
export function polyMul(a: number[], b: number[]): number[] {
  if (polyDeg(a) < 0 || polyDeg(b) < 0) return [0];
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    if (!(a[i] & 1)) continue;
    for (let j = 0; j < b.length; j++) out[i + j] ^= b[j] & 1;
  }
  return out;
}

/** GF(2) remainder a mod g (length deg g). §9.6.1. */
export function polyMod(a: number[], g: number[]): number[] {
  const dg = polyDeg(g);
  if (dg < 0) return a.slice();
  const r = a.slice();
  let d = polyDeg(r);
  while (d >= dg) {
    for (let j = 0; j <= dg; j++) r[d - dg + j] ^= g[j] & 1;
    d = polyDeg(r);
  }
  return r.slice(0, dg);
}

const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const sup = (n: number): string =>
  String(n)
    .split('')
    .map((d) => SUP[+d])
    .join('');

/** Render a polynomial as a descending string, e.g. "p³+p²+1". */
export function polyToString(a: number[]): string {
  const terms: string[] = [];
  for (let i = polyDeg(a); i >= 0; i--) {
    if (!(a[i] & 1)) continue;
    terms.push(i === 0 ? '1' : i === 1 ? 'p' : `p${sup(i)}`);
  }
  return terms.length ? terms.join('+') : '0';
}

/** True iff g(p) divides p^n + 1 (the cyclic-code condition). Thm 9.6.1. */
export function dividesPn1(g: number[], n: number): boolean {
  const pn1 = new Array<number>(n + 1).fill(0);
  pn1[0] = 1;
  pn1[n] = 1;
  return polyDeg(polyMod(pn1, g)) < 0;
}

/** CRC / parity remainder rem = (msg · p^{deg g}) mod g, length deg g. §9.6 (systematic). */
export function crcRemainder(msg: number[], g: number[]): number[] {
  const dg = polyDeg(g);
  const shifted = new Array<number>(msg.length + dg).fill(0);
  for (let i = 0; i < msg.length; i++) shifted[i + dg] = msg[i] & 1;
  const rem = polyMod(shifted, g);
  const out = new Array<number>(dg).fill(0);
  for (let i = 0; i < dg; i++) out[i] = rem[i] ?? 0;
  return out;
}

/** Systematic codeword [rem (low) | msg (high)], length msg.length + deg g. §9.6. */
export function encodeCyclic(msg: number[], g: number[]): number[] {
  const dg = polyDeg(g);
  const rem = crcRemainder(msg, g);
  const cw = new Array<number>(msg.length + dg).fill(0);
  for (let i = 0; i < dg; i++) cw[i] = rem[i];
  for (let i = 0; i < msg.length; i++) cw[i + dg] = msg[i] & 1;
  return cw;
}

/** Syndrome s = received mod g; all-zero ⇒ no detected error. §9.6.1. */
export function syndrome(received: number[], g: number[]): number[] {
  const dg = polyDeg(g);
  const rem = polyMod(received, g);
  const out = new Array<number>(dg).fill(0);
  for (let i = 0; i < dg; i++) out[i] = rem[i] ?? 0;
  return out;
}

/** Cyclic shift of the n-bit codeword (≡ ×p mod p^n+1): rotate LSB-first array right by 1. */
export function cyclicShiftRight(cw: number[]): number[] {
  const n = cw.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[i] = cw[(i - 1 + n) % n];
  return out;
}
