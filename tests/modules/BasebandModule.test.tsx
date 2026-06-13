import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BasebandModule } from '@/modules/baseband/BasebandModule';

describe('BasebandModule', () => {
  it('renders the three tabs and shows pulse shaping by default', () => {
    render(<BasebandModule />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Pulse Shaping & Nyquist')).toBeTruthy();
    expect(screen.getByText('Optimum Receiver')).toBeTruthy();
    expect(screen.getByText('Eye, ISI & Equalization')).toBeTruthy();
    expect(screen.getByLabelText(/Pulse p\(t\) with zero crossings/i)).toBeTruthy();
  });
  it('switches tabs when clicked', () => {
    render(<BasebandModule />);
    const receiverTab = screen.getByText('Optimum Receiver').closest('button');
    expect(receiverTab).toBeTruthy();
    fireEvent.click(receiverTab!);
    expect(receiverTab!.className).toMatch(/--active/);
  });
});
