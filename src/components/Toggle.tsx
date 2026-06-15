import type { ReactNode } from 'react';

export interface ToggleProps {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="ctl-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
