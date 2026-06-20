// Proakis §7.6 — Time-division multiplexing (TDM) and the North American digital
// telephone hierarchy (Fig. 7.20). In TDM a frame of duration T₁ is split into N
// subintervals; each subscriber sends one 8-bit PCM sample per subinterval, so N
// users share one trunk. Successive multiplexing levels build the DS-1…DS-5 stream.

export interface DsLevel {
  /** Channel name, e.g. "DS-1". */
  name: string;
  /** Number of voice channels carried (64 kbps each). */
  channels: number;
  /** Number of next-lower-level tributaries multiplexed (DS-1 multiplexes 24 DS-0). */
  tributaries: number;
  /** Name of the tributary level ("DS-0" for DS-1). */
  tributaryName: string;
  /** Aggregate bit rate (bits/sec). */
  rate: number;
}

/** Single 64 kbps PCM voice channel (8 bits × 8000 samples/s) — the DS-0 tributary. */
export const DS0_RATE = 64_000;

/**
 * North American TDM hierarchy (§7.6, Fig. 7.20). Rates are the standardized values
 * (they exceed the raw channel sum by framing/control overhead).
 */
export const DS_HIERARCHY: DsLevel[] = [
  { name: 'DS-1', channels: 24, tributaries: 24, tributaryName: 'DS-0', rate: 1_544_000 },
  { name: 'DS-2', channels: 96, tributaries: 4, tributaryName: 'DS-1', rate: 6_312_000 },
  { name: 'DS-3', channels: 672, tributaries: 7, tributaryName: 'DS-2', rate: 44_736_000 },
  { name: 'DS-4', channels: 4032, tributaries: 6, tributaryName: 'DS-3', rate: 274_176_000 },
  { name: 'DS-5', channels: 8064, tributaries: 2, tributaryName: 'DS-4', rate: 560_160_000 },
];

/** Look up a hierarchy level (1 → DS-1, …, 5 → DS-5). */
export function dsLevel(level: number): DsLevel | undefined {
  return DS_HIERARCHY[level - 1];
}

/**
 * Raw payload rate of N PCM voice channels at `bitsPerSample`×`sampleRate` each.
 * For the DS-1 example: 24 × 8 × 8000 = 1.536 Mbps payload (framing brings it to
 * the standardized 1.544 Mbps).
 */
export function tdmPayloadRate(channels: number, bitsPerSample = 8, sampleRate = 8000): number {
  return channels * bitsPerSample * sampleRate;
}

/** Framing/control overhead (bits/sec) = standardized rate − raw channel payload. */
export function tdmOverhead(level: DsLevel, bitsPerSample = 8, sampleRate = 8000): number {
  return level.rate - tdmPayloadRate(level.channels, bitsPerSample, sampleRate);
}
