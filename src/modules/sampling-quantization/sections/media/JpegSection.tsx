// JPEG Transform Coding section (Proakis §7.7)
// Two-column layout: controls (left) · heatmap panels + theory (right)
// DSP pipeline: compressBlock() from src/lib/dsp/dct.ts
import { useMemo, useState } from 'react';
import {
  Panel,
  Slider,
  Select,
  Readout,
  InfoCard,
  TheoryBox,
  Formula,
  HintText,
} from '@/components';
import { t } from '@/i18n';
import { compressBlock, energyCompaction } from '@/lib/dsp/dct';
import { BlockHeatmap, QuantTablePanel, ZigzagPanel } from './jpeg-panels';
import '@/modules/sampling-quantization/sampling-quantization.css';

// ── Source-block presets (8×8, values ≈ 0..255) ──────────────────────────────
// Representative luminance patterns used in textbook examples (§7.7).

type PresetKey = 'gradient' | 'edge' | 'texture' | 'ramp';

function makeGradient(): number[][] {
  // Smooth horizontal gradient: high compaction → few DCT coefficients needed
  return Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => Math.round(32 + (c / 7) * 190 + (r / 7) * 10)),
  );
}

function makeEdge(): number[][] {
  // Vertical step edge at column 4: triggers high-frequency AC coefficients
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, (_, c) => (c < 4 ? 240 : 30)),
  );
}

function makeTexture(): number[][] {
  // Checkerboard / high-frequency texture: worst case for JPEG — many non-zero AC terms
  return Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => ((r + c) % 2 === 0 ? 240 : 20)),
  );
}

function makeRamp(): number[][] {
  // Diagonal ramp: moderate frequency mix
  return Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => Math.round(((r + c) / 14) * 220 + 20)),
  );
}

const PRESETS: Record<PresetKey, number[][]> = {
  gradient: makeGradient(),
  edge: makeEdge(),
  texture: makeTexture(),
  ramp: makeRamp(),
};

// ── Component ────────────────────────────────────────────────────────────────

