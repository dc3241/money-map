import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfWeek,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfDay,
} from 'date-fns';
import type { PlaidTransaction } from '../hooks/usePlaidTransactions';
import type { PlaidAccount } from '../hooks/usePlaidAccounts';
import type { PlaidRecurringSnapshot, PlaidTransactionStreamDoc } from '../hooks/usePlaidRecurringFirestore';
import type { RecurringReviewOverride } from '../hooks/usePlaidRecurringReview';

export type PlannerEventSource = 'override' | 'plaid_stream';
export type PlannerEventType = 'income' | 'expense';
export type PlannerConfidenceLabel = 'High' | 'Medium' | 'Low';
export type PlannerHorizon = 'weekly' | 'biweekly' | 'monthly';

export interface PlannerEvent {
  id: string;
  source: PlannerEventSource;
  type: PlannerEventType;
  label: string;
  date: string;
  amount: number;
  confidence: number;
}

export interface SpendablePlannerModel {
  windowStart: string;
  windowEnd: string;
  windowDays: number;
  startingCash: number;
  projectedIncome: number;
  projectedFixedExpenses: number;
  grossSpendable: number;
  safeSpendable: number;
  dailyAllowance: number;
  confidence: {
    score: number;
    label: PlannerConfidenceLabel;
    sourceMix: {
      overrides: number;
      plaid: number;
    };
  };
  events: PlannerEvent[];
  approvedFixedExpenseCount: number;
}

interface BuildSpendablePlannerInput {
  safetyBuffer: number;
  horizon?: PlannerHorizon;
  windowDays?: number;
  plaidAccounts: PlaidAccount[];
  plaidRecurring: PlaidRecurringSnapshot;
  recurringOverrides: Record<string, RecurringReviewOverride>;
  forecastSourceTransactions: PlaidTransaction[];
}

function resolveWindow(horizon: PlannerHorizon, customWindowDays?: number): {
  windowStart: Date;
  windowEnd: Date;
  windowDays: number;
} {
  const today = startOfDay(new Date());
  const weekStart = startOfDay(startOfWeek(today, { weekStartsOn: 1 }));

  if (horizon === 'weekly') {
    const windowStart = weekStart;
    const windowEnd = startOfDay(endOfWeek(today, { weekStartsOn: 1 }));
    const windowDays = Math.max(1, differenceInCalendarDays(windowEnd, windowStart) + 1);
    return { windowStart, windowEnd, windowDays };
  }

  if (horizon === 'biweekly') {
    const windowStart = weekStart;
    const resolvedDays = customWindowDays && customWindowDays > 0 ? Math.floor(customWindowDays) : 14;
    const windowEnd = startOfDay(addDays(windowStart, resolvedDays - 1));
    return { windowStart, windowEnd, windowDays: Math.max(1, resolvedDays) };
  }

  const windowStart = startOfDay(startOfMonth(today));
  const windowEnd = startOfDay(endOfMonth(today));
  const windowDays = Math.max(1, differenceInCalendarDays(windowEnd, windowStart) + 1);
  return { windowStart, windowEnd, windowDays };
}

function addCadence(base: Date, cadence: string): Date {
  const c = cadence.toLowerCase().replace(/[-\s]+/g, '_');
  switch (c) {
    case 'daily':
      return addDays(base, 1);
    case 'weekly':
      return addWeeks(base, 1);
    case 'bi_weekly':
    case 'biweekly':
      return addWeeks(base, 2);
    case 'semi_monthly':
    case 'twice_monthly':
    case 'semimonthly':
      return addDays(base, 15);
    case 'quarterly':
      return addMonths(base, 3);
    case 'annually':
    case 'annual':
    case 'yearly':
      return addYears(base, 1);
    case 'monthly':
    default:
      return addMonths(base, 1);
  }
}

function nextByStreamFrequency(base: Date, frequency: string | null | undefined): Date {
  const f = (frequency ?? '').toUpperCase().trim().replace(/[-\s]+/g, '_');
  switch (f) {
    case 'DAILY':
      return addDays(base, 1);
    case 'WEEKLY':
      return addWeeks(base, 1);
    case 'BIWEEKLY':
      return addWeeks(base, 2);
    case 'SEMI_MONTHLY':
      return addDays(base, 15);
    case 'QUARTERLY':
      return addMonths(base, 3);
    case 'ANNUALLY':
    case 'ANNUAL':
      return addYears(base, 1);
    case 'MONTHLY':
    case 'UNKNOWN':
    case 'DYNAMIC':
    default:
      return addMonths(base, 1);
  }
}

