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
        relative bg-white border border-gray-200 rounded-lg p-2.5 min-h-0 h-full cursor-pointer 
        shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 flex flex-col overflow-hidden
        ${!isCurrentMonth ? 'bg-gray-50 opacity-40' : ''}
        ${isToday ? 'ring-2 ring-blue-500' : ''}
      `}
      onClick={onClick}
    >
      {/* Day Number - Top Right */}
      <div className="absolute top-2 right-2 text-xs font-medium text-gray-400 z-10">
        {format(date, 'd')}
      </div>
      
      <div className="flex flex-col gap-2 mb-1.5 flex-1 min-h-0 mt-5 overflow-hidden">
        {/* Income Section */}
        <div className="border-l-4 border-emerald-500 pl-2 py-1 hover:bg-emerald-50 transition-colors rounded-r overflow-hidden">
          <div className="flex justify-between items-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Income
            </div>
            <div className="text-xs font-semibold tabular-nums text-emerald-600">
              {formatCurrency(totals.income)}
            </div>
          </div>
        </div>

        {/* Spending Section */}
        <div className="border-l-4 border-rose-500 pl-2 py-1 hover:bg-rose-50 transition-colors rounded-r overflow-hidden">
          <div className="flex justify-between items-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Spending
            </div>
            <div className="text-xs font-semibold tabular-nums text-rose-600">
              {formatCurrency(totals.spending)}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Net */}
      <div className={`text-sm font-semibold tabular-nums mt-auto text-center rounded px-2 py-1.5 shrink-0 bg-gray-50 truncate ${
        totals.profit >= 0 
          ? 'text-emerald-700' 
          : 'text-rose-700'
      }`}>
        {totals.profit >= 0 ? '+' : ''}{formatCurrency(totals.profit)}
      </div>
    </div>
  );
};

export default DayBox;

