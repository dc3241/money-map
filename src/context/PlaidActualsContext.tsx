import React, { createContext, useContext, useMemo } from "react";
import { usePlaidAccounts } from "../hooks/usePlaidAccounts";

export interface PlaidActualsContextValue {
  accounts: ReturnType<typeof usePlaidAccounts>["accounts"];
  accountsLoading: boolean;
  /** True when at least one Plaid-linked account exists (institution-backed mode). */
  usePlaidForActuals: boolean;
}

const PlaidActualsContext = createContext<PlaidActualsContextValue | null>(null);

export function PlaidActualsProvider({ children }: { children: React.ReactNode }) {
  const { accounts, loading: accountsLoading } = usePlaidAccounts();

  const value = useMemo(
    () => ({
      accounts,
      accountsLoading,
      usePlaidForActuals: accounts.length > 0,
    }),
    [accounts, accountsLoading]
  );

  return (
    <PlaidActualsContext.Provider value={value}>{children}</PlaidActualsContext.Provider>
  );
}

export function usePlaidActuals(): PlaidActualsContextValue {
  const ctx = useContext(PlaidActualsContext);
  if (!ctx) {
    throw new Error("usePlaidActuals must be used within PlaidActualsProvider");
  }
  return ctx;
}

/** Safe outside `PlaidActualsProvider` (e.g. legacy `Calendar` routes). */
export function usePlaidActualsOptional(): PlaidActualsContextValue | null {
  return useContext(PlaidActualsContext);
}
