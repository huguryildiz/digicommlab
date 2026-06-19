import { t } from '@/i18n';

/** Full-width reset button (icon + label) shared by analog-fm tabs. Uses .analog__reset. */
export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="analog__reset" onClick={onClick}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21.5 2v6h-6" />
        <path d="M2.5 22v-6h6" />
        <path d="M22 11.5A10 10 0 0 0 3.2 7.2" />
        <path d="M2 12.5a10 10 0 0 0 18.8 4.2" />
      </svg>
      {t('analog.fm.reset')}
    </button>
  );
}
