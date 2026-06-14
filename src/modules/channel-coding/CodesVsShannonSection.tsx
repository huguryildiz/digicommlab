import { useState } from 'react';
import { Panel, Slider, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawLine, drawVLine, drawText } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { SHANNON_LIMIT_DB } from '@/lib/dsp/capacity';
import {
  COMPARISON_CODES,
  requiredEbN0ForBer,
  codingGainDb,
  shannonGapDb,
  type ComparisonCode,
} from '@/lib/dsp/codingcompare';
import { t } from '@/i18n';

const XMIN = -2;
const XMAX = 12;
const YMIN = 1e-7;
const YMAX = 0.5;

function drawComparison(ctx: CanvasRenderingContext2D, w: number, h: number, targetBer: number): void {
  const ax = { x: linScale([XMIN, XMAX], [44, w - 12]), y: logScale([YMIN, YMAX], [h - 24, 10]) };
  const clampY = (v: number) => Math.min(YMAX, Math.max(YMIN, v));
  // target BER (horizontal) + Shannon limit (vertical) reference lines
  drawLine(ctx, ax, [XMIN, XMAX], [targetBer, targetBer], alpha(CHART.dim, 0.7), 1, true);
  drawVLine(ctx, ax, SHANNON_LIMIT_DB, YMIN, YMAX, alpha(CHART.dim, 0.8), true, 1.5);
  drawText(ctx, ax, SHANNON_LIMIT_DB, YMAX, t('cc.cmp.shannon'), CHART.dim, 2, 10);
  // each code's curve
  for (const code of COMPARISON_CODES) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let db = XMIN; db <= XMAX + 1e-9; db += 0.25) {
      xs.push(db);
      ys.push(clampY(code.ber(db)));
    }
    drawLine(ctx, ax, xs, ys, CHART[code.color], 2);
    drawText(ctx, ax, XMAX, clampY(code.ber(XMAX)), code.id, CHART[code.color], -30, -3);
  }
}

const fmt = (v: number) => (v >= 12 ? '>12' : v.toFixed(2));

export function CodesVsShannonSection() {
  const [exp, setExp] = useState(-5); // target BER = 10^exp
  const targetBer = 10 ** exp;

  const rows = COMPARISON_CODES.map((c: ComparisonCode) => {
    const req = requiredEbN0ForBer(c.ber, targetBer);
    return {
      code: c,
      req,
      gain: c.id === 'uncoded' ? 0 : codingGainDb(c, targetBer),
      gap: shannonGapDb(c, targetBer),
    };
  });
  const bestGain = Math.max(...rows.map((r) => r.gain));

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.cmp.target')}>
          <Slider label={t('cc.cmp.target')} value={exp} min={-6} max={-2} step={1} onChange={setExp} />
          <Readout label="target" value={`1e${exp}`} />
        </Panel>
        <Panel title="legend">
          <div className="cc-cmp-legend">
            {COMPARISON_CODES.map((c) => (
              <span key={c.id}>
                <span className="cc-cmp-swatch" style={{ background: CHART[c.color] }} />
                {c.label} (Rc={c.rate.toFixed(2)})
              </span>
            ))}
          </div>
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.cmp.chart')}>
          <Canvas
            height={300}
            ariaLabel="BER versus Eb/N0 for several codes against the Shannon limit"
            deps={[exp]}
            draw={(ctx, w, h) => drawComparison(ctx, w, h, targetBer)}
          />
        </Panel>

        <Panel title={t('cc.cmp.table')}>
          <table className="cc-cmp-table">
            <thead>
              <tr>
                <th>{t('cc.cmp.code')}</th>
                <th>{t('cc.cmp.rate')}</th>
                <th>{t('cc.cmp.req')}</th>
                <th>{t('cc.cmp.gain')}</th>
                <th>{t('cc.cmp.gap')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code.id}>
                  <td>
                    <span className="cc-cmp-swatch" style={{ background: CHART[r.code.color] }} />
                    {r.code.label}
                  </td>
                  <td>{r.code.rate.toFixed(3)}</td>
                  <td>{fmt(r.req)}</td>
                  <td className={r.gain === bestGain && r.gain > 0 ? 'best' : undefined}>
                    {r.gain > 0 ? `+${r.gain.toFixed(2)}` : r.gain.toFixed(2)}
                  </td>
                  <td>{r.gap.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <TheoryBox>
          <Formula
            tex={'G_{\\mathrm{coding}} = (E_b/N_0)_{\\mathrm{uncoded}} - (E_b/N_0)_{\\mathrm{coded}}\\ \\text{at a target BER}'}
            block
          />
          <Formula tex={'(E_b/N_0)_{\\min} = \\frac{2^{R}-1}{R} \\;\\to\\; -1.59\\,\\mathrm{dB}\\ (R\\to 0)'} block />
          <p>{t('cc.cmp.note')}</p>
        </TheoryBox>
      </div>
    </div>
  );
}
