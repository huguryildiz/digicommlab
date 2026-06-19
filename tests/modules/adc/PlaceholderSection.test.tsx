import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaceholderSection } from '@/modules/sampling-quantization/sections/PlaceholderSection';

describe('PlaceholderSection', () => {
  it('renders the planned-simulation title and the given body', () => {
    render(<PlaceholderSection bodyKey="adc.placeholder.vector" />);
    expect(screen.getByText('Planned simulation')).toBeInTheDocument();
    expect(screen.getByText(/Vector quantization/i)).toBeInTheDocument();
  });
});
