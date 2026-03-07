import React, { useMemo } from 'react';
import { useBudgetStore } from '../../store/useBudgetStore';
import { format } from 'date-fns';

interface BudgetSnapshotProps {
  year: number;
  month: number;
  onViewBudgets?: () => void;
}

const BudgetSnapshot: React.FC<BudgetSnapshotProps> = ({ year, month, onViewBudgets }) => {
  const budgets = useBudgetStore((state) => state.budgets);
  const categories = useBudgetStore((state) => state.categories);
  const getBudgetStatus = useBudgetStore((state) => state.getBudgetStatus);

  const monthBudgets = useMemo(() =>
    budgets.filter(
      (b) =>
        (b.period === 'monthly' && b.year === year && b.month === month) ||
        (b.period === 'yearly' && b.year === year)
    ),
    [budgets, year, month]
  );

  const { totalLimit, totalSpent, percentage } = useMemo(() => {
    let limit = 0;
    let spent = 0;
    monthBudgets.forEach((b) => {
      const status = getBudgetStatus(b.id, year, month);
      limit += status.limit;
      spent += status.spent;
    });
    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    return { totalLimit: limit, totalSpent: spent, percentage: pct };
  }, [monthBudgets, getBudgetStatus, year, month]);

  const categoryLines = useMemo(() => {
    return monthBudgets
      .map((b) => {
        const cat = categories.find((c) => c.id === b.categoryId);
        const status = getBudgetStatus(b.id, year, month);
        return {
          name: cat?.name ?? 'Unknown',
          spent: status.spent,
          limit: status.limit,
          over: status.percentage > 100,
        };
      })
      .filter((l) => l.limit > 0)
      .slice(0, 5);
  }, [monthBudgets, categories, getBudgetStatus, year, month]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  const isOverBudget = totalLimit > 0 && totalSpent > totalLimit;

  return (
    <div className="bg-surface-2 border border-border-subtle rounded-xl p-4 md:p-5 flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-3">
        <span className="text-text-muted text-xs uppercase tracking-widest font-medium">
          Budget — {format(new Date(year, month - 1), 'MMMM')}
        </span>
        {onViewBudgets && (
          <button
            type="button"
            onClick={onViewBudgets}
            className="text-accent text-xs font-medium hover:underline"
          >
            Manage →
          </button>
        )}
      </div>
      {monthBudgets.length === 0 ? (
        <p className="text-text-muted text-sm">No budgets for this month.</p>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative w-12 h-12 flex-shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  strokeWidth="2"
                  style={{ stroke: 'rgba(255,255,255,0.12)' }}
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${Math.min(percentage, 100)} 100`}
                  className={isOverBudget ? 'text-spending-red' : 'text-accent'}
                />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-text-primary tabular-nums">
                {formatCurrency(totalSpent)}
              </div>
              <div className="text-text-muted text-xs">
                of {formatCurrency(totalLimit)} budget limit
              </div>
              {isOverBudget && (
                <div className="text-spending-red text-xs font-medium mt-0.5">
                  ▲ Over budget – {Math.round(percentage)}%
                </div>
              )}
            </div>
          </div>
          {categoryLines.length > 0 && (
            <div className="space-y-2 border-t border-border-subtle pt-3">
              {categoryLines.map((line, i) => (
                <div key={i} className="flex justify-between items-baseline text-sm">
                  <span className="text-text-secondary truncate">{line.name}</span>
                  <span className="flex-shrink-0 ml-2">
                    <span className={line.over ? 'text-spending-red' : 'text-text-primary'}>{formatCurrency(line.spent)}</span>
                    <span className="text-text-muted text-xs"> of {formatCurrency(line.limit)}{line.over ? ' – Over budget' : ''}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BudgetSnapshot;
