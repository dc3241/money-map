import { addDays, addMonths, addWeeks, addYears, format, isAfter, parseISO, startOfDay } from 'date-fns';
import type { RecurringExpense, RecurringIncome, Account, RecurrencePattern } from '../types';
import { getNextOccurrence } from './recurrenceUtils';
import type { PlaidTransaction } from '../hooks/usePlaidTransactions';
import type { PlaidAccount } from '../hooks/usePlaidAccounts';
import type { PlaidRecurringSnapshot, PlaidTransactionStreamDoc } from '../hooks/usePlaidRecurringFirestore';
import type { RecurringReviewOverride } from '../hooks/usePlaidRecurringReview';

export type PlannerEventSource = 'override' | 'plaid_stream' | 'manual';
export type PlannerEventType = 'income' | 'expense';
export type PlannerConfidenceLabel = 'High' | 'Medium' | 'Low';

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
      manual: number;
    };
  };
  events: PlannerEvent[];
}

interface BuildSpendablePlannerInput {
  usePlaidForActuals: boolean;
  safetyBuffer: number;
  windowDays?: number;
  manualRecurringIncome: RecurringIncome[];
  manualRecurringExpenses: RecurringExpense[];
  manualAccounts: Account[];
  plaidAccounts: PlaidAccount[];
  plaidRecurring: PlaidRecurringSnapshot;
  recurringOverrides: Record<string, RecurringReviewOverride>;
  forecastSourceTransactions: PlaidTransaction[];
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

function streamAmount(s: PlaidTransactionStreamDoc): number {
  const value = s.last_amount?.amount ?? s.average_amount?.amount ?? 0;
  return Math.abs(Number(value) || 0);
}

function streamAnchorDate(stream: PlaidTransactionStreamDoc, fromDate: Date): Date | null {
  const raw = stream.predicted_next_date ?? stream.last_date ?? null;
  if (!raw) return null;
  const parsed = parseISO(`${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  let next = startOfDay(parsed);
  while (!isAfter(next, fromDate)) {
    next = nextByStreamFrequency(next, stream.frequency);
  }
  return next;
}

function confidenceLabel(value: number): PlannerConfidenceLabel {
  if (value >= 0.8) return 'High';
  if (value >= 0.62) return 'Medium';
  return 'Low';
}

function buildManualEvents(
  recurringIncome: RecurringIncome[],
  recurringExpenses: RecurringExpense[],
  windowStart: Date,
  windowEnd: Date
): PlannerEvent[] {
  const events: PlannerEvent[] = [];
  const appendRecurring = (
    items: RecurringIncome[] | RecurringExpense[],
    type: PlannerEventType
  ) => {
    for (const item of items) {
      if (!item.isActive) continue;
      let next = getNextOccurrence(
        item.pattern as RecurrencePattern,
        addDays(windowStart, -1),
        item.startDate,
        item.endDate
      );
      let count = 0;
      while (next && !isAfter(startOfDay(next), windowEnd) && count < 24) {
        const n = startOfDay(next);
        if (!isAfter(windowStart, n)) {
          events.push({
            id: `manual-${type}-${item.id}-${count}`,
            source: 'manual',
            type,
            label: item.description || 'Recurring',
            date: format(n, 'yyyy-MM-dd'),
            amount: Math.abs(item.amount),
            confidence: 0.64,
          });
        }
        next = getNextOccurrence(
          item.pattern as RecurrencePattern,
          n,
          item.startDate,
          item.endDate
        );
        count++;
      }
    }
  };
  appendRecurring(recurringIncome, 'income');
  appendRecurring(recurringExpenses, 'expense');
  return events;
}

function buildOverrideEvents(
  overrides: Record<string, RecurringReviewOverride>,
  sourceTransactions: PlaidTransaction[],
  windowStart: Date,
  windowEnd: Date
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
    while (!isAfter(next, windowEnd) && count < 24) {
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

function buildPlaidStreamEvents(
  recurring: PlaidRecurringSnapshot,
  windowStart: Date,
  windowEnd: Date,
  blockedStreamTransactionIds: Set<string>,
  explicitNotRecurring: Set<string>
): PlannerEvent[] {
  const events: PlannerEvent[] = [];

  const append = (streams: PlaidTransactionStreamDoc[], type: PlannerEventType) => {
    for (const stream of streams) {
      const streamTxIds = Array.isArray(stream.transaction_ids)
        ? stream.transaction_ids.filter((id): id is string => typeof id === 'string')
        : [];
      if (streamTxIds.some((id) => explicitNotRecurring.has(id))) continue;
      if (streamTxIds.some((id) => blockedStreamTransactionIds.has(id))) continue;

      let next = streamAnchorDate(stream, addDays(windowStart, -1));
      if (!next) continue;
      while (isAfter(windowStart, next)) {
        next = nextByStreamFrequency(next, stream.frequency);
      }
      const amount = streamAmount(stream);
      if (amount <= 0) continue;

      let count = 0;
      while (!isAfter(next, windowEnd) && count < 24) {
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
  const days = input.windowDays && input.windowDays > 0 ? Math.floor(input.windowDays) : 7;
  const today = startOfDay(new Date());
  // Planner intentionally starts tomorrow to avoid mixing actuals with forecasted future spendability.
  const windowStart = startOfDay(addDays(today, 1));
  const windowEnd = startOfDay(addDays(windowStart, days - 1));
  const safetyBuffer = Math.max(0, Number.isFinite(input.safetyBuffer) ? input.safetyBuffer : 0);

  const manualEvents = buildManualEvents(
    input.manualRecurringIncome,
    input.manualRecurringExpenses,
    windowStart,
    windowEnd
  );
  const { events: overrideEvents, blockedStreamTransactionIds, explicitNotRecurring } =
    buildOverrideEvents(input.recurringOverrides, input.forecastSourceTransactions, windowStart, windowEnd);
  const plaidStreamEvents = buildPlaidStreamEvents(
    input.plaidRecurring,
    windowStart,
    windowEnd,
    blockedStreamTransactionIds,
    explicitNotRecurring
  );

  const events = input.usePlaidForActuals
    ? [...overrideEvents, ...plaidStreamEvents]
    : manualEvents;

  const projectedIncome = events
    .filter((event) => event.type === 'income')
    .reduce((sum, event) => sum + event.amount, 0);
  const projectedFixedExpenses = events
    .filter((event) => event.type === 'expense')
    .reduce((sum, event) => sum + event.amount, 0);

  const startingCash = input.usePlaidForActuals
    ? input.plaidAccounts
        .filter((account) => !['credit', 'loan', 'investment'].includes(account.type))
        .reduce((sum, account) => sum + Number(account.current_balance ?? 0), 0)
    : input.manualAccounts
        .filter((account) => account.type !== 'credit_card')
        .reduce((sum, account) => sum + Number(account.initialBalance ?? 0), 0);

  const grossSpendable = startingCash + projectedIncome - projectedFixedExpenses;
  const safeSpendable = Math.max(0, grossSpendable - safetyBuffer);
  const dailyAllowance = Math.max(0, safeSpendable / days);

  const sourceMix = {
    overrides: events.filter((event) => event.source === 'override').length,
    plaid: events.filter((event) => event.source === 'plaid_stream').length,
    manual: events.filter((event) => event.source === 'manual').length,
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
  };
}
