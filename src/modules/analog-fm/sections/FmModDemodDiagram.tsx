import { Schematic, Block, Wire, Arrowhead, MathLabel } from '@/lib/plot/schematic';
import '@/lib/plot/schematic.css';

// ============================================================================
// FM Modulator block diagrams (Proakis & Salehi §4.3, Figs 4.7 / 4.9)
// Two rows:
//   Row 1 — Direct FM (VCO): m(t) → [Varactor C(t)] → [LC Osc./VCO] → u(t)
//   Row 2 — Armstrong indirect FM: m(t) → [NBFM Mod.] → [×n Mult.] → u(t)
// ============================================================================

const MOD_W = 400;
const MOD_H = 100;
const BW = 86;
const BH = 20;

/** One modulator row (Direct FM or Armstrong). */
function ModRow({
  cy,
  label1,
  tex1,
  label2,
  tex2,
  rowLabel,
  labelDy = 0,
}: {
  cy: number;
  label1: string;
  tex1: string;
  label2: string;
  tex2: string;
  rowLabel: string;
  labelDy?: number;
}) {
  const by = cy - BH / 2;

  return (
    <>
      {/* Row label — IBM Plex Sans, not mono */}
      <text
        x={MOD_W / 2}
        y={cy - BH / 2 - 10 + labelDy}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fill: 'var(--text)', fontFamily: 'var(--font)', fontSize: '9px', stroke: 'none' }}
      >
        {rowLabel}
      </text>

      {/* Wires */}
      <Wire points={[46, cy, 66, cy]} />
      <Arrowhead x={68} y={cy} />
      <Wire points={[152, cy, 168, cy]} />
      <Arrowhead x={170} y={cy} />
      <Wire points={[252, cy, 268, cy]} />
      <Arrowhead x={270} y={cy} />
      <Wire points={[352, cy, 370, cy]} />
      <Arrowhead x={372} y={cy} />

      {/* Block 1 */}
      <Block x={66} y={by} w={BW} h={BH} label={label1} tex={tex1} />

      {/* Block 2 */}
      <Block x={250} y={by} w={BW} h={BH} label={label2} tex={tex2} />

      {/* I/O labels */}
      <MathLabel x={30} y={cy} tex="m(t)" w={32} />
      <MathLabel x={390} y={cy} tex="u(t)" w={28} />
    </>
  );
}

/**
 * FM Modulator block diagram (§4.3, Figs 4.7 / 4.9).
 * Direct FM (top) and Armstrong indirect FM (bottom).
 */
export function FmModulatorDiagram() {
  return (
    <Schematic width={MOD_W} height={MOD_H} ariaLabel="FM modulator block diagrams (§4.3)">
      {/* Row 1 — Direct FM
          cy=36: label at y=36-10-10=16, block 26–46, bottom clears divider (50) by 4px */}
      <ModRow
        cy={36}
        label1=""
        tex1="\text{Varactor }C(t)"
        label2=""
        tex2="\text{LC Osc./VCO}"
        rowLabel="Direct FM (§4.3.1)"
      />

      {/* Horizontal divider at y=50 (mid-point) */}
      <line x1={20} y1={50} x2={MOD_W - 20} y2={50} stroke="var(--border)" strokeWidth={0.8} />

      {/* Row 2 — Armstrong indirect FM
          cy=78: label at y=78-10-10=58 (8px below divider), block 68–88, bottom < MOD_H(100) */}
      <ModRow
        cy={78}
        label1=""
        tex1="\text{NBFM Mod.}"
        label2=""
        tex2="\times n\text{ Mult.}"
        rowLabel="Armstrong indirect FM (§4.3.1, Fig. 4.9)"
        labelDy={5}
      />
    </Schematic>
  );
}

// ============================================================================
// FM Discriminator block diagram (§4.3.2, Eq. 4.3.12)
// u(t) → [d/dt] → [|·|] → [LPF] → m̂(t)
// ============================================================================

const DISCRIM_W = 420;
const DISCRIM_H = 56;
const DCY = 28; // center y

// Block geometry (x positions of leading/trailing edges)
const D_X1 = 46;   // d/dt block start
const D_X2 = 124;  // d/dt block end
const E_X1 = 140;  // |·| block start
const E_X2 = 196;  // |·| block end
const L_X1 = 212;  // LPF block start
const L_X2 = 290;  // LPF block end

const dby = DCY - BH / 2;

/**
 * FM Discriminator block diagram (§4.3.2, Eq. 4.3.12).
 */
export function FmDiscriminatorDiagram() {
  return (
    <Schematic width={DISCRIM_W} height={DISCRIM_H} ariaLabel="FM discriminator block diagram (§4.3.2)">
      {/* Input wire + label */}
      <Wire points={[20, DCY, 46, DCY]} />
      <Arrowhead x={48} y={DCY} />
      <MathLabel x={8} y={DCY} tex="u(t)" w={28} anchor="start" />

      {/* d/dt block */}
      <Block x={D_X1} y={dby} w={D_X2 - D_X1} h={BH} label="" tex="\tfrac{d}{dt}" />
      <Wire points={[D_X2, DCY, E_X1, DCY]} />
      <Arrowhead x={E_X1 + 2} y={DCY} />

      {/* |·| envelope block */}
      <Block x={E_X1} y={dby} w={E_X2 - E_X1} h={BH} label="" tex="|\cdot|" />
      <Wire points={[E_X2, DCY, L_X1, DCY]} />
      <Arrowhead x={L_X1 + 2} y={DCY} />

      {/* LPF block */}
      <Block x={L_X1} y={dby} w={L_X2 - L_X1} h={BH} label="" tex="\text{LPF}" />
      <Wire points={[L_X2, DCY, 310, DCY]} />
      <Arrowhead x={312} y={DCY} />

      {/* DC-removal label below LPF */}
      <text
        className="schematic__label"
        x={L_X1 + (L_X2 - L_X1) / 2}
        y={dby + BH + 9}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: '8px', fill: 'var(--text-faint)' }}
      >
        + DC removal
      </text>

      {/* Output wire + label */}
      <Wire points={[310, DCY, 390, DCY]} />
      <Arrowhead x={392} y={DCY} />
      <MathLabel x={398} y={DCY} tex="\hat{m}(t)" w={34} anchor="start" />
    </Schematic>
  );
}

