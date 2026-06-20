import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JpegSection } from '@/modules/sampling-quantization/sections/media/JpegSection';

describe('JpegSection', () => {
  it('renders the original/DCT/quantized/reconstructed heatmaps and info cards', () => {
    render(<JpegSection />);
    // Four 8×8 heatmaps + quant table / zig-zag canvases.
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('DCT energy compaction')).toBeInTheDocument();
  });
});
