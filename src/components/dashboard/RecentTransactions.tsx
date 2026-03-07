import React, { useMemo } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { useBudgetStore } from '../../store/useBudgetStore';
import type { Transaction } from '../../types';

const RECENT_DAYS = 14;
const MAX_ITEMS = 15;

interface FlattenedItem {
  date: string;
  dateObj: Date;
  type: 'income' | 'spending';
  transaction: Transaction;
}

const RecentTransactions: React.FC = () => {
  const days = useBudgetStore((state) => state.days);
  const categories = useBudgetStore((state) => state.categories);

  const recent = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKeys = Object.keys(days).sort((a, b) => (a > b ? -1 : 1));
    const flattened: FlattenedItem[] = [];
    for (const dateKey of dateKeys) {
      const day = days[dateKey];
      if (!day) continue;
      const dateObj = parseISO(dateKey);
      if (subDays(today, RECENT_DAYS) > dateObj) break;
      day.income.forEach((t) => flattened.push({ date: dateKey, dateObj, type: 'income', transaction: t }));
      (day.spending || []).forEach((t) => flattened.push({ date: dateKey, dateObj, type: 'spending', transaction: t }));
    }
    flattened.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    return flattened.slice(0, MAX_ITEMS);
  }, [days]);

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId)?.name ?? null;
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  if (recent.length === 0) {
    return (
      <div className="bg-surface-2 border border-border-subtle rounded-xl p-4 md:p-5">
        <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-3">
          Recent transactions
        </div>
        <p className="text-text-muted text-sm">No recent transactions.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-2 border border-border-subtle rounded-xl p-4 md:p-5 flex flex-col min-h-0">
      <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-3">
        Recent transactions
      </div>
      <ul className="space-y-2 overflow-y-auto min-h-0">
        {recent.map((item) => {
          const catName = getCategoryName(item.transaction.category);
          return (
            <li key={`${item.date}-${item.transaction.id}`} className="flex items-center justify-between gap-2 py-1.5 border-b border-border-subtle last:border-0">
              <div className="min-w-0 flex-1">
                <div className="text-text-primary text-sm font-medium truncate">{item.transaction.description}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-text-muted text-xs">{format(item.dateObj, 'EEE, MMM d')}</span>
                  {catName && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface-3 text-text-secondary">
                      {catName}
                    </span>
                  )}
                </div>
              </div>
              <span className={`tabular-nums font-medium flex-shrink-0 text-sm ${
                item.type === 'income' ? 'text-income-green' : 'text-spending-red'
              }`}>
                {item.type === 'income' ? '+' : ''}{formatCurrency(item.transaction.amount)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default RecentTransactions;