/** §7.7 JPEG Transform Coding — interactive 8×8 block compressor. */
export function JpegSection() {
  const [preset, setPreset] = useState<PresetKey>('gradient');
  const [quality, setQuality] = useState(50);

  const block = PRESETS[preset];

  // Full JPEG pipeline: DCT → quantize → dequantize → IDCT
  const res = useMemo(() => compressBlock(block, quality), [block, quality]);

  // Energy compaction: fraction of total DCT energy in the top-8 coefficients
  const compaction8 = useMemo(
    () => energyCompaction(res.coeffs, 8),
    [res.coeffs],
  );

  // PSNR from MSE (guard mse = 0 → perfect reconstruction)
  const psnr = res.mse > 0 ? 10 * Math.log10((255 * 255) / res.mse) : Infinity;
  const psnrLabel = Number.isFinite(psnr) ? `${psnr.toFixed(1)} dB` : '∞ dB';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="module-layout">
      {/* ── Left sidebar: controls ── */}
      <aside className="sampling__controls">
        <Panel title={t('adc.sub.jpeg')}>
          <Select<PresetKey>
            label={t('adc.jpeg.preset')}
            value={preset}
            onChange={setPreset}
            options={[
              { value: 'gradient', label: t('adc.jpeg.preset.gradient') },
              { value: 'edge',     label: t('adc.jpeg.preset.edge') },
              { value: 'texture',  label: t('adc.jpeg.preset.texture') },
              { value: 'ramp',     label: t('adc.jpeg.preset.ramp') },
            ]}
          />

          <Slider
            label={t('adc.jpeg.quality')}
            value={quality}
            min={1}
            max={100}
            step={1}
            onChange={setQuality}
          />
        </Panel>

        {/* Readouts */}
        <Panel title="Readouts">
          <Readout label={t('adc.jpeg.quality')} value={quality} />
          <Readout
            label={t('adc.jpeg.nonzero')}
            value={`${res.nonZero}/64`}
          />
          <Readout
            label={t('adc.jpeg.compaction')}
            value={`${(compaction8 * 100).toFixed(1)}%`}
          />
          <Readout
            label={t('adc.jpeg.psnr')}
            value={psnrLabel}
          />
        </Panel>
      </aside>

      {/* ── Right content: heatmaps + theory ── */}
      <div className="sampling__content">
        {/* Four main heatmap panels in a responsive grid */}
        <Panel title="8×8 Block Pipeline">
          {/*
           * Grid layout: 2 columns on wide, 1 column on narrow.
           * min(220px, 100%) prevents overflow on mobile portrait (CLAUDE.md rule).
           */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
              gap: '12px',
            }}
          >
            {/* 1. Original block */}
            <div>
              <BlockHeatmap
                block={block}
                title={t('adc.jpeg.panel.original')}
                mode="pixel"
              />
            </div>

            {/* 2. DCT coefficient magnitude (log scale, DC highlighted) */}
            <div>
              <BlockHeatmap
                block={res.coeffs}
                title={t('adc.jpeg.panel.dct')}
                mode="coeff"
                highlightDc
              />
            </div>

            {/* 3. Quantized levels (sparsity: mostly zeros) */}
            <div>
              <BlockHeatmap
                block={res.quantized}
                title={t('adc.jpeg.panel.quantized')}
                mode="level"
              />
            </div>

            {/* 4. Reconstructed block (compare to original) */}
            <div>
              <BlockHeatmap
                block={res.reconstructed}
                title={t('adc.jpeg.panel.recon')}
                mode="pixel"
              />
            </div>
          </div>
        </Panel>

        {/* Q-table + zig-zag scan panels (supplementary) */}
        <Panel title="Quantization Table & Scan Order">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
              gap: '12px',
            }}
          >
            {/* 5. Scaled quantization table */}
            <div>
              <QuantTablePanel qTable={res.qTable} />
            </div>

            {/* 6. Zig-zag scan order overlay */}
            <div>
              <ZigzagPanel />
            </div>
          </div>
        </Panel>

        {/* Info cards */}
        <div className="info-cards">
          <InfoCard title={t('adc.card.dct.title')} accent="green">
            <p>
              <HintText text={t('adc.card.dct.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.qtable.title')} accent="orange">
            <p>
              <HintText text={t('adc.card.qtable.body')} />
            </p>
          </InfoCard>
          <InfoCard title={t('adc.card.quality.title')} accent="blue">
            <p>
              <HintText text={t('adc.card.quality.body')} />
            </p>
          </InfoCard>
        </div>

        {/* Theory box — deep math, §7.7 formulas */}
        <TheoryBox title="Theory — JPEG Transform Coding (§7.7)">
          {/* 2-D DCT (Eq. 7.7.1–7.7.2) */}
          <p>
            <strong>2-D DCT-II (forward transform, Eq. 7.7.1–7.7.2)</strong> — the image
            block <Formula tex="x(k,l)" /> is transformed into coefficient matrix{' '}
            <Formula tex="X(u,v)" /> by the separable orthonormal DCT:
          </p>
          <Formula
            tex={String.raw`X(u,v)=\frac{2}{N}\,C(u)\,C(v)\sum_{k=0}^{N-1}\sum_{l=0}^{N-1}x(k,l)\cos\frac{(2k+1)u\pi}{2N}\cos\frac{(2l+1)v\pi}{2N}`}
            block
          />
          <p>
            where <Formula tex="N=8" />,{' '}
            <Formula tex={String.raw`C(0)=\tfrac{1}{\sqrt{2}}`} />, and{' '}
            <Formula tex="C(u)=1" /> for <Formula tex="u\ge 1" />. The DC coefficient{' '}
            <Formula tex="X(0,0)" /> (top-left, pink border) captures the block mean; all
            other entries are AC coefficients ordered by increasing spatial frequency.
          </p>

          {/* Quantization (Table 7.5) */}
          <p>
            <strong>Perceptual quantization (Table 7.5)</strong> — each coefficient is
            divided by a perceptually weighted step size <Formula tex="Q(u,v)" /> from
            the JPEG luminance table, then rounded to an integer level:
          </p>
          <Formula
            tex={String.raw`\hat{X}(u,v)=\operatorname{round}\!\left(\frac{X(u,v)}{Q(u,v)}\right)`}
            block
          />
          <p>
            The JPEG quality factor scales every entry of the base table: quality 50 leaves
            it unchanged; quality 100 forces <Formula tex="Q(u,v)=1" /> (lossless
            quantization step of 1); quality 1 multiplies entries by 50. High-frequency
            entries are deliberately coarser, matching human visual sensitivity.
          </p>

          {/* Reconstruction + energy compaction */}
          <p>
            <strong>Reconstruction and energy compaction</strong> — the decoder
            dequantizes (<Formula tex={String.raw`\tilde{X}(u,v)=\hat{X}(u,v)\,Q(u,v)`} />)
            and applies the inverse 2-D DCT (IDCT-III) to recover{' '}
            <Formula tex={String.raw`\tilde{x}(k,l)`} />. Because natural images are
            spatially smooth, the DCT concentrates energy into a few low-frequency
            coefficients. At quality 50, typically only 10–20 of the 64 levels are
            non-zero after quantization — the rest compress to a single bit with
            run-length coding. The energy compaction fraction for the top{' '}
            <Formula tex="k" /> coefficients is:
          </p>
          <Formula
            tex={String.raw`\rho(k)=\frac{\sum_{i=1}^{k}|X_{\!(i)}|^2}{\sum_{i=1}^{64}|X_{\!(i)}|^2}`}
            block
          />
          <p>
            where <Formula tex="|X_{(i)}|^2" /> denotes the <Formula tex="i" />-th
            largest squared coefficient. Smooth blocks achieve{' '}
            <Formula tex="\rho(8)\gtrsim 0.99" />; checker/edge blocks are closer to 0.7.
          </p>
        </TheoryBox>
      </div>
    </div>
  );
}
