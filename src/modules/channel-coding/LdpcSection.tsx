import { useMemo, useState } from 'react';
import { Panel, Slider, Readout, Formula, TheoryBox, InfoCard, TransportControls } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { CHART, alpha } from '@/lib/plot/colors';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { DEMO_LDPC_H, checkNeighbors, sumProductDecode, type BpIter } from '@/lib/dsp/ldpc';
import { gaussian } from '@/lib/dsp/awgn';
import { makeRng } from '@/lib/dsp/random';
import { t } from '@/i18n';

const H = DEMO_LDPC_H;
const NV = H[0].length; // 6 variables
const NC = H.length; // 4 checks
const MAX_ITERS = 12;

export function LdpcSection() {
  const [ebN0Db, setEbN0Db] = useState(2);
  const [seed, setSeed] = useState(5);
  const [forced, setForced] = useState<boolean[]>(() => {
    const f = new Array<boolean>(NV).fill(false);
    f[2] = true; // start with one injected error so the graph has something to fix
    return f;
  });
  const [iterIdx, setIterIdx] = useState(0);

  // All-zero codeword over BPSK (+1) + AWGN → channel LLRs; forced bits are pinned wrong.
  const llrCh = useMemo(() => {
    const R = 0.5;
    const g = 10 ** (ebN0Db / 10);
    const sigma2 = 1 / (2 * R * g);
    const sigma = Math.sqrt(sigma2);
    const rng = makeRng(seed);
    return Array.from({ length: NV }, (_, v) => {
      if (forced[v]) return -6; // confidently-wrong injected error
      const y = 1 + sigma * gaussian(rng); // tx symbol +1 (bit 0)
      return (2 * y) / sigma2;
    });
  }, [ebN0Db, seed, forced]);

  const iters = useMemo(() => sumProductDecode(llrCh, H, MAX_ITERS), [llrCh]);
  const cur: BpIter = iters[Math.min(iterIdx, iters.length - 1)];
  const errors = cur.hard.reduce((a, b) => a + b, 0); // distance from all-zero tx
  const unsat = H.reduce((acc, row) => acc + (row.reduce((x, b, v) => x ^ (b & cur.hard[v]), 0) ? 1 : 0), 0);

  const loop = useSimulationLoop({
    ticksPerSecond: 1.2,
    onTick: () => setIterIdx((i) => (i + 1) % Math.max(1, iters.length)),
    onReset: () => setIterIdx(0),
  });

  const flip = (v: number) => setForced((f) => f.map((b, i) => (i === v ? !b : b)));

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.lp.params')}>
          <Slider label="Eb/N₀" value={ebN0Db} min={-1} max={6} step={0.25} unit="dB" onChange={setEbN0Db} />
          <button type="button" onClick={() => setSeed((s) => s + 1)}>
            🎲 {t('cc.lp.reroll')}
          </button>
          <p className="cc-bc-hint">{t('cc.lp.flipHint')}</p>
          <div className="cc-bc-bits">
            {forced.map((b, v) => (
              <button
                key={v}
                type="button"
                className={b ? 'cc-bit cc-bit--err cc-bit--on' : 'cc-bit'}
                onClick={() => flip(v)}
              >
                v{v}
              </button>
            ))}
          </div>
          <div className="cc-readouts">
            <Readout label="n,k" value={`${NV},3`} />
            <Readout label={t('cc.lp.iter')} value={cur.iter} />
            <Readout label={t('cc.lp.unsat')} value={unsat} tone={unsat === 0 ? 'ok' : 'err'} />
            <Readout label={t('cc.lp.errors')} value={errors} tone={errors === 0 ? 'ok' : 'err'} />
          </div>
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.lp.graphTitle')}>
          <TransportControls loop={loop} />
          <Canvas
            height={300}
            ariaLabel="LDPC Tanner graph with belief-propagation messages"
            deps={[cur, forced]}
            draw={(ctx, w, h) => drawTanner(ctx, w, h, cur)}
          />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('cc.lp.card.tanner')} accent="green">
            <p>{t('cc.lp.card.tannerBody')}</p>
          </InfoCard>
          <InfoCard title={t('cc.lp.card.sparse')} accent="orange">
            <p>{t('cc.lp.card.sparseBody')}</p>
          </InfoCard>
          <InfoCard title={t('cc.lp.card.bp')} accent="blue">
            <p>{t('cc.lp.card.bpBody')}</p>
            <Formula tex="L_{c\to v}=2\,\mathrm{atanh}\!\Big(\!\prod_{v'\ne v}\tanh\tfrac{L_{v'\to c}}{2}\Big)" block />
          </InfoCard>
          <InfoCard title={t('cc.lp.card.modern')} accent="green">
            <p>{t('cc.lp.card.modernBody')}</p>
          </InfoCard>
        </div>

        <TheoryBox title={t('cc.theory')}>
          <Formula tex="H\,\mathbf{x}^{\mathsf T}=\mathbf 0;\quad \text{Tanner graph: } n\text{ variable nodes},\ m\text{ check nodes}" block />
          <Formula tex="L_v=L_{\mathrm{ch}}(v)+\sum_{c}L_{c\to v},\qquad \hat x_v=\tfrac{1-\mathrm{sgn}\,L_v}{2}" block />
        </TheoryBox>
      </div>
    </div>
  );
}

/** Draw the bipartite Tanner graph: variable nodes (top), check nodes (bottom, □), edges from H. */
function drawTanner(ctx: CanvasRenderingContext2D, w: number, h: number, cur: BpIter): void {
  const cn = checkNeighbors(H);
  const vx = (v: number) => 40 + (v * (w - 80)) / Math.max(1, NV - 1);
  const cx = (c: number) => (w * (c + 1)) / (NC + 1);
  const vy = 50;
  const cy = h - 50;
  const checkSat = H.map((row) => row.reduce((x, b, v) => x ^ (b & cur.hard[v]), 0) === 0);

  // edges
  for (let c = 0; c < NC; c++) {
    for (const v of cn[c]) {
      ctx.strokeStyle = alpha(checkSat[c] ? CHART.dim : CHART.pink, 0.5);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(vx(v), vy);
      ctx.lineTo(cx(c), cy);
      ctx.stroke();
    }
  }
  // variable nodes (circles), colored by hard decision, size by reliability
  for (let v = 0; v < NV; v++) {
    const rel = Math.tanh(Math.abs(cur.llr[v]) / 2);
    const wrong = cur.hard[v] === 1; // all-zero tx → any 1 is an error
    ctx.fillStyle = wrong ? CHART.pink : alpha(CHART.green, 0.4 + 0.6 * rel);
    ctx.beginPath();
    ctx.arc(vx(v), vy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CHART.green;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = CHART.text;
    ctx.font = '11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`v${v}`, vx(v), vy - 22);
    ctx.fillText(String(cur.hard[v]), vx(v), vy);
  }
  // check nodes (squares), green if satisfied else red
  for (let c = 0; c < NC; c++) {
    ctx.fillStyle = checkSat[c] ? alpha(CHART.green, 0.7) : CHART.pink;
    ctx.fillRect(cx(c) - 11, cy - 11, 22, 22);
    ctx.strokeStyle = checkSat[c] ? CHART.green : CHART.pink;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx(c) - 11, cy - 11, 22, 22);
    ctx.fillStyle = CHART.text;
    ctx.fillText(checkSat[c] ? '✓' : '✗', cx(c), cy);
    ctx.fillText(`c${c}`, cx(c), cy + 22);
  }
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}
