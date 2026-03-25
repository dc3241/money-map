import { parseISO, startOfDay } from "date-fns";
import type { PlaidTransaction } from "../hooks/usePlaidTransactions";
import { formatDateKey } from "./dateUtils";

function isOnOrBeforeToday(dateKey: string): boolean {
  const today = startOfDay(new Date());
  const d = startOfDay(parseISO(dateKey));
  return d.getTime() <= today.getTime();
}

function includeTxForAggregate(tx: PlaidTransaction): boolean {
  if (tx.pending) return false;
  return true;
}

/** Plaid: positive amount = outflow (spending), negative = inflow (income). */
export function plaidDailyTotal(
  transactions: PlaidTransaction[],
  dateKey: string
): { income: number; spending: number; profit: number } {
  let income = 0;
  let spending = 0;
  for (const tx of transactions) {
    if (tx.date !== dateKey) continue;
    if (!includeTxForAggregate(tx)) continue;
    if (tx.amount < 0) income += Math.abs(tx.amount);
    else if (tx.amount > 0) spending += tx.amount;
  }
  return { income, spending, profit: income - spending };
}

export function plaidWeeklyTotal(
  transactions: PlaidTransaction[],
  weekStart: Date,
  weekEnd: Date
): { income: number; spending: number; profit: number } {
  const today = startOfDay(new Date());
  let income = 0;
  let spending = 0;
  const cur = new Date(weekStart);
  const end = new Date(weekEnd);
  while (cur <= end) {
    if (startOfDay(cur).getTime() <= today.getTime()) {
      const key = formatDateKey(cur);
      const d = plaidDailyTotal(transactions, key);
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
  month: number
): { income: number; spending: number; profit: number } {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  let income = 0;
  let spending = 0;
  for (const tx of transactions) {
    if (!tx.date.startsWith(prefix)) continue;
    if (!isOnOrBeforeToday(tx.date)) continue;
    if (!includeTxForAggregate(tx)) continue;
    if (tx.amount < 0) income += Math.abs(tx.amount);
    else if (tx.amount > 0) spending += tx.amount;
  }
  return { income, spending, profit: income - spending };
}

export function plaidAnnualTotal(
  transactions: PlaidTransaction[],
  year: number
): { income: number; spending: number; profit: number } {
  let income = 0;
  let spending = 0;
  const yPrefix = `${year}-`;
  for (const tx of transactions) {
    if (!tx.date.startsWith(yPrefix)) continue;
    if (!isOnOrBeforeToday(tx.date)) continue;
    if (!includeTxForAggregate(tx)) continue;
    if (tx.amount < 0) income += Math.abs(tx.amount);
    else if (tx.amount > 0) spending += tx.amount;
  }
  return { income, spending, profit: income - spending };
}

export function plaidIncomeOnDate(
  transactions: PlaidTransaction[],
  dateKey: string
): PlaidTransaction[] {
  return transactions.filter(
    (tx) =>
      tx.date === dateKey && includeTxForAggregate(tx) && tx.amount < 0
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
    const label = tx.merchant_name ?? tx.name ?? "Other";
    map.set(label, (map.get(label) || 0) + tx.amount);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, take);
}

export function plaidTopIncomeSources(
  transactions: PlaidTransaction[],
  year: number,
  take = 10
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (!tx.date.startsWith(`${year}-`)) continue;
    if (!isOnOrBeforeToday(tx.date)) continue;
    if (!includeTxForAggregate(tx)) continue;
    if (tx.amount >= 0) continue;
    const label = tx.merchant_name ?? tx.name ?? "Other";
    map.set(label, (map.get(label) || 0) + Math.abs(tx.amount));
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
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
