import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScalarQuantSection } from '@/modules/sampling-quantization/sections/quantization/ScalarQuantSection';

describe('ScalarQuantSection', () => {
  it('renders the quantizer + error plots, SQNR readout, and info cards', () => {
    render(<ScalarQuantSection />);
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(2); // Quant + Error
    expect(screen.getByText('SQNR (theory)')).toBeInTheDocument();
    expect(screen.getByText('Uniform quantization')).toBeInTheDocument(); // info card
  });
  it('offers a Lloyd-Max mode with a source-pdf selector', () => {
    render(<ScalarQuantSection />);
    expect(screen.getByText('Source distribution')).toBeInTheDocument(); // pdf selector
    expect(screen.getByText('Optimal quantizer')).toBeInTheDocument(); // info card
  });
});
