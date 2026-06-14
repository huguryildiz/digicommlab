import { useMemo, useState } from 'react';
import { Panel, Select, Slider, Readout, Formula, TheoryBox } from '@/components';
import { Canvas } from '@/lib/plot/Canvas';
import { linScale, logScale, drawLine, drawVLine, drawText } from '@/lib/plot/draw';
import { CHART, alpha } from '@/lib/plot/colors';
import {
  CODES,
  encode,
  decode,
  syndromeTable,
  errorCorrectionT,
  allCodewords,
  hammingDistance,
  uncodedBerBpsk,
  codedBerHard,
  codedBerSoftRef,
  type LinearCode,
} from '@/lib/dsp/blockcodes';
import { t } from '@/i18n';

type CodeId = 'hamming74' | 'hamming1511' | 'rep31';

export function BlockCodesSection() {
  const [codeId, setCodeId] = useState<CodeId>('hamming74');
  const code = CODES.find((c) => c.id === codeId) as LinearCode;
  const [message, setMessage] = useState<number[]>(() => new Array(4).fill(0));
  const [errorPattern, setErrorPattern] = useState<number[]>(() => new Array(7).fill(0));
  const [ebN0Db, setEbN0Db] = useState(8);

  const selectCode = (id: CodeId) => {
    const c = CODES.find((cc) => cc.id === id) as LinearCode;
    setCodeId(id);
    setMessage(new Array(c.k).fill(0));
    setErrorPattern(new Array(c.n).fill(0));
  };

  const table = useMemo(() => syndromeTable(code.H), [code]);
  const codeword = encode(message, code.G);
  const received = codeword.map((b, i) => b ^ errorPattern[i]);
  const dec = decode(received, code, table);
  const tt = errorCorrectionT(code.dmin);
  const numErr = errorPattern.reduce((a, b) => a + b, 0);
  const recovered = dec.message.every((b, i) => b === message[i]);

  const toggleMsg = (i: number) => setMessage((m) => m.map((b, j) => (j === i ? b ^ 1 : b)));
  const toggleErr = (i: number) => setErrorPattern((e) => e.map((b, j) => (j === i ? b ^ 1 : b)));

  return (
    <div className="cc-section">
      <aside className="cc-controls">
        <Panel title={t('cc.bc.code')}>
          <Select<CodeId>
            label={t('cc.bc.codeSel')}
            value={codeId}
            options={CODES.map((c) => ({ value: c.id as CodeId, label: c.label }))}
            onChange={selectCode}
          />
          <div className="cc-readouts">
            <Readout label="n" value={code.n} />
            <Readout label="k" value={code.k} />
            <Readout label="Rc" value={(code.k / code.n).toFixed(3)} />
            <Readout label="d_min" value={code.dmin} />
            <Readout label="t" value={tt} tone="ok" />
          </div>
        </Panel>
        <Panel title={t('cc.bc.message')}>
          <div className="cc-bc-bits">
            {message.map((b, i) => (
              <button
                key={i}
                type="button"
                className={b ? 'cc-bit cc-bit--x cc-bit--on' : 'cc-bit'}
                onClick={() => toggleMsg(i)}
              >
                {b}
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={t('cc.bc.errors')}>
          <p className="cc-bc-hint">{t('cc.bc.errorsHint')}</p>
          <div className="cc-bc-bits">
            {received.map((b, i) => (
              <button
                key={i}
                type="button"
                className={errorPattern[i] ? 'cc-bit cc-bit--err cc-bit--on' : 'cc-bit'}
                onClick={() => toggleErr(i)}
              >
                {b}
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={t('cc.bc.curveCtl')}>
          <Slider
            label="Eb/N₀"
            value={ebN0Db}
            min={0}
            max={12}
            step={0.5}
            unit="dB"
            onChange={setEbN0Db}
          />
        </Panel>
      </aside>

      <div className="cc-content">
        <Panel title={t('cc.bc.matrices')}>
          <div className="cc-bc-mtx-wrap">
            <div>
              <div className="cc-bc-mtx-label">G = [I | P]</div>
              <MatrixGrid m={code.G} split={code.k} identLeft />
            </div>
            <div>
              <div className="cc-bc-mtx-label">H = [Pᵀ | I]</div>
              <MatrixGrid m={code.H} split={code.k} identLeft={false} />
            </div>
          </div>
        </Panel>

        <Panel title={t('cc.bc.encode')}>
          <BitRow label="x" bits={message} kind="x" />
          <BitRow label="c = xG" bits={codeword} kind="code" split={code.k} />
        </Panel>

        <Panel title={t('cc.bc.decode')}>
          <BitRow label="r = c ⊕ e" bits={received} kind="recv" errorMask={errorPattern} />
          <BitRow label="s = rHᵀ" bits={dec.syndrome} kind="syn" />
          <p className="cc-bc-line">
            {dec.errorPos >= 0
              ? `${t('cc.bc.synPos')} ${dec.errorPos}`
              : dec.syndrome.every((b) => b === 0)
                ? t('cc.bc.synZero')
                : t('cc.bc.synNone')}
          </p>
          <BitRow label="ĉ" bits={dec.corrected} kind="code" split={code.k} />
          <BitRow label="x̂" bits={dec.message} kind="x" />
          <p
            className={
              recovered ? 'cc-bc-status cc-bc-status--ok' : 'cc-bc-status cc-bc-status--err'
            }
          >
            {recovered ? t('cc.bc.ok') : t('cc.bc.fail')} ({numErr} {t('cc.bc.errBits')}, t = {tt})
          </p>
        </Panel>

        <Panel title={t('cc.bc.curve')}>
          <Canvas
            height={260}
            ariaLabel="Coding gain: coded versus uncoded BER"
            deps={[codeId, ebN0Db]}
            draw={(ctx, w, h) => drawCodingGain(ctx, w, h, code, ebN0Db)}
          />
        </Panel>

        {code.n === 3 && (
          <Panel title={t('cc.bc.cube')}>
            <Canvas
              height={240}
              ariaLabel="Hamming cube"
              deps={[codeId]}
              draw={(ctx, w, h) => drawCube(ctx, w, h, code)}
            />
          </Panel>
        )}

        <TheoryBox title={t('cc.theory')}>
          <Formula
            tex="c = xG,\qquad s = rH^{\mathsf T},\qquad G=[I_k\,|\,P],\ H=[P^{\mathsf T}\,|\,I_{n-k}]"
            block
          />
          <Formula
            tex="\text{Hamming}\,(2^m{-}1,\ 2^m{-}m{-}1,\ 3),\qquad t=\left\lfloor\tfrac{d_{\min}-1}{2}\right\rfloor"
            block
          />
        </TheoryBox>
      </div>
    </div>
  );
}

function MatrixGrid({ m, split, identLeft }: { m: number[][]; split: number; identLeft: boolean }) {
  return (
    <div className="cc-bc-mtx" style={{ gridTemplateColumns: `repeat(${m[0].length}, 1fr)` }}>
      {m.map((row, i) =>
        row.map((b, j) => {
          const isIdent = identLeft ? j < split : j >= split;
          return (
            <span
              key={`${i}-${j}`}
              className={`cc-bc-cell ${isIdent ? 'cc-bc-cell--ident' : 'cc-bc-cell--p'}`}
            >
              {b}
            </span>
          );
        }),
      )}
    </div>
  );
}

function BitRow({
  label,
  bits,
  kind,
  split,
  errorMask,
}: {
  label: string;
  bits: number[];
  kind: 'x' | 'code' | 'recv' | 'syn';
  split?: number;
  errorMask?: number[];
}) {
  return (
    <div className="cc-bc-row">
      <span className="cc-bc-row-label">{label}</span>
      <div className="cc-bc-bits">
        {bits.map((b, i) => {
          let cls = 'cc-bit cc-bit--ro';
          if (errorMask && errorMask[i]) cls += ' cc-bit--err';
          else if (kind === 'x') cls += ' cc-bit--x';
          else if (kind === 'syn') cls += ' cc-bit--syn';
          else if (kind === 'code' && split !== undefined && i >= split) cls += ' cc-bit--parity';
          if (b) cls += ' cc-bit--on';
          return (
            <span key={i} className={cls}>
              {b}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** BER vs Eb/N0 (log y): uncoded, hard-decision coded, soft-decision reference. */
function drawCodingGain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  code: LinearCode,
  ebN0DbCur: number,
): void {
  const XMIN = 0;
  const XMAX = 12;
  const YMIN = 1e-6;
  const YMAX = 0.5;
  const ax = { x: linScale([XMIN, XMAX], [40, w - 10]), y: logScale([YMIN, YMAX], [h - 24, 10]) };
  const clampY = (v: number) => Math.min(YMAX, Math.max(YMIN, v));
  const xs: number[] = [];
  const unc: number[] = [];
  const hard: number[] = [];
  const soft: number[] = [];
  for (let db = XMIN; db <= XMAX + 1e-9; db += 0.25) {
    xs.push(db);
    unc.push(clampY(uncodedBerBpsk(db)));
    hard.push(clampY(codedBerHard(code, db)));
    soft.push(clampY(codedBerSoftRef(code, db)));
  }
  drawLine(ctx, ax, xs, unc, CHART.green, 2);
  drawLine(ctx, ax, xs, hard, CHART.orange, 2);
  drawLine(ctx, ax, xs, soft, alpha(CHART.blue, 0.9), 1.5, true);
  drawVLine(ctx, ax, ebN0DbCur, YMIN, YMAX, alpha(CHART.pink, 0.8), true, 1.5);
  drawText(ctx, ax, 0.3, clampY(uncodedBerBpsk(0.3)), 'uncoded', CHART.green, 4, -4);
  drawText(ctx, ax, XMAX, clampY(codedBerHard(code, XMAX)), 'hard', CHART.orange, -26, -4);
  drawText(ctx, ax, XMAX, clampY(codedBerSoftRef(code, XMAX)), 'soft', CHART.blue, -26, 10);
}

/** Project the 3-bit cube; codeword vertices filled, single-bit-flip edges drawn. */
function drawCube(ctx: CanvasRenderingContext2D, w: number, h: number, code: LinearCode): void {
  const codewords = new Set(allCodewords(code.G).map((c) => c.join('')));
  const ax = { x: linScale([0, 1], [0, w]), y: linScale([0, 1], [h, 0]) };
  const proj = (b: number[]): [number, number] => [
    0.28 + b[0] * 0.46 + b[2] * 0.2,
    0.76 - b[1] * 0.5 - b[2] * 0.2,
  ];
  const verts: number[][] = [];
  for (let v = 0; v < 8; v++) verts.push([(v >> 2) & 1, (v >> 1) & 1, v & 1]);
  ctx.strokeStyle = alpha(CHART.dim, 0.5);
  ctx.lineWidth = 1;
  for (let a = 0; a < 8; a++) {
    for (let b = a + 1; b < 8; b++) {
      if (hammingDistance(verts[a], verts[b]) === 1) {
        const pa = proj(verts[a]);
        const pb = proj(verts[b]);
        ctx.beginPath();
        ctx.moveTo(ax.x(pa[0]), ax.y(pa[1]));
        ctx.lineTo(ax.x(pb[0]), ax.y(pb[1]));
        ctx.stroke();
      }
    }
  }
  for (const vert of verts) {
    const p = proj(vert);
    const isCw = codewords.has(vert.join(''));
    ctx.beginPath();
    ctx.arc(ax.x(p[0]), ax.y(p[1]), isCw ? 8 : 5, 0, Math.PI * 2);
    if (isCw) {
      ctx.fillStyle = CHART.green;
      ctx.fill();
    } else {
      ctx.fillStyle = CHART.bgDeep;
      ctx.fill();
      ctx.strokeStyle = CHART.dim;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = isCw ? CHART.bgDeep : CHART.dim;
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(vert.join(''), ax.x(p[0]), ax.y(p[1]));
  }
  ctx.textAlign = 'start';
  drawText(ctx, ax, 0.5, 0.08, `codewords {000, 111},  d_min = ${code.dmin}`, CHART.dim, 0, 0);
}
