import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PcmSection } from '@/modules/sampling-quantization/sections/waveform/PcmSection';

describe('PcmSection', () => {
  it('renders the PCM bitstream panel and info cards', () => {
    render(<PcmSection />);
    expect(screen.getByText('PCM bitstream')).toBeInTheDocument();
    expect(screen.getByText('Gray vs natural binary')).toBeInTheDocument(); // info card
  });
});
