// Book-formula info cards for the random-process module (Proakis & Salehi, Ch. 5).
// A dedicated, formula-faithful reference block rendered below the interactive
// plots so the simulation surface stays formula-light (per project pedagogy rule).
// Visual language mirrors the analog module's `.analog__card*` pattern in the
// random-process (`rp`) namespace — see random-process.css.
import type { ReactNode } from 'react';
import { Formula } from '@/components';

/** Grid wrapper around a set of <FormulaCard> items. */
export function FormulaCards({ children }: { children: ReactNode }) {
  return <div className="rp__cards">{children}</div>;
}

export interface FormulaCardProps {
  /** Card heading — include the book section/equation reference, e.g. "Q-function (§5.1.3, Eq. 5.1.7)". */
  title: ReactNode;
  /** Accent color for the title rule, matching the signal-plot palette. */
  accent?: 'green' | 'orange' | 'blue';
  children: ReactNode;
}

/** A single titled info card holding plain-language prose + book formulas. */
export function FormulaCard({ title, accent = 'green', children }: FormulaCardProps) {
  return (
    <div className="rp__card">
      <h3 className={`rp__card__title rp__card__title--${accent}`}>{title}</h3>
      <div className="rp__card__body">{children}</div>
    </div>
  );
}

/** A boxed block-formula inside a card body. */
export function CardFormula({ tex }: { tex: string }) {
  return (
    <div className="rp__card__formula">
      <Formula tex={tex} block />
    </div>
  );
}
