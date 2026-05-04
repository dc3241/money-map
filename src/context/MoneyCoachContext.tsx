import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { MoneyMapTotals } from '../assistant/moneyMapSnapshot';
import { formatDateKey, getWeekRange } from '../utils/dateUtils';

export const MONEY_COACH_PRIMARY_THREAD_ID = 'primary';

export type MoneyCoachPlaidOverlay = {
  year: number;
  month: number;
  weekStartKey: string;
  monthly: MoneyMapTotals;
  weekly: MoneyMapTotals;
};

type OpenCoachOptions = {
  seed?: string;
  referenceDate?: Date;
  /** When opening from the dashboard with Plaid actuals, pass the same totals shown on screen. */
  plaidOverlay?: MoneyCoachPlaidOverlay | null;
};

type MoneyCoachContextValue = {
  isOpen: boolean;
  referenceDate: Date;
  draftSeed: string | null;
  /** Latest Plaid-backed totals from the dashboard view (cleared when leaving dashboard). */
  dashboardPlaidOverlay: MoneyCoachPlaidOverlay | null;
  openCoach: (opts?: OpenCoachOptions) => void;
  closeCoach: () => void;
  clearDraftSeed: () => void;
  setDashboardPlaidOverlay: (overlay: MoneyCoachPlaidOverlay | null) => void;
};

const MoneyCoachContext = createContext<MoneyCoachContextValue | null>(null);

export function MoneyCoachProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [draftSeed, setDraftSeed] = useState<string | null>(null);
  const [dashboardPlaidOverlay, setDashboardPlaidOverlay] = useState<MoneyCoachPlaidOverlay | null>(null);

  const openCoach = useCallback((opts?: OpenCoachOptions) => {
    setReferenceDate(opts?.referenceDate ?? new Date());
    setDraftSeed(opts?.seed ?? null);
    if (opts?.plaidOverlay !== undefined) {
      setDashboardPlaidOverlay(opts.plaidOverlay);
    }
    setIsOpen(true);
  }, []);

  const closeCoach = useCallback(() => {
    setIsOpen(false);
    setDraftSeed(null);
  }, []);

  const clearDraftSeed = useCallback(() => {
    setDraftSeed(null);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      referenceDate,
      draftSeed,
      dashboardPlaidOverlay,
      openCoach,
      closeCoach,
      clearDraftSeed,
      setDashboardPlaidOverlay,
    }),
    [
      isOpen,
      referenceDate,
      draftSeed,
      dashboardPlaidOverlay,
      openCoach,
      closeCoach,
      clearDraftSeed,
    ]
  );

  return <MoneyCoachContext.Provider value={value}>{children}</MoneyCoachContext.Provider>;
}

export function useMoneyCoach(): MoneyCoachContextValue {
  const ctx = useContext(MoneyCoachContext);
  if (!ctx) {
    throw new Error('useMoneyCoach must be used within MoneyCoachProvider');
  }
  return ctx;
}

export function useMoneyCoachOptional(): MoneyCoachContextValue | null {
  return useContext(MoneyCoachContext);
}

export function plaidOverlayMatchesReference(
  overlay: MoneyCoachPlaidOverlay | null,
  referenceDate: Date
): overlay is MoneyCoachPlaidOverlay {
  if (!overlay) return false;
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth() + 1;
  const { start } = getWeekRange(referenceDate);
  const wk = formatDateKey(start);
  return overlay.year === y && overlay.month === m && overlay.weekStartKey === wk;
}
