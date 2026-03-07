import React from 'react';
import { useBudgetStore } from '../../store/useBudgetStore';
import { format } from 'date-fns';

interface MonthSummaryCardProps {
  year: number;
  month: number;
}

const MonthSummaryCard: React.FC<MonthSummaryCardProps> = ({ year, month }) => {
  const getMonthlyTotal = useBudgetStore((state) => state.getMonthlyTotal);
  const monthly = getMonthlyTotal(year, month);

  const income = monthly.income;
  const spending = monthly.spending;
  const net = monthly.profit;
  const savingsRate = income > 0 ? ((income - spending) / income) * 100 : null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  return (
    <div className="bg-surface-2 border border-border-subtle rounded-xl p-4 md:p-5">
      <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-3">
        {format(new Date(year, month - 1), 'MMMM yyyy')}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-text-muted text-xs">Income</div>
          <div className="text-income-green font-semibold tabular-nums">{formatCurrency(income)}</div>
        </div>
        <div>
          <div className="text-text-muted text-xs">Spending</div>
          <div className="text-spending-red font-semibold tabular-nums">{formatCurrency(spending)}</div>
        </div>
        <div>
          <div className="text-text-muted text-xs">Net</div>
          <div className={`font-semibold tabular-nums ${net >= 0 ? 'text-income-green' : 'text-spending-red'}`}>
            {net >= 0 ? '+' : ''}{formatCurrency(net)}
          </div>
        </div>
      </div>
      {savingsRate !== null && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-muted">Savings rate</span>
            <span className="text-text-primary font-medium">{Math.round(savingsRate)}%</span>
          </div>
          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-income-green rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthSummaryCard;
