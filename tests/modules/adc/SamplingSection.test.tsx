import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SamplingSection } from '@/modules/sampling-quantization/sections/sampling/SamplingSection';

describe('SamplingSection', () => {
  it('renders the sampling plots, the regime readout, and info cards', () => {
    render(<SamplingSection />);
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(2); // Time + Spectrum
    expect(screen.getByText('Bandwidth W')).toBeInTheDocument();
    expect(screen.getByText('Oversampling')).toBeInTheDocument(); // default fs=20, W=2
    expect(screen.getByText('Nyquist criterion')).toBeInTheDocument(); // info card
  });
});
