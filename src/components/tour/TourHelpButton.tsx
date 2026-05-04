type TourHelpButtonProps = {
  onReplayTour: () => void;
};

export default function TourHelpButton({ onReplayTour }: TourHelpButtonProps) {
  return (
    <button
      type="button"
      onClick={onReplayTour}
      className="fixed bottom-20 right-4 z-[10055] flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-surface-1 text-lg font-semibold text-accent shadow-lg backdrop-blur-sm transition hover:bg-surface-2 hover:border-accent/40 md:bottom-6 md:right-6"
      aria-label="Replay page tour"
      title="Replay page tour"
    >
      ?
    </button>
  );
}
