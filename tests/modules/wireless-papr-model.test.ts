import { describe, it, expect } from 'vitest';
import { DEFAULT_PAPR_PARAMS, derivePapr } from '@/modules/wireless/papr-model';

describe('derivePapr', () => {
  it('returns an envelope, a finite PAPR, and a decreasing CCDF', () => {
    const d = derivePapr(DEFAULT_PAPR_PARAMS);
    expect(d.envelope.length).toBeGreaterThan(0);
    expect(Number.isFinite(d.paprDb)).toBe(true);
    for (let i = 1; i < d.ccdf.length; i++) expect(d.ccdf[i].ccdf).toBeLessThanOrEqual(d.ccdf[i - 1].ccdf + 1e-9);
  });
  it('clipping lowers the PAPR', () => {
    const d = derivePapr({ ...DEFAULT_PAPR_PARAMS, clipDb: 3 });
    expect(d.clippedPaprDb).toBeLessThanOrEqual(d.paprDb + 1e-9);
  });
});
