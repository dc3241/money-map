import {
  addDays,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Budget } from '../types';

type BudgetPeriod = 'weekly' | 'biweekly' | 'monthly';

interface GetBudgetWindowParams {
  period: BudgetPeriod;
  referenceDate: Date;
  weekStartsOn?: 0 | 1;
  biweeklyAnchorDate?: string;
}

function formatDate(date: Date): string {
  return format(startOfDay(date), 'yyyy-MM-dd');
}

function parseDateOnly(date: string): Date {
  return startOfDay(parseISO(`${date}T00:00:00`));
}

export function getBudgetWindow({
  period,
  referenceDate,
  weekStartsOn = 1,
  biweeklyAnchorDate,
}: GetBudgetWindowParams): { windowStart: string; windowEnd: string } {
  const safeReference = startOfDay(referenceDate);

  if (period === 'monthly') {
    const start = startOfMonth(safeReference);
    const end = endOfMonth(safeReference);
    return { windowStart: formatDate(start), windowEnd: formatDate(end) };
  }

  if (period === 'weekly') {
    const start = startOfWeek(safeReference, { weekStartsOn });
    const end = endOfWeek(safeReference, { weekStartsOn });
    return { windowStart: formatDate(start), windowEnd: formatDate(end) };
  }

  const defaultAnchor = startOfWeek(new Date(), { weekStartsOn });
  const parsedAnchor = biweeklyAnchorDate ? parseDateOnly(biweeklyAnchorDate) : startOfDay(defaultAnchor);
  const anchor = startOfDay(parsedAnchor);

  let start = anchor;
  if (safeReference.getTime() >= anchor.getTime()) {
    const daysDiff = Math.floor((safeReference.getTime() - anchor.getTime()) / 86400000);
    const blockOffset = Math.floor(daysDiff / 14);
    start = addDays(anchor, blockOffset * 14);
  } else {
    const daysDiff = Math.floor((anchor.getTime() - safeReference.getTime()) / 86400000);
    const blockOffset = Math.ceil(daysDiff / 14);
    start = addDays(anchor, -blockOffset * 14);
  }
  const end = addDays(start, 13);
  return { windowStart: formatDate(start), windowEnd: formatDate(end) };
}

export function isDateInWindow(date: string, windowStart: string, windowEnd: string): boolean {
  return date >= windowStart && date <= windowEnd;
}

export function deriveLegacyBudgetWindow(
  budget: Partial<Budget> & { period?: string },
  selectedYear: number,
  selectedMonth: number
): { windowStart: string; windowEnd: string } {
  const safeMonth = Math.min(12, Math.max(1, selectedMonth || 1));
  const safeYear = Number.isFinite(selectedYear) ? selectedYear : new Date().getFullYear();
  const fallbackRef = new Date(safeYear, safeMonth - 1, 1);

  if (budget.period === 'monthly') {
    const year = budget.year ?? safeYear;
    const month = budget.month ?? safeMonth;
    return getBudgetWindow({
      period: 'monthly',
      referenceDate: new Date(year, month - 1, 1),
    });
  }

  if (budget.period === 'weekly') {
    const year = budget.year ?? safeYear;
    const month = budget.month ?? safeMonth;
    const weekIndex = Math.max(1, budget.week ?? 1);
    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const seededDate = addWeeks(monthStart, weekIndex - 1);
    return getBudgetWindow({
      period: 'weekly',
      referenceDate: seededDate,
    });
  }

  // Legacy yearly budgets are mapped to the selected month window for
  // best-effort compatibility until all users are migrated to window-based budgets.
  return getBudgetWindow({
    period: 'monthly',
    referenceDate: fallbackRef,
  });
}

