import React, { createContext, useContext, useMemo } from "react";
import { usePlaidActuals } from "./PlaidActualsContext";
import { usePlaidTransactionsInRange } from "../hooks/usePlaidTransactionsInRange";
import { dashboardPlaidRange } from "../utils/plaidVisibleRange";

export interface PlaidRangeTransactionsState {
  transactions: ReturnType<typeof usePlaidTransactionsInRange>["transactions"];
  loading: boolean;
  error: Error | null;
  range: { start: string; end: string } | null;
}

const PlaidRangeTransactionsContext = createContext<PlaidRangeTransactionsState | null>(
  null
);

export function PlaidRangeTransactionsProvider({
  anchorDate,
  children,
}: {
  anchorDate: Date;
  children: React.ReactNode;
}) {
  const { usePlaidForActuals } = usePlaidActuals();
  const range = useMemo(() => dashboardPlaidRange(anchorDate), [anchorDate]);

  const { transactions, loading, error } = usePlaidTransactionsInRange(
    usePlaidForActuals ? range.start : null,
    usePlaidForActuals ? range.end : null
  );

  const value = useMemo<PlaidRangeTransactionsState>(
    () => ({
      transactions,
      loading,
      error,
      range: usePlaidForActuals ? range : null,
    }),
    [transactions, loading, error, range, usePlaidForActuals]
  );

  return (
    <PlaidRangeTransactionsContext.Provider value={value}>
      {children}
    </PlaidRangeTransactionsContext.Provider>
  );
}

export function usePlaidRangeTransactionsState(): PlaidRangeTransactionsState {
  const ctx = useContext(PlaidRangeTransactionsContext);
  if (!ctx) {
    return {
      transactions: [],
      loading: false,
      error: null,
      range: null,
    };
  }
  return ctx;
}
