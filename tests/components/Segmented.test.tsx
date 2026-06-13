import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Segmented } from '@/components/Segmented';

const opts = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

describe('Segmented', () => {
  it('renders all options and marks the active one', () => {
    render(<Segmented ariaLabel="pick" value="a" options={opts} onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the clicked value', () => {
    const onChange = vi.fn();
    render(<Segmented ariaLabel="pick" value="a" options={opts} onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Beta' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
