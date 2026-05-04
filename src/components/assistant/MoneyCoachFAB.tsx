import { useMoneyCoach } from '../../context/MoneyCoachContext';

export default function MoneyCoachFAB() {
  const { openCoach, isOpen } = useMoneyCoach();

  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={() => openCoach()}
      className="fixed bottom-32 right-4 z-[10054] flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-surface-1 text-lg shadow-lg backdrop-blur-sm transition hover:bg-surface-2 hover:border-accent/40 md:bottom-24 md:right-6"
      aria-label="Open Money Coach"
      title="Money Coach — tips and insights"
    >
      <span aria-hidden="true">✨</span>
    </button>
  );
}
