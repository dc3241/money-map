import { usePlaidTransactionsInRange } from "./usePlaidTransactionsInRange";
import type { PlaidTransaction } from "./usePlaidTransactions";

/**
 * Loads all Plaid transactions for a calendar year (requires user linked).
 * Uses a date-range query (no row cap).
 */
export function usePlaidYearTransactions(year: number | null): {
  transactions: PlaidTransaction[];
  loading: boolean;
  error: Error | null;
} {
  const start =
    year != null && year >= 2000 ? `${year}-01-01` : null;
  const end =
    year != null && year >= 2000 ? `${year}-12-31` : null;
  return usePlaidTransactionsInRange(start, end);
}
