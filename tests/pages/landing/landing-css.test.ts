import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const landingCss = readFileSync('src/pages/landing/landing.css', 'utf8');

describe('landing module tile CSS', () => {
  it('places the random-process noise animation below the open-module link', () => {
    // The noise viz belongs to the full-bleed group that flows BELOW the tile text
    // block: `flex: 1 1 auto` pushes it under "Open module →", bleeding to the edges.
    const fullBleedNoiseRule = /\.tile__viz--noise,[\s\S]*?\{[\s\S]*?flex:\s*1 1 auto;/;

    expect(landingCss).toMatch(fullBleedNoiseRule);
  });
});
