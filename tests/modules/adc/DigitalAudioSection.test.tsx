import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DigitalAudioSection } from '@/modules/sampling-quantization/sections/media/DigitalAudioSection';

describe('DigitalAudioSection', () => {
  it('renders the Σ-Δ bitstream/reconstruction/PSD plots and TDM/info cards', () => {
    render(<DigitalAudioSection />);
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Noise shaping')).toBeInTheDocument();
  });
});
