import React, { useMemo } from 'react';
import { format, startOfDay, differenceInDays } from 'date-fns';
import { useBudgetStore } from '../../store/useBudgetStore';
import { usePlaidActuals } from '../../context/PlaidActualsContext';
import { usePlaidRecurringFirestore } from '../../hooks/usePlaidRecurringFirestore';
import { getNextOccurrence } from '../../utils/recurrenceUtils';
import { upcomingFromPlaidStreams } from '../../utils/plaidStreamUtils';

function formatNextDate(date: Date): string {
  return format(date, 'EEE, MMM d');
}

function daysUntil(date: Date): number {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  return Math.max(0, differenceInDays(target, today));
}

interface UpcomingItem {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  nextDate: Date;
}

interface Props {
  onNavigate?: () => void;
}

const UpcomingRecurring: React.FC<Props> = ({ onNavigate }) => {
  const { usePlaidForActuals } = usePlaidActuals();
  const { data: plaidRecurring, loading: plaidRecLoading } = usePlaidRecurringFirestore();
  const recurringExpenses = useBudgetStore((state) => state.recurringExpenses);
  const recurringIncome = useBudgetStore((state) => state.recurringIncome);

  const manualItems = useMemo(() => {
    const today = startOfDay(new Date());
    const combined: UpcomingItem[] = [];

    recurringExpenses
      .filter((e) => e.isActive)
      .forEach((expense) => {
        const nextDate = getNextOccurrence(expense.pattern, today, expense.startDate, expense.endDate);
        if (nextDate) {
          combined.push({
            id: expense.id,
            description: expense.description,
            amount: expense.amount,
            type: 'expense',
            nextDate,
          });
        }
      });

    recurringIncome
      .filter((i) => i.isActive)
      .forEach((income) => {
        const nextDate = getNextOccurrence(income.pattern, today, income.startDate, income.endDate);
        if (nextDate) {
          combined.push({
            id: income.id,
            description: income.description,
            amount: income.amount,
            type: 'income',
            nextDate,
          });
        }
      });

    combined.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
    return combined.slice(0, 5);
  }, [recurringExpenses, recurringIncome]);

  const plaidItems = useMemo(() => {
    if (!usePlaidForActuals) return [];
    return upcomingFromPlaidStreams(
      plaidRecurring.inflow_streams,
      plaidRecurring.outflow_streams,
      5
    );
  }, [
    usePlaidForActuals,
    plaidRecurring.inflow_streams,
    plaidRecurring.outflow_streams,
  ]);

  const items: UpcomingItem[] = usePlaidForActuals
    ? plaidItems.map((p) => ({
        id: p.id,
        description: p.description,
        amount: p.amount,
        type: p.type,
        nextDate: p.nextDate,
      }))
    : manualItems;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-text-muted text-xs uppercase tracking-widest font-medium">
          Upcoming recurring
        </span>
        <span
          className="text-accent text-xs cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onNavigate}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate?.()}
          role="button"
          tabIndex={onNavigate ? 0 : -1}
        >
          Manage →
        </span>
      </div>

      {usePlaidForActuals && plaidRecLoading && (
        <div className="text-text-muted text-xs text-center py-6">Loading streams…</div>
      )}

      {usePlaidForActuals && !plaidRecLoading && plaidRecurring.error && items.length === 0 && (
        <div className="text-text-muted text-xs text-center py-4">
          Recurring detection unavailable for this link. Try refreshing after more transactions sync.
        </div>
      )}

      {!usePlaidForActuals && items.length === 0 && (
        <div className="text-text-muted text-xs italic text-center py-6">
          No recurring transactions set up yet
        </div>
      )}

      {usePlaidForActuals && !plaidRecLoading && items.length === 0 && !plaidRecurring.error && (
        <div className="text-text-muted text-xs italic text-center py-6">
          No recurring streams detected yet. Sync transactions and refresh Plaid data.
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-2 transition-colors cursor-default"
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  item.type === 'income' ? 'bg-income-green' : 'bg-spending-red'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-text-primary text-sm font-medium truncate">
                  {item.description}
                </div>
                <div className="text-text-muted text-xs mt-0.5">
                  {formatNextDate(item.nextDate)}
                  <span
                    className={`ml-2 font-medium ${
                      daysUntil(item.nextDate) === 0
                        ? 'text-amber'
                        : daysUntil(item.nextDate) <= 3
                          ? 'text-spending-red'
                          : 'text-text-muted'
                    }`}
                  >
                    {daysUntil(item.nextDate) === 0
                      ? 'Today'
                      : daysUntil(item.nextDate) === 1
                        ? 'Tomorrow'
                        : `In ${daysUntil(item.nextDate)} days`}
                  </span>
                </div>
              </div>
              <div
                className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                  item.type === 'income' ? 'text-income-green' : 'text-text-primary'
                }`}
              >
                {item.type === 'income' ? '+' : '-'}
                {formatCurrency(item.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingRecurring;
