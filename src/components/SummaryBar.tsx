import React from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { getWeekRange, getMonthRange } from '../utils/dateUtils';
import { format } from 'date-fns';

interface SummaryBarProps {
  currentDate: Date;
}

const SummaryBar: React.FC<SummaryBarProps> = ({ currentDate }) => {
  const getWeeklyTotal = useBudgetStore((state) => state.getWeeklyTotal);
  const getMonthlyTotal = useBudgetStore((state) => state.getMonthlyTotal);
  // Subscribe to days to trigger re-render when transactions change
  const days = useBudgetStore((state) => state.days);

  const weekRange = getWeekRange(currentDate);
  const monthRange = getMonthRange(currentDate);
  
  const weekly = getWeeklyTotal(weekRange.start, weekRange.end);
  const monthly = getMonthlyTotal(currentDate.getFullYear(), currentDate.getMonth() + 1);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="h-[10vh] bg-white border-t border-gray-200 flex items-center justify-around px-6 shadow-sm">
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          Weekly Summary ({format(weekRange.start, 'MMM d')} - {format(weekRange.end, 'MMM d')})
        </h3>
        <div className="flex space-x-8">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Income: </span>
            <span className="text-base font-semibold tabular-nums text-emerald-600">{formatCurrency(weekly.income)}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Spending: </span>
            <span className="text-base font-semibold tabular-nums text-rose-600">{formatCurrency(weekly.spending)}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Net: </span>
            <span className={`text-base font-semibold tabular-nums ${weekly.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {weekly.profit >= 0 ? '+' : ''}{formatCurrency(weekly.profit)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          Monthly Summary ({format(currentDate, 'MMMM yyyy')})
        </h3>
        <div className="flex space-x-8">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Income: </span>
            <span className="text-base font-semibold tabular-nums text-emerald-600">{formatCurrency(monthly.income)}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Spending: </span>
            <span className="text-base font-semibold tabular-nums text-rose-600">{formatCurrency(monthly.spending)}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Net: </span>
            <span className={`text-base font-semibold tabular-nums ${monthly.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {monthly.profit >= 0 ? '+' : ''}{formatCurrency(monthly.profit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryBar;

