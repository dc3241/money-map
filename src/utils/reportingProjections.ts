import { startOfDay } from 'date-fns';
import type { PlaidTransaction } from '../hooks/usePlaidTransactions';
import type { PlaidRecurringSnapshot } from '../hooks/usePlaidRecurringFirestore';
import type { RecurringReviewOverride } from '../hooks/usePlaidRecurringReview';
import type { RecurringExpense, RecurringIncome } from '../types';
import {
  buildOverrideEvents,
  buildPlaidStreamEvents,
  type PlannerEvent,
} from './forecastPlanner';
import { getOccurrencesInMonth } from './recurrenceUtils';

/** Enough headroom for weekly streams over a full calendar year (plus margin). */
export const REPORTING_YEAR_MAX_OCCURRENCES_PER_SERIES = 400;

export function sumPlannerEventFlows(events: PlannerEvent[]): {
  income: number;
  spending: number;
  profit: number;
} {
  let income = 0;
  let spending = 0;
  for (const e of events) {
    if (e.type === 'income') income += e.amount;
    else spending += e.amount;
  }
  return { income, spending, profit: income - spending };
}

/**
 * Totals from manually configured recurring income/expenses for a calendar year
 * (occurrences × amount per pattern).
 */
export function sumManualRecurringCalendarYear(
  year: number,
  recurringIncome: RecurringIncome[],
  recurringExpenses: RecurringExpense[]
): { income: number; spending: number; profit: number } {
  let income = 0;
  let spending = 0;
  for (const item of recurringIncome) {
    if (!item.isActive) continue;
    const amt = Math.abs(Number(item.amount) || 0);
    if (amt <= 0) continue;
    for (let m = 1; m <= 12; m++) {
      const occ = getOccurrencesInMonth(
        item.pattern,
        year,
        m,
        item.startDate,
        item.endDate
      );
      income += occ.length * amt;
    }
  }
  for (const item of recurringExpenses) {
    if (!item.isActive) continue;
    const amt = Math.abs(Number(item.amount) || 0);
    if (amt <= 0) continue;
    for (let m = 1; m <= 12; m++) {
      const occ = getOccurrencesInMonth(
        item.pattern,
        year,
        m,
        item.startDate,
        item.endDate
      );
      spending += occ.length * amt;
    }
  }
  return { income, spending, profit: income - spending };
}

/**
 * Full-calendar-year recurring baseline: mature Plaid streams + review overrides + manual recurring items.
 * Aligns with Budgets forecast sources; excludes one-off bank transactions.
 */
export function computeRecurringBaselineCalendarYear(
  year: number,
  options: {
    usePlaidForActuals: boolean;
    plaidRecurring: PlaidRecurringSnapshot;
    recurringOverrides: Record<string, RecurringReviewOverride>;
    forecastSourceTransactions: PlaidTransaction[];
    recurringIncome: RecurringIncome[];
    recurringExpenses: RecurringExpense[];
  }
): { income: number; spending: number; profit: number } {
  const manual = sumManualRecurringCalendarYear(
    year,
    options.recurringIncome,
    options.recurringExpenses
  );

  if (!options.usePlaidForActuals) {
    return manual;
  }

  const windowStart = startOfDay(new Date(year, 0, 1));
  const windowEnd = startOfDay(new Date(year, 11, 31));

  const { events: overrideEvents, blockedStreamTransactionIds, explicitNotRecurring } =
    buildOverrideEvents(
      options.recurringOverrides,
      options.forecastSourceTransactions,
      windowStart,
      windowEnd,
      REPORTING_YEAR_MAX_OCCURRENCES_PER_SERIES
    );
  const plaidEvents = buildPlaidStreamEvents(
    options.plaidRecurring,
    windowStart,
    windowEnd,
    blockedStreamTransactionIds,
    explicitNotRecurring,
    REPORTING_YEAR_MAX_OCCURRENCES_PER_SERIES
  );
  const plaidFlows = sumPlannerEventFlows([...overrideEvents, ...plaidEvents]);

  return {
    income: plaidFlows.income + manual.income,
    spending: plaidFlows.spending + manual.spending,
    profit: plaidFlows.income + manual.income - (plaidFlows.spending + manual.spending),
  };
}
