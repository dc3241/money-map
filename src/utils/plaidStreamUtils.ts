import { parseISO, startOfDay, isValid } from "date-fns";
import type { PlaidTransactionStreamDoc } from "../hooks/usePlaidRecurringFirestore";
import type { PlaidTransaction } from "../hooks/usePlaidTransactions";
import type { RecurringReviewOverride } from "../hooks/usePlaidRecurringReview";

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

/**
 * Monthly occurrence multiplier for user-confirmed recurring cadence strings
 * (recurring review / same values as `RECURRING_REVIEW_CADENCE_OPTIONS`).
 */
export function monthlyMultiplierForReviewCadence(
  cadence: string | null | undefined
): number {
  const c = (cadence ?? "monthly")
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, "_");
  switch (c) {
    case "daily":
      return 365.25 / 12;
    case "weekly":
      return 52 / 12;
    case "biweekly":
    case "bi_weekly":
      return 26 / 12;
    case "semimonthly":
    case "semi_monthly":
    case "twice_monthly":
      return 2;
    case "monthly":
      return 1;
    case "quarterly":
      return 4 / 12;
    case "annually":
    case "annual":
    case "yearly":
      return 1 / 12;
    default:
      return 1;
  }
}

/**
 * Approximate monthly income/expense from Firestore `recurringReview` overrides.
 * Skips anchors already attributed to a Plaid recurring stream (avoid double-count with
 * `estimateMonthlyFromStreams`) and skips overrides whose transaction is not in `transactions`.
 */
export function estimateMonthlyFromRecurringOverrides(
  overrides: Record<string, RecurringReviewOverride>,
  transactions: PlaidTransaction[],
  streamTxIds: Set<string>
): { income: number; expense: number } {
  const txById = new Map<string, PlaidTransaction>();
  for (const tx of transactions) {
    txById.set(tx.transaction_id, tx);
  }
  let income = 0;
  let expense = 0;
  for (const [transactionId, o] of Object.entries(overrides)) {
    if (o.decision !== "recurring") continue;
    if (streamTxIds.has(transactionId)) continue;
    const tx = txById.get(transactionId);
    if (!tx) continue;
    const kind =
      o.kind === "income" || o.kind === "expense"
        ? o.kind
        : tx.amount < 0
          ? "income"
          : "expense";
    const mult = monthlyMultiplierForReviewCadence(o.cadence);
    const amt = Math.abs(tx.amount);
    if (kind === "income") income += amt * mult;
    else expense += amt * mult;
  }
  return { income, expense };
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
