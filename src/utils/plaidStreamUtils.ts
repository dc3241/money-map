import { parseISO, startOfDay, isValid } from "date-fns";
import type { PlaidTransactionStreamDoc } from "../hooks/usePlaidRecurringFirestore";
import type { PlaidTransaction } from "../hooks/usePlaidTransactions";

export interface UpcomingStreamItem {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  nextDate: Date;
  frequency: string;
}

function streamAmount(s: PlaidTransactionStreamDoc): number {
  const a =
    s.last_amount?.amount ??
    s.average_amount?.amount ??
    0;
  return Math.abs(Number(a) || 0);
}

/**
 * Converts one stream payment (avg/last) to an approximate monthly total using Plaid
 * `RecurringFrequency`-style values. Unknown frequencies assume monthly (×1).
 */
export function monthlyMultiplierForStreamFrequency(
  frequency: string | null | undefined
): number {
  const f = (frequency ?? "")
    .toUpperCase()
    .trim()
    .replace(/[-\s]+/g, "_");
  switch (f) {
    case "DAILY":
      return 365.25 / 12;
    case "WEEKLY":
      return 52 / 12;
    case "BIWEEKLY":
      return 26 / 12;
    case "SEMI_MONTHLY":
      return 2;
    case "MONTHLY":
      return 1;
    case "QUARTERLY":
      return 4 / 12;
    case "ANNUALLY":
    case "ANNUAL":
      return 1 / 12;
    case "UNKNOWN":
    case "NULL":
    case "DYNAMIC":
    default:
      return 1;
  }
}

function nextDateFromStream(s: PlaidTransactionStreamDoc): Date | null {
  if (s.predicted_next_date) {
    const d = parseISO(s.predicted_next_date + "T12:00:00");
    if (isValid(d)) return startOfDay(d);
  }
  if (s.last_date) {
    const d = parseISO(s.last_date + "T12:00:00");
    if (isValid(d)) return startOfDay(d);
  }
  return null;
}

export function upcomingFromPlaidStreams(
  inflow: PlaidTransactionStreamDoc[],
  outflow: PlaidTransactionStreamDoc[],
  take = 8
): UpcomingStreamItem[] {
  const items: UpcomingStreamItem[] = [];
  for (const s of outflow) {
    const nd = nextDateFromStream(s);
    if (!nd) continue;
    items.push({
      id: `out-${s.stream_id}`,
      description: s.merchant_name || s.description || "Expense",
      amount: streamAmount(s),
      type: "expense",
      nextDate: nd,
      frequency: s.frequency,
    });
  }
  for (const s of inflow) {
    const nd = nextDateFromStream(s);
    if (!nd) continue;
    items.push({
      id: `in-${s.stream_id}`,
      description: s.merchant_name || s.description || "Income",
      amount: streamAmount(s),
      type: "income",
      nextDate: nd,
      frequency: s.frequency,
    });
  }
  items.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  return items.slice(0, take);
}

/** Approximate monthly income/spend from stream averages × frequency (Recurring page summary). */
export function estimateMonthlyFromStreams(
  inflow: PlaidTransactionStreamDoc[],
  outflow: PlaidTransactionStreamDoc[]
): { income: number; expense: number } {
  let income = 0;
  let expense = 0;
  for (const s of inflow) {
    income +=
      streamAmount(s) * monthlyMultiplierForStreamFrequency(s.frequency);
  }
  for (const s of outflow) {
    expense +=
      streamAmount(s) * monthlyMultiplierForStreamFrequency(s.frequency);
  }
  return { income, expense };
}

export function buildStreamTransactionIdSet(
  inflow: PlaidTransactionStreamDoc[],
  outflow: PlaidTransactionStreamDoc[]
): Set<string> {
  const set = new Set<string>();
  for (const s of [...inflow, ...outflow]) {
    if (Array.isArray(s.transaction_ids)) {
      for (const id of s.transaction_ids) {
        if (typeof id === "string") set.add(id);
      }
    }
  }
  return set;
}

export function partitionPlaidTxnsByRecurringStreams(
  transactions: PlaidTransaction[],
  streamTxIds: Set<string>
): { recurringLike: PlaidTransaction[]; other: PlaidTransaction[] } {
  const recurringLike: PlaidTransaction[] = [];
  const other: PlaidTransaction[] = [];
  for (const tx of transactions) {
    if (streamTxIds.has(tx.transaction_id)) {
      recurringLike.push(tx);
    } else {
      other.push(tx);
    }
  }
  return { recurringLike, other };
}
