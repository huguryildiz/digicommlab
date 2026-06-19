import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PcmSection } from '@/modules/sampling-quantization/sections/waveform/PcmSection';

describe('PcmSection', () => {
  it('renders the PCM bitstream panel and info cards', () => {
    render(<PcmSection />);
    expect(screen.getByText('PCM bitstream')).toBeInTheDocument();
    expect(screen.getByText('Gray vs natural binary')).toBeInTheDocument(); // info card
  });
  it('exposes companding controls and the compander-curve + SQNR plots', () => {
    render(<PcmSection />);
    expect(screen.getByText('Companding law')).toBeInTheDocument(); // select label
    expect(screen.getByText('Compander curve g(x)')).toBeInTheDocument(); // panel title
    expect(screen.getByText('SQNR vs input amplitude')).toBeInTheDocument(); // panel title
    expect(screen.getByText('μ-law vs A-law')).toBeInTheDocument(); // info card
  });
});