/** Inverse of {@link nextByStreamFrequency} for walking a stream backward on its cadence. */
function prevByStreamFrequency(base: Date, frequency: string | null | undefined): Date {
  const f = (frequency ?? '').toUpperCase().trim().replace(/[-\s]+/g, '_');
  switch (f) {
    case 'DAILY':
      return addDays(base, -1);
    case 'WEEKLY':
      return addWeeks(base, -1);
    case 'BIWEEKLY':
      return addWeeks(base, -2);
    case 'SEMI_MONTHLY':
      return addDays(base, -15);
    case 'QUARTERLY':
      return addMonths(base, -3);
    case 'ANNUALLY':
    case 'ANNUAL':
      return addYears(base, -1);
    case 'MONTHLY':
    case 'UNKNOWN':
    case 'DYNAMIC':
    default:
      return addMonths(base, -1);
  }
}

/**
 * Aligns to the first occurrence on this stream's schedule that falls in [windowStart, windowEnd].
 * Walks backward from Plaid's anchor so Jan–Dec windows include early-year pay periods, not only dates after last_date.
 */
function firstStreamOccurrenceInWindow(
  stream: PlaidTransactionStreamDoc,
  windowStart: Date,
  windowEnd: Date
): Date | null {
  const anchorRaw = stream.last_date ?? stream.predicted_next_date ?? null;
  if (!anchorRaw) return null;
  let cursor = startOfDay(parseISO(`${anchorRaw}T12:00:00`));
  if (Number.isNaN(cursor.getTime())) return null;

  let guard = 0;
  while (isAfter(cursor, windowEnd) && guard < 400) {
    cursor = prevByStreamFrequency(cursor, stream.frequency);
    guard++;
  }

  guard = 0;
  while (!isBefore(cursor, windowStart) && guard < 400) {
    const prev = prevByStreamFrequency(cursor, stream.frequency);
    if (isBefore(prev, windowStart)) break;
    cursor = prev;
    guard++;
  }
  guard = 0;
  while (isAfter(windowStart, cursor) && guard < 400) {
    cursor = nextByStreamFrequency(cursor, stream.frequency);
    guard++;
  }

  if (isAfter(cursor, windowEnd) || isBefore(cursor, windowStart)) return null;
  return cursor;
}

function streamAmount(s: PlaidTransactionStreamDoc): number {
  const value = s.last_amount?.amount ?? s.average_amount?.amount ?? 0;
  return Math.abs(Number(value) || 0);
}

function confidenceLabel(value: number): PlannerConfidenceLabel {
  if (value >= 0.8) return 'High';
  if (value >= 0.62) return 'Medium';
  return 'Low';
}

/** @param maxOccurrencesPerSeries Cap per override row (default 24 matches short planner windows). */
export function buildOverrideEvents(
  overrides: Record<string, RecurringReviewOverride>,
  sourceTransactions: PlaidTransaction[],
  windowStart: Date,
  windowEnd: Date,
  maxOccurrencesPerSeries = 24
): { events: PlannerEvent[]; blockedStreamTransactionIds: Set<string>; explicitNotRecurring: Set<string> } {
  const txById = new Map<string, PlaidTransaction>();
  for (const tx of sourceTransactions) {
    txById.set(tx.transaction_id, tx);
  }

  const events: PlannerEvent[] = [];
  const blockedStreamTransactionIds = new Set<string>();
  const explicitNotRecurring = new Set<string>();

  for (const [transactionId, override] of Object.entries(overrides)) {
    if (override.decision === 'not_recurring') {
      explicitNotRecurring.add(transactionId);
      continue;
    }
    if (override.decision !== 'recurring') continue;
    const tx = txById.get(transactionId);
    if (!tx) continue;

    const cadence = override.cadence ?? 'monthly';
    const type: PlannerEventType = override.kind ?? (tx.amount < 0 ? 'income' : 'expense');
    let next = startOfDay(parseISO(`${tx.date}T12:00:00`));
    if (Number.isNaN(next.getTime())) continue;

    while (isAfter(windowStart, next)) {
      next = addCadence(next, cadence);
    }

    let count = 0;
    while (!isAfter(next, windowEnd) && count < maxOccurrencesPerSeries) {
      events.push({
        id: `override-${transactionId}-${count}`,
        source: 'override',
        type,
        label: tx.merchant_name || tx.name || 'Recurring',
        date: format(next, 'yyyy-MM-dd'),
        amount: Math.abs(tx.amount),
        confidence: 0.92,
      });
      next = addCadence(next, cadence);
      count++;
    }
    blockedStreamTransactionIds.add(transactionId);
  }

  return { events, blockedStreamTransactionIds, explicitNotRecurring };
}

