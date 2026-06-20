import { useMemo, useState } from 'react';
import { Panel, Readout, Formula, TheoryBox, InfoCard } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, drawAxes, type Axes } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import {
  entropy,
  jointEntropy,
  marginals,
  conditionalEntropies,
  mutualInformationJoint,
} from '@/lib/dsp/entropy';
import { t } from '@/i18n';

type PresetKey = 'ex616' | 'ex617' | 'indep';

// pxy[x][y] = p(X=x, Y=y); rows = X ∈ {0,1}, cols = Y ∈ {0,1}.
const PRESETS: Record<PresetKey, number[][]> = {
  ex616: [
    [0.25, 0.25],
    [0, 0.5],
  ],
  ex617: [
    [1 / 3, 1 / 3],
    [1 / 3, 0],
  ],
  indep: [
    [0.25, 0.25],
    [0.25, 0.25],
  ],
};

const BAR_PAD = { l: 16, r: 16, t: 18, b: 40 };

export function JointInfoSection() {
  const [cells, setCells] = useState<number[][]>(PRESETS.ex616);

  // Auto-normalize before any DSP call (Σ p = 1).
  const pxy = useMemo(() => {
    const sum = cells.flat().reduce((s, v) => s + Math.max(0, v), 0) || 1;
    return cells.map((row) => row.map((v) => Math.max(0, v) / sum));
  }, [cells]);

  const { px, py } = marginals(pxy);
  const Hx = entropy(px);
  const Hy = entropy(py);
  const Hxy = jointEntropy(pxy);
  const { hXgivenY, hYgivenX } = conditionalEntropies(pxy);
  const I = Math.max(0, mutualInformationJoint(pxy));

  const rawSum = cells.flat().reduce((s, v) => s + v, 0);
  const setCell = (x: number, y: number, v: number) =>
    setCells((c) => c.map((row, i) => row.map((val, j) => (i === x && j === y ? v : val))));

  return (
    <div className="module-layout">
      <aside className="it-controls">
        <Panel title={t('it.joint.matrix')}>
          <table className="it-joint">
            <thead>
              <tr>
                <th aria-hidden="true" />
                <th>Y=0</th>
                <th>Y=1</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1].map((x) => (
                <tr key={x}>
                  <th>X={x}</th>
                  {[0, 1].map((y) => (
                    <td key={y}>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={cells[x][y]}
                        onChange={(e) => setCell(x, y, Number(e.target.value))}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="it-mono">Σ p(x,y) = {rawSum.toFixed(2)}</div>
          <div className="it-row">
            <button type="button" onClick={() => setCells(PRESETS.ex616)}>
              {t('it.joint.ex616')}
            </button>
            <button type="button" onClick={() => setCells(PRESETS.ex617)}>
              {t('it.joint.ex617')}
            </button>
            <button type="button" onClick={() => setCells(PRESETS.indep)}>
              {t('it.joint.indep')}
            </button>
          </div>
        </Panel>
      </aside>

      <div className="it-content">
        <div className="it-readouts">
          <Readout label="H(X)" value={Hx.toFixed(3)} unit="bits" />
          <Readout label="H(Y)" value={Hy.toFixed(3)} unit="bits" />
          <Readout label="H(X,Y)" value={Hxy.toFixed(3)} unit="bits" />
          <Readout label="H(X|Y)" value={hXgivenY.toFixed(3)} unit="bits" />
          <Readout label="H(Y|X)" value={hYgivenX.toFixed(3)} unit="bits" />
          <Readout label="I(X;Y)" value={I.toFixed(3)} unit="bits" tone="ok" />
        </div>

        <Panel title={t('it.joint.venn')}>
          <Canvas
            height={240}
            ariaLabel="Entropy Venn diagram of H(X), H(Y) and mutual information"
            deps={[Hx, Hy, I, hXgivenY, hYgivenX]}
            draw={(ctx, w, h) => {
              const cy = h / 2 + 4;
              const s = 30; // px per √bit (area ∝ entropy)
              const rX = Math.sqrt(Math.max(Hx, 0.001)) * s;
              const rY = Math.sqrt(Math.max(Hy, 0.001)) * s;
              const minH = Math.min(Hx, Hy);
              const ov = minH > 1e-6 ? Math.min(1, I / minH) : 0; // overlap fraction
              const dist = (rX + rY) * (1 - 0.85 * ov);
              const cxX = w / 2 - dist / 2;
              const cxY = w / 2 + dist / 2;

              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(cxX, cy, rX, 0, Math.PI * 2);
              ctx.fillStyle = alpha(CHART.green, 0.18);
              ctx.fill();
              ctx.strokeStyle = CHART.green;
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(cxY, cy, rY, 0, Math.PI * 2);
              ctx.fillStyle = alpha(CHART.blue, 0.18);
              ctx.fill();
              ctx.strokeStyle = CHART.blue;
              ctx.stroke();

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = '12px system-ui, sans-serif';
              ctx.fillStyle = CHART.text;
              ctx.fillText('H(X|Y)', cxX - rX * 0.45, cy - 7);
              ctx.fillText(hXgivenY.toFixed(2), cxX - rX * 0.45, cy + 9);
              ctx.fillText('H(Y|X)', cxY + rY * 0.45, cy - 7);
              ctx.fillText(hYgivenX.toFixed(2), cxY + rY * 0.45, cy + 9);
              ctx.fillStyle = CHART.orange;
              ctx.fillText('I(X;Y)', w / 2, cy - 7);
              ctx.fillText(I.toFixed(2), w / 2, cy + 9);
              ctx.fillStyle = CHART.green;
              ctx.fillText('H(X)', cxX, 14);
              ctx.fillStyle = CHART.blue;
              ctx.fillText('H(Y)', cxY, 14);
              ctx.textAlign = 'start';
              ctx.textBaseline = 'alphabetic';
            }}
          />
        </Panel>

        <Panel title={t('it.joint.decomp')}>
          <Canvas
            height={130}
            ariaLabel="Stacked decomposition of joint entropy into conditional and mutual parts"
            deps={[Hxy, hXgivenY, I, hYgivenX]}
            draw={(ctx, w, h) => {
              const total = Math.max(Hxy, 0.001);
              const ax: Axes = {
                x: linScale([0, total], [BAR_PAD.l, w - BAR_PAD.r]),
                y: linScale([0, 1], [h - BAR_PAD.b, BAR_PAD.t]),
              };
              drawAxes(ctx, ax, [0, total], {
                xLabel: '$\\text{information}\\,(\\mathrm{bits})$',
                yTicks: [],
              });
              const top = ax.y(0.85);
              const bot = ax.y(0.15);
              let x0 = 0;
              const seg = (val: number, color: string, label: string) => {
                if (val <= 0) return;
                const xs = ax.x(x0);
                const xe = ax.x(x0 + val);
                ctx.fillStyle = alpha(color, 0.55);
                ctx.fillRect(xs, top, xe - xs, bot - top);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(xs, top, xe - xs, bot - top);
                if (xe - xs > 26) {
                  ctx.fillStyle = CHART.text;
                  ctx.font = '11px system-ui, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText(label, (xs + xe) / 2, (top + bot) / 2);
                  ctx.textAlign = 'start';
                }
                x0 += val;
              };
              seg(hXgivenY, CHART.green, 'H(X|Y)');
              seg(I, CHART.orange, 'I(X;Y)');
              seg(hYgivenX, CHART.blue, 'H(Y|X)');
            }}
          />
        </Panel>

        <div className="info-cards">
          <InfoCard title={t('it.joint.card.joint')} accent="green">
            <p>{t('it.joint.card.jointBody')}</p>
          </InfoCard>
          <InfoCard title={t('it.joint.card.cond')} accent="green">
            <p>{t('it.joint.card.condBody')}</p>
          </InfoCard>
          <InfoCard title={t('it.joint.card.mi')} accent="orange">
            <p>{t('it.joint.card.miBody')}</p>
          </InfoCard>
          <InfoCard title={t('it.joint.card.chain')} accent="green">
            <p>{t('it.joint.card.chainBody')}</p>
            <Formula tex="H(X,Y)=H(Y)+H(X\mid Y)" block />
          </InfoCard>
          <InfoCard title={t('it.joint.card.capacity')} accent="blue">
            <p>{t('it.joint.card.capacityBody')}</p>
            <Formula tex="C=\max_{p(x)} I(X;Y)" block />
          </InfoCard>
        </div>

        <TheoryBox title={t('it.theory.title')}>
          <Formula tex="H(X,Y)=-\sum_{x,y} p(x,y)\log_2 p(x,y)" block />
          <Formula tex="H(X\mid Y)=-\sum_{x,y} p(x,y)\log_2 p(x\mid y)=H(X,Y)-H(Y)" block />
          <Formula tex="I(X;Y)=\sum_{x,y} p(x,y)\log_2\frac{p(x,y)}{p(x)p(y)}" block />
          <Formula tex="I(X;Y)=H(X)-H(X\mid Y)=H(Y)-H(Y\mid X)=H(X)+H(Y)-H(X,Y)" block />
        </TheoryBox>
      </div>
    </div>
  );
}
