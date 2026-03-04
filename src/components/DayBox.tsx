import React from 'react';
import { format } from 'date-fns';
import { useBudgetStore } from '../store/useBudgetStore';

interface DayBoxProps {
  date: Date;
  isCurrentMonth: boolean;
  onClick: () => void;
  isToday?: boolean;
}

const DayBox: React.FC<DayBoxProps> = ({ date, isCurrentMonth, onClick, isToday = false }) => {
  const getDailyTotal = useBudgetStore((state) => state.getDailyTotal);

  const dateKey = format(date, 'yyyy-MM-dd');
  const totals = getDailyTotal(dateKey);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div
      className={`
        relative rounded-xl p-2.5 min-h-0 h-full cursor-pointer transition-all duration-200 flex flex-col overflow-hidden border
        ${isToday ? 'border-2 border-accent bg-surface-3' : 'bg-surface-2 border-border-subtle hover:border-border-hover hover:bg-surface-3'}
        ${!isCurrentMonth && !isToday ? 'bg-surface-1 opacity-40' : ''}
      `}
      onClick={onClick}
    >
      {/* Day Number - Top Right */}
      <div className={`absolute top-2 right-2 z-10 text-xs font-medium ${isToday ? 'text-accent font-semibold' : 'text-text-muted'} ${!isCurrentMonth ? 'opacity-40' : ''}`}>
        {format(date, 'd')}
      </div>
      
      <div className="flex flex-col gap-2 mb-1.5 flex-1 min-h-0 mt-5 overflow-hidden">
        {/* Income Section */}
        <div className="border-l-2 border-income-green bg-income-green-dim pl-2 py-1 rounded-md overflow-hidden">
          <div className="flex justify-between items-center">
            <div className="text-xs text-text-secondary">
              Income
            </div>
            <div className="text-xs font-semibold tabular-nums text-income-green">
              {formatCurrency(totals.income)}
            </div>
          </div>
        </div>

        {/* Spending Section */}
        <div className="border-l-2 border-spending-red bg-spending-red-dim pl-2 py-1 rounded-md overflow-hidden">
          <div className="flex justify-between items-center">
            <div className="text-xs text-text-secondary">
              Spending
            </div>
            <div className="text-xs font-semibold tabular-nums text-spending-red">
              {formatCurrency(totals.spending)}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Net */}
      <div className={`text-sm font-semibold tabular-nums mt-auto text-center rounded-md px-2 py-1.5 shrink-0 bg-surface-1 truncate ${
        totals.profit > 0
          ? 'text-income-green'
          : totals.profit < 0
            ? 'text-spending-red'
            : 'text-text-muted'
      }`}>
        {totals.profit >= 0 ? '+' : ''}{formatCurrency(totals.profit)}
      </div>
    </div>
  );
};

export default DayBox;

