import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineCodeSection } from '@/modules/sampling-quantization/sections/linecode/LineCodeSection';

describe('LineCodeSection', () => {
  it('renders one waveform canvas per selected line code plus info cards', () => {
    render(<LineCodeSection />);
    // Default selection enables several codes → several stacked canvases.
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Self-clocking')).toBeInTheDocument();
  });
});
