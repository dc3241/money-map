import { useEffect } from 'react';
import type { TourViewKey } from '../tour/tourStorage';
import { isTourDismissedForView } from '../tour/tourStorage';

/** Auto-start the page tour once per view unless the user already dismissed it for this tab. */
export function useTourAutoStart(
  userId: string | null | undefined,
  currentView: TourViewKey,
  setRun: (v: boolean) => void
): void {
  useEffect(() => {
    setRun(false);
  }, [currentView, setRun]);

  useEffect(() => {
    if (!userId) return;
    if (isTourDismissedForView(userId, currentView)) return;
    const t = window.setTimeout(() => setRun(true), 750);
    return () => window.clearTimeout(t);
  }, [userId, currentView, setRun]);
}
