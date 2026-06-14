import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoTheoryModule } from '@/modules/infotheory/InfoTheoryModule';

describe('InfoTheoryModule', () => {
  it('renders tabs and shows the entropy section by default', () => {
    render(<InfoTheoryModule />);
    // Tabs render via the shared <Segmented> control (role="tab"), not plain buttons.
    expect(screen.getByRole('tab', { name: /Entropy/i })).toBeTruthy();
    expect(screen.getByLabelText(/Binary entropy function/i)).toBeTruthy();
  });

  it('switches to the Lempel-Ziv tab and shows the dictionary', () => {
    render(<InfoTheoryModule />);
    fireEvent.click(screen.getByRole('tab', { name: /Lempel-Ziv/i }));
    expect(screen.getByText(/Contents/i)).toBeTruthy();
  });
});