function isQualifiedPlaidStream(stream: PlaidTransactionStreamDoc): boolean {
  return stream.status?.toLowerCase() === 'mature' && stream.is_active !== false;
}

/** @param maxOccurrencesPerSeries Cap per stream (default 24 matches short planner windows). */
export function buildPlaidStreamEvents(
  recurring: PlaidRecurringSnapshot,
  windowStart: Date,
  windowEnd: Date,
  blockedStreamTransactionIds: Set<string>,
  explicitNotRecurring: Set<string>,
  maxOccurrencesPerSeries = 24
): PlannerEvent[] {
  const events: PlannerEvent[] = [];

  const append = (streams: PlaidTransactionStreamDoc[], type: PlannerEventType) => {
    for (const stream of streams) {
      const streamTxIds = Array.isArray(stream.transaction_ids)
        ? stream.transaction_ids.filter((id): id is string => typeof id === 'string')
        : [];
      if (streamTxIds.some((id) => explicitNotRecurring.has(id))) continue;
      if (streamTxIds.some((id) => blockedStreamTransactionIds.has(id))) continue;
      if (!isQualifiedPlaidStream(stream)) continue;

      let next = firstStreamOccurrenceInWindow(stream, windowStart, windowEnd);
      if (!next) continue;
      const amount = streamAmount(stream);
      if (amount <= 0) continue;

      let count = 0;
      while (!isAfter(next, windowEnd) && count < maxOccurrencesPerSeries) {
        events.push({
          id: `stream-${stream.stream_id}-${count}`,
          source: 'plaid_stream',
          type,
          label: stream.merchant_name || stream.description || 'Stream',
          date: format(next, 'yyyy-MM-dd'),
          amount,
          confidence:
            stream.status?.toLowerCase() === 'mature' && stream.is_active !== false
              ? 0.82
              : stream.is_active !== false
                ? 0.72
                : 0.58,
        });
        next = nextByStreamFrequency(next, stream.frequency);
        count++;
      }
    }
  };

  append(recurring.inflow_streams, 'income');
  append(recurring.outflow_streams, 'expense');
  return events;
}

export function buildWeeklySpendablePlanner(
  input: BuildSpendablePlannerInput
): SpendablePlannerModel {
  const horizon = input.horizon ?? 'weekly';
  const { windowStart, windowEnd, windowDays: days } = resolveWindow(horizon, input.windowDays);
  const safetyBuffer = Math.max(0, Number.isFinite(input.safetyBuffer) ? input.safetyBuffer : 0);

  const { events: overrideEvents, blockedStreamTransactionIds, explicitNotRecurring } =
    buildOverrideEvents(input.recurringOverrides, input.forecastSourceTransactions, windowStart, windowEnd);
  const plaidStreamEvents = buildPlaidStreamEvents(
    input.plaidRecurring,
    windowStart,
    windowEnd,
    blockedStreamTransactionIds,
    explicitNotRecurring
  );

  const events = [...overrideEvents, ...plaidStreamEvents];

  const projectedIncome = events
    .filter((event) => event.type === 'income')
    .reduce((sum, event) => sum + event.amount, 0);
  const projectedFixedExpenses = events
    .filter((event) => event.type === 'expense')
    .reduce((sum, event) => sum + event.amount, 0);

  const startingCash = input.plaidAccounts
    .filter((account) => !['credit', 'loan', 'investment'].includes(account.type))
    .reduce((sum, account) => sum + Number(account.current_balance ?? 0), 0);

  const grossSpendable = startingCash + projectedIncome - projectedFixedExpenses;
  const safeSpendable = Math.max(0, grossSpendable - safetyBuffer);
  const dailyAllowance = Math.max(0, safeSpendable / days);

  const sourceMix = {
    overrides: events.filter((event) => event.source === 'override').length,
    plaid: events.filter((event) => event.source === 'plaid_stream').length,
  };
  const score =
    events.length === 0 ? 0 : events.reduce((sum, event) => sum + event.confidence, 0) / events.length;

  return {
    windowStart: format(windowStart, 'yyyy-MM-dd'),
    windowEnd: format(windowEnd, 'yyyy-MM-dd'),
    windowDays: days,
    startingCash,
    projectedIncome,
    projectedFixedExpenses,
    grossSpendable,
    safeSpendable,
    dailyAllowance,
    confidence: {
      score,
      label: confidenceLabel(score),
      sourceMix,
    },
    events: events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    approvedFixedExpenseCount: events.filter((event) => event.type === 'expense').length,
  };
}
