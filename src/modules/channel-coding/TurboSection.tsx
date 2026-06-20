import { useMemo, useState } from 'react';
import { Panel, Slider, Readout, Formula, TheoryBox, InfoCard, TransportControls } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawLine, drawText } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import { useSimulationLoop } from '@/lib/sim/useSimulationLoop';
import { makeInterleaver, turboEncode, turboDecode, turboChannelLLRs } from '@/lib/dsp/turbocodes';
import { makeRng } from '@/lib/dsp/random';
import { t } from '@/i18n';

const N = 48; // frame length
const MAX_ITERS = 8;
const PAD = { l: 44, r: 12, t: 14, b: 30 };

// Fixed information frame + interleaver (seeded); only the channel noise rerolls.
const U: number[] = (() => {
  const rng = makeRng(2718);
  return Array.from({ length: N }, () => (rng() < 0.5 ? 0 : 1));
})();
const PERM = makeInterleaver(N, makeRng(31415));

export function TurboSection() {
  const [ebN0Db, setEbN0Db] = useState(1);
  const [seed, setSeed] = useState(7);
  const [iterIdx, setIterIdx] = useState(0);

  const iters = useMemo(() => {
    const enc = turboEncode(U, PERM);
    const ch = turboChannelLLRs(enc, ebN0Db, makeRng(seed));
    return turboDecode(ch.lcSys, ch.lcPar1, ch.lcPar2, PERM, MAX_ITERS);
  }, [ebN0Db, seed]);

  const cur = iters[Math.min(iterIdx, iters.length - 1)];
  const errorsPerIter = iters.map((it) => it.hard.reduce((a, b, i) => a + (b !== U[i] ? 1 : 0), 0));
  const errors = errorsPerIter[Math.min(iterIdx, iters.length - 1)];

  const loop = useSimulationLoop({
    ticksPerSecond: 1.2,
    onTick: () => setIterIdx((i) => (i + 1) % MAX_ITERS),
    onReset: () => setIterIdx(0),
  });

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.tb.params')}>
          <Slider label="Eb/N₀" value={ebN0Db} min={-1} max={4} step={0.25} unit="dB" onChange={setEbN0Db} />
          <button type="button" onClick={() => setSeed((s) => s + 1)}>
            🎲 {t('cc.tb.reroll')}
          </button>
          <div className="cc-readouts">
            <Readout label="rate" value="1/3" />
            <Readout label="N" value={N} />
            <Readout label={t('cc.tb.iter')} value={cur.iter} />
            <Readout label={t('cc.tb.errors')} value={errors} tone={errors === 0 ? 'ok' : 'err'} />
          </div>
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.tb.llrTitle')}>
          <TransportControls loop={loop} />
          <Canvas
            height={170}
            ariaLabel="Per-bit a-posteriori LLR reliability over turbo iterations"
            deps={[cur, ebN0Db]}
            draw={(ctx, w, h) => drawLlrBars(ctx, w, h, cur.app, cur.hard)}
          />
        </Panel>

        <Panel title={t('cc.tb.berTitle')}>
          <Canvas
            height={220}
            ariaLabel="Bit errors versus turbo iteration"
            deps={[errorsPerIter, iterIdx]}
            draw={(ctx, w, h) => drawErrorsCurve(ctx, w, h, errorsPerIter, iterIdx)}
          />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('cc.tb.card.rsc')} accent="green">
            <p>{t('cc.tb.card.rscBody')}</p>
          </InfoCard>
          <InfoCard title={t('cc.tb.card.parallel')} accent="orange">
            <p>{t('cc.tb.card.parallelBody')}</p>
            <Formula tex="R=\tfrac13:\quad (u,\,p_1,\,p_2),\ p_2=\mathrm{RSC}(\Pi u)" block />
          </InfoCard>
          <InfoCard title={t('cc.tb.card.bcjr')} accent="blue">
            <p>{t('cc.tb.card.bcjrBody')}</p>
          </InfoCard>
          <InfoCard title={t('cc.tb.card.iter')} accent="blue">
            <p>{t('cc.tb.card.iterBody')}</p>
          </InfoCard>
          <InfoCard title={t('cc.tb.card.shannon')} accent="green">
            <p>{t('cc.tb.card.shannonBody')}</p>
          </InfoCard>
        </div>

        <TheoryBox title={t('cc.theory')}>
          <Formula tex="L(u_k)=\ln\frac{P(u_k=0\mid y)}{P(u_k=1\mid y)}=\max^{*}_{u_k=0}(\alpha+\gamma+\beta)-\max^{*}_{u_k=1}(\alpha+\gamma+\beta)" block />
          <Formula tex="L_e^{(1)}\!\to\!\Pi\!\to\! L_a^{(2)},\quad L_e^{(2)}\!\to\!\Pi^{-1}\!\to\! L_a^{(1)}\ \text{(iterate)}" block />
        </TheoryBox>
      </div>
    </div>
  );
}

/** Per-bit signed-reliability bars: height ∝ tanh(|LLR|/2); green if decision correct, pink if wrong. */
function drawLlrBars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  app: number[],
  hard: number[],
): void {
  const ax = { x: linScale([0, app.length], [PAD.l, w - PAD.r]), y: linScale([0, 1], [h - PAD.b, PAD.t]) };
  const y0 = ax.y(0);
  const bw = Math.max(2, (ax.x(1) - ax.x(0)) * 0.7);
  app.forEach((l, i) => {
    const rel = Math.tanh(Math.abs(l) / 2); // 0..1 reliability
    const correct = hard[i] === U[i];
    ctx.fillStyle = correct ? alpha(CHART.green, 0.8) : CHART.pink;
    ctx.fillRect(ax.x(i + 0.15), ax.y(rel), bw, y0 - ax.y(rel));
  });
  ctx.fillStyle = CHART.dim;
  ctx.font = '10px ui-monospace, monospace';
  ctx.fillText('reliability  tanh(|L|/2)', PAD.l, 11);
}

/** Bit errors vs iteration, points revealed up to the current iteration. */
function drawErrorsCurve(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  errs: number[],
  iterIdx: number,
): void {
  const maxE = Math.max(1, ...errs);
  const ax = {
    x: linScale([1, MAX_ITERS], [PAD.l, w - PAD.r]),
    y: linScale([0, maxE * 1.1], [h - PAD.b, PAD.t]),
  };
  // axes ticks
  ctx.strokeStyle = alpha(CHART.dim, 0.4);
  ctx.lineWidth = 1;
  for (let it = 1; it <= MAX_ITERS; it++) {
    ctx.beginPath();
    ctx.moveTo(ax.x(it), ax.y(0));
    ctx.lineTo(ax.x(it), ax.y(0) + 4);
    ctx.stroke();
    ctx.fillStyle = CHART.dim;
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(it), ax.x(it), ax.y(0) + 16);
  }
  ctx.textAlign = 'start';
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= iterIdx && i < errs.length; i++) {
    xs.push(i + 1);
    ys.push(errs[i]);
  }
  if (xs.length >= 2) drawLine(ctx, ax, xs, ys, CHART.blue, 2);
  xs.forEach((x, i) => {
    ctx.fillStyle = ys[i] === 0 ? CHART.green : CHART.orange;
    ctx.beginPath();
    ctx.arc(ax.x(x), ax.y(ys[i]), 4, 0, Math.PI * 2);
    ctx.fill();
  });
  drawText(ctx, ax, 1, maxE * 1.05, 'bit errors', CHART.dim, 0, 0);
  drawText(ctx, ax, MAX_ITERS, 0, 'iteration', CHART.dim, -50, -6);
}
