import { describe, it, expect } from 'vitest';
import {
  DS_HIERARCHY,
  DS0_RATE,
  dsLevel,
  tdmPayloadRate,
  tdmOverhead,
} from '@/lib/dsp/tdm';

describe('TDM / DS hierarchy', () => {
  it('DS-0 is a 64 kbps PCM channel (8 bits × 8000 Hz)', () => {
    expect(DS0_RATE).toBe(64_000);
    expect(tdmPayloadRate(1)).toBe(64_000);
  });

  it('DS-1 multiplexes 24 voice channels at the standardized 1.544 Mbps', () => {
    const ds1 = dsLevel(1)!;
    expect(ds1.name).toBe('DS-1');
    expect(ds1.channels).toBe(24);
    expect(ds1.rate).toBe(1_544_000);
    // Raw payload 24×64k = 1.536 Mbps; framing overhead = 8 kbps.
    expect(tdmPayloadRate(24)).toBe(1_536_000);
    expect(tdmOverhead(ds1)).toBe(8_000);
  });

  it('matches the textbook DS-2 / DS-3 rates and tributary fan-in', () => {
    expect(dsLevel(2)!.rate).toBe(6_312_000);
    expect(dsLevel(2)!.tributaries).toBe(4);
    expect(dsLevel(3)!.rate).toBe(44_736_000);
    expect(dsLevel(3)!.tributaries).toBe(7);
  });

  it('channel counts compound through the hierarchy', () => {
    expect(DS_HIERARCHY[1].channels).toBe(24 * 4);
    expect(DS_HIERARCHY[2].channels).toBe(24 * 4 * 7);
  });
});
