import {
  differenceInCalendarDays,
  endOfYear,
  format,
  max as dfnsMax,
  min as dfnsMin,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
} from "date-fns";
import type { PlaidTransaction } from "../hooks/usePlaidTransactions";

/**
 * Earliest calendar date in `selectedYear` that appears in manual day keys (`yyyy-MM-dd`).
 */
export function firstManualDataDateInYear(
  selectedYear: number,
  dayKeys: string[]
): Date | null {
  let minKey: string | null = null;
  const prefix = `${selectedYear}-`;
  for (const key of dayKeys) {
    if (!key.startsWith(prefix)) continue;
    if (!minKey || key < minKey) minKey = key;
  }
  if (!minKey) return null;
  const d = parseISO(`${minKey}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Earliest Plaid transaction date in `selectedYear` (string compare on ISO dates is valid).
 */
export function firstPlaidDataDateInYear(
  selectedYear: number,
  transactions: PlaidTransaction[]
): Date | null {
  const prefix = `${selectedYear}-`;
  let minDate: string | null = null;
  for (const tx of transactions) {
    if (!tx.date?.startsWith(prefix)) continue;
    if (!minDate || tx.date < minDate) minDate = tx.date;
  }
  if (!minDate) return null;
  const d = parseISO(`${minDate}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Start of the first calendar month that contains real data in the year (vs Jan 1).
 */
export function reportingEffectiveStart(
  selectedYear: number,
  firstDataDateInYear: Date | null
): Date {
  const yearStart = startOfYear(new Date(selectedYear, 0, 1));
  const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
  if (!firstDataDateInYear) return yearStart;
  const t = startOfDay(firstDataDateInYear);
  if (t < yearStart) return yearStart;
  if (t > yearEnd) return yearStart;
  return startOfMonth(t);
}

/**
 * First day of the last **fully completed** calendar month inside `selectedYear`
 * relative to `today`. Null if no full month has ended yet in that year (e.g. Jan 5).
 * For past years, returns December 1 of that year.
 */
export function lastCompletedMonthStartInYear(
  selectedYear: number,
  today: Date
): Date | null {
  const t = startOfDay(today);
  const ty = t.getFullYear();
  const tm = t.getMonth();
  if (selectedYear < ty) {
    return new Date(selectedYear, 11, 1);
  }
  if (selectedYear > ty) {
    return null;
  }
  if (tm === 0) {
    return null;
  }
  return new Date(ty, tm - 1, 1);
}

/** Inclusive count of calendar months from `monthStartA` to `monthStartB` (both month starts). */
export function countInclusiveCalendarMonths(
  monthStartA: Date,
  monthStartB: Date
): number {
  const a = startOfMonth(monthStartA);
  const b = startOfMonth(monthStartB);
  if (a > b) return 0;
  const y1 = a.getFullYear();
  const m1 = a.getMonth();
  const y2 = b.getFullYear();
  const m2 = b.getMonth();
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}

export type ReportingAverageDenominators = {
  completedEligibleMonths: number;
  monthlyDivisor: number;
  elapsedDaysInPeriod: number;
  effectiveStart: Date;
  lastCompletedMonthStart: Date | null;
  /** No completed month yet, but YTD > 0 (run rate is month-to-date only). */
  isPartialFirstMonthOnly: boolean;
};

/**
 * Denominators for YTD "average per completed month" (Option 1) and daily rates.
 * Excludes pre-data months: the window starts at the first month that contains any data.
 */
export function computeReportingAverageDenominators(
  selectedYear: number,
  firstDataDateInYear: Date | null,
  ytdIncome: number,
  ytdSpending: number,
  todayInput: Date = new Date()
): ReportingAverageDenominators {
  const today = startOfDay(todayInput);
  const effectiveStart = reportingEffectiveStart(selectedYear, firstDataDateInYear);
  const lastCompleted = lastCompletedMonthStartInYear(selectedYear, today);
  const yearStart = startOfYear(new Date(selectedYear, 0, 1));
  const yearEnd = endOfYear(new Date(selectedYear, 0, 1));

  let completedEligibleMonths = 0;
  if (lastCompleted) {
    const windowStart = dfnsMax([effectiveStart, yearStart]);
    const windowEnd = dfnsMin([lastCompleted, new Date(selectedYear, 11, 1)]);
    if (windowStart <= windowEnd) {
      completedEligibleMonths = countInclusiveCalendarMonths(windowStart, windowEnd);
    }
  }

  const periodEnd = dfnsMin([today, yearEnd]);
  const periodStart = dfnsMax([effectiveStart, yearStart]);
  let elapsedDaysInPeriod =
    periodEnd >= periodStart ? differenceInCalendarDays(periodEnd, periodStart) + 1 : 1;
  elapsedDaysInPeriod = Math.max(1, elapsedDaysInPeriod);

  const hasYtd = ytdIncome !== 0 || ytdSpending !== 0;
  const isPartialFirstMonthOnly =
    completedEligibleMonths === 0 && hasYtd && lastCompleted === null;

  const monthlyDivisor = completedEligibleMonths > 0 ? completedEligibleMonths : 1;

  return {
    completedEligibleMonths,
    monthlyDivisor,
    elapsedDaysInPeriod,
    effectiveStart,
    lastCompletedMonthStart: lastCompleted,
    isPartialFirstMonthOnly,
  };
}

/** Human-readable range for the monthly average (completed months). */
export function formatReportingAveragePeriodLabel(
  selectedYear: number,
  d: ReportingAverageDenominators
): string {
  if (d.completedEligibleMonths === 0) {
    if (d.isPartialFirstMonthOnly) {
      return "Month to date (no full month completed yet)";
    }
    return "";
  }
  const a = d.effectiveStart;
  const b = d.lastCompletedMonthStart;
  if (!b) return "";
  if (
    a.getFullYear() === selectedYear &&
    b.getFullYear() === selectedYear
  ) {
    return `${format(a, "MMM")}–${format(b, "MMM")} ${selectedYear}`;
  }
  return `${format(a, "MMM yyyy")}–${format(b, "MMM yyyy")}`;
}
