import { Schematic, Block, Wire, Arrowhead, MathLabel } from '@/lib/plot/schematic';
import '@/lib/plot/schematic.css';

// Proakis & Salehi Figure 4.1 — FM/PM modulator equivalence (Eq. 4.1.6):
//   FM mod.  ≡  Integrator → PM mod.
//   PM mod.  ≡  Differentiator → FM mod.
const W = 520;
const H = 176;
const BW = 84;
const BH = 32;

/** One equivalence row: a single modulator block ≡ a two-stage cascade. */
function Row({
  cy,
  single,
  stageA,
  stageB,
}: {
  cy: number;
  single: string;
  stageA: string;
  stageB: string;
}) {
  const by = cy - BH / 2;
  return (
    <>
      {/* Left form: m(t) → single modulator */}
      <MathLabel x={22} y={cy} tex="m(t)" w={34} />
      <Wire points={[40, cy, 58, cy]} />
      <Arrowhead x={60} y={cy} />
      <Block x={62} y={by} w={BW} h={BH} label="" tex={single} />
      <Wire points={[146, cy, 168, cy]} />
      <Arrowhead x={170} y={cy} />

      {/* Equivalence sign */}
      <text
        className="schematic__label"
        x={188}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: '16px' }}
      >
        ≡
      </text>

      {/* Right form: m(t) → stage A → stage B */}
      <MathLabel x={214} y={cy} tex="m(t)" w={34} />
      <Wire points={[232, cy, 246, cy]} />
      <Arrowhead x={248} y={cy} />
      <Block x={250} y={by} w={BW} h={BH} label="" tex={stageA} />
      <Wire points={[334, cy, 350, cy]} />
      <Arrowhead x={352} y={cy} />
      <Block x={354} y={by} w={BW} h={BH} label="" tex={stageB} />
      <Wire points={[438, cy, 464, cy]} />
      <Arrowhead x={466} y={cy} />
    </>
  );
}

/** FM ↔ PM modulator equivalence block diagram (Proakis & Salehi Fig. 4.1). */
export function FmPmDiagram() {
  return (
    <Schematic width={W} height={H} ariaLabel="FM and PM modulator equivalence (Figure 4.1)">
      <Row cy={46} single="\text{FM modulator}" stageA="\text{Integrator}" stageB="\text{PM modulator}" />
      <Row cy={130} single="\text{PM modulator}" stageA="\text{Differentiator}" stageB="\text{FM modulator}" />
    </Schematic>
  );
}
