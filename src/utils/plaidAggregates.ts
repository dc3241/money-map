import { parseISO, startOfDay } from "date-fns";
import type { PlaidTransaction } from "../hooks/usePlaidTransactions";
import { formatDateKey } from "./dateUtils";

/** Maps Plaid `account_id` → account `type` (e.g. credit, depository, loan). */
export type PlaidAccountTypeMap = ReadonlyMap<string, string>;

const EMPTY_ACCOUNT_TYPES: PlaidAccountTypeMap = new Map();

/**
 * Strips common bank/ACH noise so similar transaction descriptions group together.
 * Intended only for aggregation keys, not legal reconciliation.
 */
function stripPlaidMerchantNoiseForGrouping(input: string): string {
  let s = input.replace(/\u00a0/g, " ").trim();
  if (!s) return "";
  s = s.replace(/\s+/g, " ");

  // Confirmation / reference fragments (vary by institution)
  s = s.replace(/\bconfirmation#?\s*[\w.-]+\b/gi, " ");
  s = s.replace(/\bconf#?\s*[\w.-]+\b/gi, " ");
  s = s.replace(/\bconfirmation\s*#\s*[\w.-]+\b/gi, " ");
  // ACH-style IDs (long alphanumeric / masked IDs)
  s = s.replace(/\bid\s*[:#]?\s*[\w*#.\\/\-]{4,}\b/gi, " ");
  // Trailing run of digits/refs often unique per transaction
  s = s.replace(/\s+[\d*]{10,}\s*$/g, " ");
  s = s.replace(/\s+[A-Z0-9]{18,}$/gi, " ");

  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function formatNormalizedPlaidLabel(groupKey: string): string {
  if (!groupKey || groupKey === "other") return "Other";
  return groupKey
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word.includes("-")) {
        return word
          .split("-")
          .filter(Boolean)
          .map((part) =>
            part.length === 0
              ? part
              : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          )
          .join("-");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Normalizes a raw Plaid `merchant_name` / `name` for top-N charts:
 * one stable `groupKey` (lowercase) for merging and a short `label` for display.
 */
export function normalizePlaidLabelForAggregation(
  raw: string | null | undefined
): { groupKey: string; label: string } {
  const rawStr = (raw ?? "").trim();
  if (!rawStr) {
    return { groupKey: "other", label: "Other" };
  }
  const cleaned = stripPlaidMerchantNoiseForGrouping(rawStr);
  const groupKey =
    cleaned.replace(/\s+/g, " ").trim().toLowerCase() || "other";
  return {
    groupKey,
    label: formatNormalizedPlaidLabel(groupKey),
  };
}

function isOnOrBeforeToday(dateKey: string): boolean {
  const today = startOfDay(new Date());
  const d = startOfDay(parseISO(dateKey));
  return d.getTime() <= today.getTime();
}

export function includeTxForAggregate(tx: PlaidTransaction): boolean {
  if (tx.pending) return false;
  return true;
}

function resolveAccountTypes(
  accountTypes?: PlaidAccountTypeMap
): PlaidAccountTypeMap {
  return accountTypes && accountTypes.size > 0 ? accountTypes : EMPTY_ACCOUNT_TYPES;
}

function categoryPrimaryUpper(tx: PlaidTransaction): string {
  return (tx.category_primary ?? "").toUpperCase();
}

/**
 * Inflows (negative Plaid amounts) that should not appear in dashboard "income":
 * loan/CC payments on liability accounts and Plaid loan-payment categories.
 */
export function isExcludedFromPlaidIncomeBucket(
  tx: PlaidTransaction,
  accountTypes?: PlaidAccountTypeMap
): boolean {
  if (tx.amount >= 0) return false;
  const primary = categoryPrimaryUpper(tx);
  if (primary === "LOAN_PAYMENTS" || primary.startsWith("LOAN_PAYMENTS_")) {
    return true;
  }
  const id = tx.account_id;
  if (!id) return false;
  const acct = resolveAccountTypes(accountTypes).get(id);
  if (!acct) return false;
  const t = acct.toLowerCase();
  return t === "credit" || t === "loan";
}

/** True if this transaction increases dashboard "income" totals. */
export function countsAsPlaidCashFlowIncome(
  tx: PlaidTransaction,
  accountTypes?: PlaidAccountTypeMap
): boolean {
  if (!includeTxForAggregate(tx) || tx.amount >= 0) return false;
  return !isExcludedFromPlaidIncomeBucket(tx, accountTypes);
}

function incomeAmountForTx(
  tx: PlaidTransaction,
  accountTypes?: PlaidAccountTypeMap
): number {
  return countsAsPlaidCashFlowIncome(tx, accountTypes)
    ? Math.abs(tx.amount)
    : 0;
}

/**
 * Plaid: positive amount = outflow (spending), negative = inflow.
 * Inflows to credit/loan accounts and loan-payment categories are omitted from income.
 */
export function plaidDailyTotal(
  transactions: PlaidTransaction[],
  dateKey: string,
  accountTypes?: PlaidAccountTypeMap
): { income: number; spending: number; profit: number } {
  let income = 0;
  let spending = 0;
  for (const tx of transactions) {
    if (tx.date !== dateKey) continue;
    if (!includeTxForAggregate(tx)) continue;
    if (tx.amount < 0) income += incomeAmountForTx(tx, accountTypes);
    else if (tx.amount > 0) spending += tx.amount;
  }
  return { income, spending, profit: income - spending };
}

export function plaidWeeklyTotal(
  transactions: PlaidTransaction[],
  weekStart: Date,
  weekEnd: Date,
  accountTypes?: PlaidAccountTypeMap
): { income: number; spending: number; profit: number } {
  const today = startOfDay(new Date());
  let income = 0;
  let spending = 0;
  const cur = new Date(weekStart);
  const end = new Date(weekEnd);
  while (cur <= end) {
    if (startOfDay(cur).getTime() <= today.getTime()) {
      const key = formatDateKey(cur);
      const d = plaidDailyTotal(transactions, key, accountTypes);
      income += d.income;
      spending += d.spending;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { income, spending, profit: income - spending };
}

export function plaidMonthlyTotal(
  transactions: PlaidTransaction[],
  year: number,
  month: number,
  accountTypes?: PlaidAccountTypeMap
): { income: number; spending: number; profit: number } {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  let income = 0;
  let spending = 0;
  for (const tx of transactions) {
    if (!tx.date.startsWith(prefix)) continue;
    if (!isOnOrBeforeToday(tx.date)) continue;
    if (!includeTxForAggregate(tx)) continue;
    if (tx.amount < 0) income += incomeAmountForTx(tx, accountTypes);
    else if (tx.amount > 0) spending += tx.amount;
  }
  return { income, spending, profit: income - spending };
}

export function plaidAnnualTotal(
  transactions: PlaidTransaction[],
  year: number,
  accountTypes?: PlaidAccountTypeMap
): { income: number; spending: number; profit: number } {
  let income = 0;
  let spending = 0;
  const yPrefix = `${year}-`;
  for (const tx of transactions) {
    if (!tx.date.startsWith(yPrefix)) continue;
    if (!isOnOrBeforeToday(tx.date)) continue;
    if (!includeTxForAggregate(tx)) continue;
    if (tx.amount < 0) income += incomeAmountForTx(tx, accountTypes);
    else if (tx.amount > 0) spending += tx.amount;
  }
  return { income, spending, profit: income - spending };
}

export function plaidIncomeOnDate(
  transactions: PlaidTransaction[],
  dateKey: string,
  accountTypes?: PlaidAccountTypeMap
): PlaidTransaction[] {
  return transactions.filter(
    (tx) =>
      tx.date === dateKey &&
      includeTxForAggregate(tx) &&
      countsAsPlaidCashFlowIncome(tx, accountTypes)
  );
}

/** Inflows excluded from income (e.g. credit card payments). Shown separately in day UI. */
export function plaidExcludedInflowOnDate(
  transactions: PlaidTransaction[],
  dateKey: string,
  accountTypes?: PlaidAccountTypeMap
): PlaidTransaction[] {
  return transactions.filter(
    (tx) =>
      tx.date === dateKey &&
      includeTxForAggregate(tx) &&
      tx.amount < 0 &&
      isExcludedFromPlaidIncomeBucket(tx, accountTypes)
  );
}

export function plaidSpendingOnDate(
  transactions: PlaidTransaction[],
  dateKey: string
): PlaidTransaction[] {
  return transactions.filter(
    (tx) =>
      tx.date === dateKey && includeTxForAggregate(tx) && tx.amount > 0
  );
}

export type PlaidRecentRowKind = "income" | "spending" | "transfer";

export function plaidRecentRowKind(
  tx: PlaidTransaction,
  accountTypes?: PlaidAccountTypeMap
): PlaidRecentRowKind {
  if (!includeTxForAggregate(tx)) return "transfer";
  if (tx.amount > 0) return "spending";
  if (tx.amount < 0) {
    return countsAsPlaidCashFlowIncome(tx, accountTypes)
      ? "income"
      : "transfer";
  }
  return "transfer";
}

export function plaidTopSpendingMerchants(
  transactions: PlaidTransaction[],
  year: number,
  take = 10
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (!tx.date.startsWith(`${year}-`)) continue;
    if (!isOnOrBeforeToday(tx.date)) continue;
    if (!includeTxForAggregate(tx)) continue;
    if (tx.amount <= 0) continue;
    const raw = tx.merchant_name ?? tx.name ?? "Other";
    const { groupKey } = normalizePlaidLabelForAggregation(raw);
    map.set(groupKey, (map.get(groupKey) || 0) + tx.amount);
  }
  return Array.from(map.entries())
    .map(([groupKey, value]) => ({
      name: formatNormalizedPlaidLabel(groupKey),
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, take);
}

export function plaidTopIncomeSources(
  transactions: PlaidTransaction[],
  year: number,
  take = 10,
  accountTypes?: PlaidAccountTypeMap
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (!tx.date.startsWith(`${year}-`)) continue;
    if (!isOnOrBeforeToday(tx.date)) continue;
    if (!includeTxForAggregate(tx)) continue;
    if (!countsAsPlaidCashFlowIncome(tx, accountTypes)) continue;
    const raw = tx.merchant_name ?? tx.name ?? "Other";
    const { groupKey } = normalizePlaidLabelForAggregation(raw);
    map.set(groupKey, (map.get(groupKey) || 0) + Math.abs(tx.amount));
  }
  return Array.from(map.entries())
    .map(([groupKey, value]) => ({
      name: formatNormalizedPlaidLabel(groupKey),
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, take);
}

export function yearsFromPlaidTransactions(
  transactions: PlaidTransaction[],
  extraYears: number[] = []
): number[] {
  const years = new Set<number>(extraYears);
  for (const tx of transactions) {
    const y = parseInt(tx.date.slice(0, 4), 10);
    if (!Number.isNaN(y)) years.add(y);
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function formatPlaidIncomeLabel(tx: PlaidTransaction): string {
  return tx.merchant_name ?? tx.name ?? "Income";
}

export function formatPlaidSpendingLabel(tx: PlaidTransaction): string {
  return tx.merchant_name ?? tx.name ?? "Purchase";
}
