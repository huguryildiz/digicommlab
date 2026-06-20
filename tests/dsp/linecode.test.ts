import { describe, it, expect } from 'vitest';
import {
  lineCodeWaveform,
  LINE_CODES,
  dcLevel,
  transitionCount,
  type LineCode,
} from '@/lib/dsp/linecode';

/** Sample the piecewise-constant waveform at the centre of each half-bit. */
function sampleHalves(bits: number[], code: LineCode): number[] {
  const w = lineCodeWaveform(bits, code);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i++) {
    for (const frac of [0.25, 0.75]) {
      const tt = i + frac;
      // find the segment covering tt
      let lv = 0;
      for (let k = 0; k < w.t.length; k += 2) {
        if (tt >= w.t[k] && tt < w.t[k + 1]) {
          lv = w.x[k];
          break;
        }
      }
      out.push(lv);
    }
  }
  return out;
}

describe('LINE_CODES metadata', () => {
  it('lists all eight codes with unique keys', () => {
    expect(LINE_CODES).toHaveLength(8);
    expect(new Set(LINE_CODES.map((c) => c.code)).size).toBe(8);
  });
});

describe('unipolar NRZ (OOK)', () => {
  it('maps 1→+A, 0→0 held for the full bit', () => {
    // halves: [b0a,b0b, b1a,b1b, ...]
    expect(sampleHalves([1, 0, 1], 'unipolar-nrz')).toEqual([1, 1, 0, 0, 1, 1]);
  });
});

describe('polar NRZ', () => {
  it('maps 1→+A, 0→−A', () => {
    expect(sampleHalves([1, 0], 'polar-nrz')).toEqual([1, 1, -1, -1]);
  });
});

describe('RZ codes return to zero mid-bit', () => {
  it('unipolar RZ: 1→+A then 0', () => {
    expect(sampleHalves([1, 0], 'unipolar-rz')).toEqual([1, 0, 0, 0]);
  });
  it('polar RZ: 1→+A then 0, 0→−A then 0', () => {
    expect(sampleHalves([1, 0], 'polar-rz')).toEqual([1, 0, -1, 0]);
  });
});

describe('bipolar AMI', () => {
  it('marks alternate polarity, spaces are zero, RZ shape', () => {
    // bits 1,0,1,1 → +,0,−,+ in the first half of each mark
    const h = sampleHalves([1, 0, 1, 1], 'ami');
    expect(h).toEqual([1, 0, 0, 0, -1, 0, 1, 0]);
  });
  it('has no DC for any data', () => {
    expect(Math.abs(dcLevel(lineCodeWaveform([1, 1, 1, 1], 'ami')))).toBeLessThan(1e-9);
  });
});

describe('Manchester', () => {
  it('1→(+,−), 0→(−,+) with a guaranteed mid-bit transition', () => {
    expect(sampleHalves([1, 0], 'manchester')).toEqual([1, -1, -1, 1]);
  });
  it('is DC-free and has at least one transition per bit', () => {
    const w = lineCodeWaveform([1, 1, 0, 0, 1, 0], 'manchester');
    expect(Math.abs(dcLevel(w))).toBeLessThan(1e-9);
    expect(transitionCount(w)).toBeGreaterThanOrEqual(6);
  });
});

describe('differential Manchester', () => {
  it('always transitions at mid-bit; a 0 adds a start-of-bit transition', () => {
    const w = lineCodeWaveform([0, 1, 1, 0], 'diff-manchester');
    // mid-bit transition every bit → ≥ one edge per bit
    expect(transitionCount(w)).toBeGreaterThanOrEqual(4);
  });
});

describe('NRZ-I', () => {
  it('a 1 flips the level, a 0 holds it', () => {
    // start level +1; bits 1,1,0,1 → flip,flip,hold,flip → -1,+1,+1,-1
    expect(sampleHalves([1, 1, 0, 1], 'nrz-i')).toEqual([-1, -1, 1, 1, 1, 1, -1, -1]);
  });
});

describe('polar codes are DC-free on balanced data', () => {
  it('polar NRZ averages to zero over equal 1s and 0s', () => {
    expect(Math.abs(dcLevel(lineCodeWaveform([1, 0, 1, 0], 'polar-nrz')))).toBeLessThan(1e-9);
  });
  it('unipolar NRZ has a positive DC offset', () => {
    expect(dcLevel(lineCodeWaveform([1, 0, 1, 0], 'unipolar-nrz'))).toBeGreaterThan(0);
  });
});
