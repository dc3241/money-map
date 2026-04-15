import React from 'react';
import { format } from 'date-fns';
import { useBudgetStore } from '../store/useBudgetStore';
import { usePlaidActuals } from '../context/PlaidActualsContext';
import { usePlaidRangeTransactionsState } from '../context/PlaidRangeTransactionsContext';
import { plaidDailyTotal } from '../utils/plaidAggregates';

interface WeekDayBoxProps {
  date: Date;
  onClick: () => void;
  isToday?: boolean;
}

const WeekDayBox: React.FC<WeekDayBoxProps> = ({ date, onClick, isToday = false }) => {
  const getDailyTotal = useBudgetStore((state) => state.getDailyTotal);
  const { transactions, accountTypeByAccountId } = usePlaidRangeTransactionsState();
  const { usePlaidForActuals } = usePlaidActuals();

  const dateKey = format(date, 'yyyy-MM-dd');
  const storeTotals = getDailyTotal(dateKey);
  const plaidTotals = plaidDailyTotal(
    transactions,
    dateKey,
    usePlaidForActuals ? accountTypeByAccountId : undefined
  );
  const totals = usePlaidForActuals ? plaidTotals : storeTotals;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const dayLabel = format(date, 'EEEE, MMMM d');

  return (
    <div
      className={`
        relative rounded-xl px-2 py-2 md:p-3 w-full max-w-full min-w-0 h-full min-h-0 flex flex-col box-border border gap-2
        ${isToday ? 'border-2 border-accent bg-surface-3' : 'bg-surface-2 border-border-subtle'}
      `}
      style={{ maxWidth: '100%' }}
    >
      <div className="flex flex-col gap-0.5 flex-shrink-0 border-b border-border-subtle pb-2">
        <div>
          <div className="text-text-muted text-xs uppercase tracking-widest font-medium truncate">
            {format(date, 'EEEE')}
          </div>
          <div className="text-text-secondary text-xs truncate">
            {format(date, 'MMM d')}
          </div>
        </div>
        <div
          className={`text-sm font-semibold tabular-nums ${
            totals.profit > 0
              ? 'text-income-green'
              : totals.profit < 0
                ? 'text-spending-red'
                : 'text-text-muted'
          }`}
        >
          Net {totals.profit >= 0 ? '+' : ''}
          {formatCurrency(totals.profit)}
        </div>
      </div>

      <div className="border-l-2 border-income-green bg-income-green-dim rounded-md px-2 py-1.5 flex-shrink-0">
        <div className="text-text-muted text-[10px] md:text-xs uppercase tracking-widest font-medium">
          Income
        </div>
        <div className="text-income-green text-xs font-semibold tabular-nums">
          {formatCurrency(totals.income)}
        </div>
      </div>

      <div className="border-l-2 border-spending-red bg-spending-red-dim rounded-md px-2 py-1.5 flex-shrink-0">
        <div className="text-text-muted text-[10px] md:text-xs uppercase tracking-widest font-medium">
          Spending
        </div>
        <div className="text-spending-red text-xs font-semibold tabular-nums">
          {formatCurrency(totals.spending)}
        </div>
      </div>

      <button
        type="button"
        onClick={onClick}
        className={`
          mt-auto w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-colors
          border border-border-subtle bg-surface-1 text-accent hover:bg-surface-3 hover:border-border-hover
          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app
        `}
        aria-label={`See transactions for ${dayLabel}`}
      >
        See transactions
      </button>
    </div>
  );
};

export default WeekDayBox;
