import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '@/pages/Home';

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe('Home (landing)', () => {
  it('renders the hero headline and the primary CTA → /start', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/survive the channel/i);
    expect(screen.getByRole('link', { name: /Browse the modules/i })).toHaveAttribute(
      'href',
      '/start',
    );
  });

  it('links the live modules to their routes', () => {
    renderHome();
    expect(screen.getByRole('link', { name: /Analog-to-Digital Conversion/i })).toHaveAttribute(
      'href',
      '/sampling',
    );
    expect(screen.getByRole('link', { name: /Information Theory/i })).toHaveAttribute(
      'href',
      '/information-theory',
    );
    expect(screen.getByRole('link', { name: /Digital Modulation & Detection/i })).toHaveAttribute(
      'href',
      '/modulation',
    );
    expect(screen.getByRole('link', { name: /Baseband Transmission & ISI/i })).toHaveAttribute(
      'href',
      '/baseband',
    );
    expect(screen.getByRole('link', { name: /End-to-End Link/i })).toHaveAttribute(
      'href',
      '/end-to-end',
    );
  });
});
