import React from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { getWeekRange } from '../utils/dateUtils';
import { format } from 'date-fns';

interface SummaryBarProps {
  currentDate: Date;
}

const SummaryBar: React.FC<SummaryBarProps> = ({ currentDate }) => {
  const getWeeklyTotal = useBudgetStore((state) => state.getWeeklyTotal);
  const getMonthlyTotal = useBudgetStore((state) => state.getMonthlyTotal);
  // Subscribe to days to trigger re-render when transactions change
  useBudgetStore((state) => state.days);

  const weekRange = getWeekRange(currentDate);
  
  const weekly = getWeeklyTotal(weekRange.start, weekRange.end);
  const monthly = getMonthlyTotal(currentDate.getFullYear(), currentDate.getMonth() + 1);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="h-auto md:h-auto bg-surface-1 border-t border-border-subtle flex flex-col md:flex-row items-center justify-around px-2 md:px-6 py-2 md:py-0">
      <div className="flex-1 w-full md:w-auto mb-1 md:mb-0">
        <h3 className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1 md:mb-2">
          Weekly Summary ({format(weekRange.start, 'MMM d')} - {format(weekRange.end, 'MMM d')})
        </h3>
        <div className="flex space-x-4 md:space-x-8 flex-wrap">
          <div className="text-xs">
            <span className="text-text-muted text-xs uppercase tracking-widest font-medium">Income: </span>
            <span className="text-sm md:text-base font-semibold tabular-nums text-income-green">{formatCurrency(weekly.income)}</span>
          </div>
          <div className="text-xs">
            <span className="text-text-muted text-xs uppercase tracking-widest font-medium">Spending: </span>
            <span className="text-sm md:text-base font-semibold tabular-nums text-spending-red">{formatCurrency(weekly.spending)}</span>
          </div>
          <div className="text-xs">
            <span className="text-text-muted text-xs uppercase tracking-widest font-medium">Net: </span>
            <span className={`text-sm md:text-base font-semibold tabular-nums ${
              weekly.profit > 0 ? 'text-income-green' : weekly.profit < 0 ? 'text-spending-red' : 'text-text-muted'
            }`}>
              {weekly.profit >= 0 ? '+' : ''}{formatCurrency(weekly.profit)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 w-full md:w-auto mt-1 md:mt-0">
        <h3 className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1 md:mb-2">
          Monthly Summary ({format(currentDate, 'MMMM yyyy')})
        </h3>
        <div className="flex space-x-4 md:space-x-8 flex-wrap">
          <div className="text-xs">
            <span className="text-text-muted text-xs uppercase tracking-widest font-medium">Income: </span>
            <span className="text-sm md:text-base font-semibold tabular-nums text-income-green">{formatCurrency(monthly.income)}</span>
          </div>
          <div className="text-xs">
            <span className="text-text-muted text-xs uppercase tracking-widest font-medium">Spending: </span>
            <span className="text-sm md:text-base font-semibold tabular-nums text-spending-red">{formatCurrency(monthly.spending)}</span>
          </div>
          <div className="text-xs">
            <span className="text-text-muted text-xs uppercase tracking-widest font-medium">Net: </span>
            <span className={`text-sm md:text-base font-semibold tabular-nums ${
              monthly.profit > 0 ? 'text-income-green' : monthly.profit < 0 ? 'text-spending-red' : 'text-text-muted'
            }`}>
              {monthly.profit >= 0 ? '+' : ''}{formatCurrency(monthly.profit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryBar;

