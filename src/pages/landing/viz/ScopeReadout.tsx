import { useEffect, useState } from 'react';
import { t } from '@/i18n';
import {
  scopeMetrics,
  nowMs,
  bitAt,
  bitScroll,
  LINE_CODE,
  BREATH_PERIOD_MS,
  type ScopeMetrics,
} from './scopeModel';

function prefersReduced(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** "1.9e-4" → "1.9e−4" (proper Unicode minus on the exponent). */
function fmtBer(ber: number): string {
  return ber.toExponential(1).replace('e-', 'e−').replace('e+', 'e');
}

/** Bits shown in the corner feed — the window of the Manchester code on screen. */
const FEED_BITS = 12;

/** The bit window currently entering the scope at time `now` (matches the trace). */
function feedAt(now: number): string {
  const start = Math.floor(bitScroll(now));
  let s = '';
  for (let i = 0; i < FEED_BITS; i += 1) s += String(bitAt(start + i));
  return s;
}

/** Group a bit string into space-separated nibbles, e.g. "1011 0010". */
function groupNibbles(bits: string): string {
  return bits.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Live HUD overlay for the hero oscilloscope. A slowly-breathing Eb/N0 updates
 * the readouts (and the BPSK BER derived from it) in sync with the trace noise.
 */
export function ScopeReadout() {
  const reduced = prefersReduced();
  const [m, setM] = useState<ScopeMetrics>(() =>
    // Reduced motion: freeze at the breathing midpoint (Eb/N0 = 9 dB).
    scopeMetrics(reduced ? BREATH_PERIOD_MS / 4 : nowMs()),
  );
  const [bits, setBits] = useState<string>(() => feedAt(reduced ? 0 : nowMs()));

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      const now = nowMs();
      setM(scopeMetrics(now));
      setBits(feedAt(now)); // same bits the Manchester trace is scrolling
    }, 150);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div className="hero__hud" aria-hidden="true">
      <span className="hud hud--tl">
        <span className="hud__live">
          <i className="hud__rec" /> {t('landing.scope.live')}
        </span>
        <span className="hud__bits">{groupNibbles(bits)}</span>
      </span>
      <span className="hud hud--tr">
        R<sub>b</sub> = <b>{m.dataRateMbps.toFixed(1)} Mb/s</b>
        <br />
        {LINE_CODE}
      </span>
      {/* Eb/N0 surfaced as a generic "SNR" readout on the hero scope. */}
      <span className="hud hud--bl hud--accent">
        SNR = <b>{m.ebn0Db.toFixed(1)} dB</b>
      </span>
      <span className="hud hud--br">
        BER <b>{fmtBer(m.ber)}</b>
      </span>
    </div>
  );
}