// ============================================================================
// PLL FM Demodulator block diagram (§4.3.3, Fig. 4.14)
//
// Signal path (row 1, cy=35):
//   u(t) → [Phase Comp.] → [G(f)] → v(t)   (output)
//                ↑                     │
//          y_v(t)│                  VCO input
//              [VCO] ←─────────────────┘
//
// Geometry check:
//   PCY=35: label@y=15, block y=25..45  (top-margin 15px, bottom gap to wire 25px)
//   VCY=80: label@y=60, block y=70..90  (clears PLL_H=108 by 18px)
// ============================================================================

const PLL_W = 440;
const PLL_H = 108;

// Row 1 — signal path
const PCY = 35;
const PC_X1 = 50;
const PC_X2 = 165;
const GF_X1 = 183;
const GF_X2 = 308;

// Row 2 — VCO (same x-range as G(f), directly below)
const VCY = 80;
const VC_X1 = 183;
const VC_X2 = 308;

// Feedback corner x = center of Phase Comparator block
const PFBX = (PC_X1 + PC_X2) / 2; // 107.5

/**
 * PLL FM demodulator block diagram (§4.3.3, Fig. 4.14).
 * Phase Comparator → Loop Filter G(f) → VCO → feedback to comparator.
 */
export function FmPllDiagram() {
  const r1y = PCY - BH / 2; // 25, top of row-1 blocks
  const r2y = VCY - BH / 2; // 70, top of row-2 blocks

  return (
    <Schematic width={PLL_W} height={PLL_H} ariaLabel="PLL FM demodulator block diagram (§4.3.3)">
      {/* Row label */}
      <text
        className="schematic__label"
        x={(PC_X1 + GF_X2) / 2}
        y={r1y - 10}
        textAnchor="middle"
        dominantBaseline="auto"
      >
        PLL FM Demodulator (§4.3.3, Fig. 4.14)
      </text>

      {/* ── Input u(t) ── */}
      <Wire points={[10, PCY, PC_X1, PCY]} />
      <Arrowhead x={PC_X1 + 2} y={PCY} />
      <MathLabel x={4} y={PCY} tex="u(t)" w={28} anchor="start" />

      {/* ── Phase Comparator block ── */}
      <Block x={PC_X1} y={r1y} w={PC_X2 - PC_X1} h={BH} label="Phase Comp." tex="\times" />

      {/* ── PC → Loop Filter ── */}
      <Wire points={[PC_X2, PCY, GF_X1, PCY]} />
      <Arrowhead x={GF_X1 + 2} y={PCY} />

      {/* ── Loop Filter G(f) block ── */}
      <Block x={GF_X1} y={r1y} w={GF_X2 - GF_X1} h={BH} label="Loop Filter" tex="G(f)" />

      {/* ── G(f) output → v(t) label ── */}
      <Wire points={[GF_X2, PCY, PLL_W - 32, PCY]} />
      <Arrowhead x={PLL_W - 30} y={PCY} />
      <MathLabel x={PLL_W - 26} y={PCY} tex="v(t)" w={26} anchor="start" />

      {/* ── Feedback right: G(f) → down → VCO right edge ──
           Wire: (GF_X2,PCY)→(GF_X2,VCY)→(GF_X2+6,VCY)
           Arrowhead(GF_X2+2, VCY, rot=180): body@GF_X2+6, tip@GF_X2=VC_X2 (VCO right edge) */}
      <Wire points={[GF_X2, PCY, GF_X2, VCY, GF_X2 + 6, VCY]} />
      <Arrowhead x={GF_X2 + 2} y={VCY} rot={180} />

      {/* ── VCO block ── */}
      <Block x={VC_X1} y={r2y} w={VC_X2 - VC_X1} h={BH} label="VCO" tex="\text{VCO}" />

      {/* ── Feedback left: VCO left → left → up → PC bottom ──
           Wire: (VC_X1,VCY)→(PFBX,VCY)→(PFBX, PCY+BH/2+4)
           Arrowhead(PFBX, PCY+BH/2+2, rot=270): body@y=PCY+BH/2+6, tip@y=PCY+BH/2=45 (PC bottom) */}
      <Wire points={[VC_X1, VCY, PFBX, VCY, PFBX, PCY + BH / 2 + 4]} />
      <Arrowhead x={PFBX} y={PCY + BH / 2 + 2} rot={270} />

      {/* y_v(t) label below the horizontal feedback wire */}
      <MathLabel x={100} y={VCY + 11} tex="y_v(t)" w={44} anchor="start" />
    </Schematic>
  );
}
