import React, { createContext, useContext, useMemo } from "react";
import { usePlaidActuals } from "./PlaidActualsContext";
import { usePlaidAccountTypeMap } from "../hooks/usePlaidAccounts";
import { usePlaidTransactionsInRange } from "../hooks/usePlaidTransactionsInRange";
import type { PlaidAccountTypeMap } from "../utils/plaidAggregates";
import { dashboardPlaidRange } from "../utils/plaidVisibleRange";

export interface PlaidRangeTransactionsState {
  transactions: ReturnType<typeof usePlaidTransactionsInRange>["transactions"];
  loading: boolean;
  error: Error | null;
  range: { start: string; end: string } | null;
  /** Used to exclude credit/loan inflows from dashboard income. */
  accountTypeByAccountId: PlaidAccountTypeMap;
}

const EMPTY_MAP: PlaidAccountTypeMap = new Map();

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
  const accountTypeByAccountId = usePlaidAccountTypeMap();

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
      accountTypeByAccountId: usePlaidForActuals ? accountTypeByAccountId : EMPTY_MAP,
    }),
    [
      transactions,
      loading,
      error,
      range,
      usePlaidForActuals,
      accountTypeByAccountId,
    ]
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
      accountTypeByAccountId: EMPTY_MAP,
    };
  }
  return ctx;
}
