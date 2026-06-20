// Baseband line coding — the waveform formats that map a bit stream onto a physical
// line (Proakis §8.3 digital baseband signaling). Each code is a different rule for
// turning bits {0,1} into voltage levels over a bit period; they trade off DC balance,
// clock-recovery content, and bandwidth. Used by the ADC "Line Coding" tab to draw and
// compare On-Off Keying (unipolar NRZ), polar NRZ, RZ, bipolar AMI, Manchester, etc.

export type LineCode =
  | 'unipolar-nrz' // On-Off Keying (OOK): 1→+A, 0→0, held full bit
  | 'polar-nrz' // 1→+A, 0→−A, held full bit
  | 'unipolar-rz' // 1→+A first half then 0, 0→0
  | 'polar-rz' // 1→+A / 0→−A first half then return to 0
  | 'ami' // bipolar / Alternate Mark Inversion: 0→0, 1→±A (alternating), RZ
  | 'manchester' // biphase-L: 1→+A then −A, 0→−A then +A (mid-bit transition)
  | 'diff-manchester' // always mid-bit transition; 0 adds a start-of-bit transition
  | 'nrz-i'; // NRZ-Inverted: transition at bit start encodes a 1

export interface LineCodeInfo {
  code: LineCode;
  label: string;
  /** True if the code is bipolar (uses −A as well as +A). */
  bipolar: boolean;
}

/** Display metadata for the supported line codes (in pedagogical order). */
export const LINE_CODES: LineCodeInfo[] = [
  { code: 'unipolar-nrz', label: 'Unipolar NRZ (OOK)', bipolar: false },
  { code: 'polar-nrz', label: 'Polar NRZ', bipolar: true },
  { code: 'unipolar-rz', label: 'Unipolar RZ', bipolar: false },
  { code: 'polar-rz', label: 'Polar RZ', bipolar: true },
  { code: 'ami', label: 'Bipolar AMI', bipolar: true },
  { code: 'manchester', label: 'Manchester', bipolar: true },
  { code: 'diff-manchester', label: 'Differential Manchester', bipolar: true },
  { code: 'nrz-i', label: 'NRZ-I', bipolar: true },
];

export interface LineWaveform {
  /** Breakpoint times in bit periods (0 … N). Piecewise-constant between breakpoints. */
  t: number[];
  /** Level at each breakpoint (±A or 0). */
  x: number[];
}

/** Push a constant segment [t0, t1) at level `lv` as two breakpoints (crisp steps). */
function segment(t: number[], x: number[], t0: number, t1: number, lv: number): void {
  t.push(t0, t1);
  x.push(lv, lv);
}

/**
 * Generate the line-code waveform for a bit sequence as piecewise-constant breakpoints
 * (amplitude A = 1). Stateful codes (AMI, differential Manchester, NRZ-I) carry their
 * running polarity/level across bits.
 */
export function lineCodeWaveform(bits: number[], code: LineCode): LineWaveform {
  const t: number[] = [];
  const x: number[] = [];

  // Running state for differential / bipolar codes.
  let amiSign = 1; // next mark polarity for AMI
  let dmLevel = 1; // current level for differential Manchester
  let nrziLevel = 1; // current level for NRZ-I

  for (let i = 0; i < bits.length; i++) {
    const b = bits[i] ? 1 : 0;
    const t0 = i;
    const mid = i + 0.5;
    const t1 = i + 1;

    switch (code) {
      case 'unipolar-nrz':
        segment(t, x, t0, t1, b);
        break;
      case 'polar-nrz':
        segment(t, x, t0, t1, b ? 1 : -1);
        break;
      case 'unipolar-rz':
        segment(t, x, t0, mid, b ? 1 : 0);
        segment(t, x, mid, t1, 0);
        break;
      case 'polar-rz':
        segment(t, x, t0, mid, b ? 1 : -1);
        segment(t, x, mid, t1, 0);
        break;
      case 'ami':
        if (b) {
          segment(t, x, t0, mid, amiSign);
          segment(t, x, mid, t1, 0);
          amiSign = -amiSign; // alternate every mark
        } else {
          segment(t, x, t0, t1, 0);
        }
        break;
      case 'manchester':
        // biphase-L: 1 → +A then −A; 0 → −A then +A
        segment(t, x, t0, mid, b ? 1 : -1);
        segment(t, x, mid, t1, b ? -1 : 1);
        break;
      case 'diff-manchester':
        // A 0 forces a transition at the start of the bit; a 1 does not. There is
        // always a transition at mid-bit (the clock).
        if (b === 0) dmLevel = -dmLevel;
        segment(t, x, t0, mid, dmLevel);
        dmLevel = -dmLevel;
        segment(t, x, mid, t1, dmLevel);
        break;
      case 'nrz-i':
        // Transition at the start of the bit encodes a 1; a 0 holds the level.
        if (b === 1) nrziLevel = -nrziLevel;
        segment(t, x, t0, t1, nrziLevel);
        break;
    }
  }
  return { t, x };
}

/**
 * Mean (DC) level of a line-code waveform per bit period — a proxy for DC balance.
 * Codes that average to 0 over equiprobable data (polar, Manchester, AMI) carry no DC.
 */
export function dcLevel(wave: LineWaveform): number {
  if (wave.t.length < 2) return 0;
  let area = 0;
  for (let i = 0; i < wave.t.length; i += 2) {
    area += wave.x[i] * (wave.t[i + 1] - wave.t[i]);
  }
  const span = wave.t[wave.t.length - 1] - wave.t[0];
  return span > 0 ? area / span : 0;
}

/**
 * Count level transitions (edges) in the waveform — a proxy for self-clocking content.
 * Manchester guarantees one transition per bit regardless of data; NRZ can have long
 * runs with no edges, making clock recovery harder.
 */
export function transitionCount(wave: LineWaveform): number {
  let edges = 0;
  for (let i = 1; i < wave.x.length; i++) {
    if (wave.x[i] !== wave.x[i - 1]) edges++;
  }
  return edges;
}
