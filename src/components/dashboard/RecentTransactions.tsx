import React, { useMemo } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { useBudgetStore } from '../../store/useBudgetStore';
import type { Transaction } from '../../types';
import { usePlaidActuals } from '../../context/PlaidActualsContext';
import { usePlaidRangeTransactionsState } from '../../context/PlaidRangeTransactionsContext';
import { plaidRecentRowKind } from '../../utils/plaidAggregates';

const RECENT_DAYS = 14;

interface FlattenedItem {
  date: string;
  dateObj: Date;
  type: 'income' | 'spending';
  transaction: Transaction;
}

interface Props {
  limit?: number;
}

const RecentTransactions: React.FC<Props> = ({ limit }) => {
  const { transactions: plaidTransactions, accountTypeByAccountId } =
    usePlaidRangeTransactionsState();
  const { usePlaidForActuals } = usePlaidActuals();
  const days = useBudgetStore((state) => state.days);
  const categories = useBudgetStore((state) => state.categories);

  const recentFromPlaid = useMemo(() => {
    const cap = limit ?? 50;
    const sorted = [...plaidTransactions].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0
    );
    return sorted.slice(0, cap).map((tx) => ({
      date: tx.date,
      dateObj: parseISO(tx.date),
      kind: plaidRecentRowKind(tx, accountTypeByAccountId),
      amount: Math.abs(tx.amount),
      name: tx.merchant_name ?? tx.name ?? 'Transaction',
      category: tx.category_primary ?? (Array.isArray(tx.category) ? tx.category[0] : null),
    }));
  }, [plaidTransactions, limit, accountTypeByAccountId]);

  const usePlaid = usePlaidForActuals;

  const recentFromStore = useMemo(() => {
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
    return flattened;
  }, [days]);

  const displayList = usePlaid
    ? recentFromPlaid.slice(0, limit ?? recentFromPlaid.length)
    : (limit !== undefined ? recentFromStore.slice(0, limit) : recentFromStore);
  const showViewAll = usePlaid
    ? (limit != null && recentFromPlaid.length > limit)
    : (limit !== undefined && recentFromStore.length > limit);

  const getCategoryName = (categoryId?: string | null) => {
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId)?.name ?? categoryId;
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  if (displayList.length === 0 && !showViewAll) {
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
        {usePlaid
          ? (displayList as typeof recentFromPlaid).map((item, i) => {
              const catName = getCategoryName(item.category);
              return (
                <li key={`${item.date}-${i}`} className="flex items-center justify-between gap-2 py-1.5 border-b border-border-subtle last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-text-primary text-sm font-medium truncate">{item.name}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-text-muted text-xs">{format(item.dateObj, 'EEE, MMM d')}</span>
                      {catName && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-surface-3 text-text-secondary">
                          {catName}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`tabular-nums font-medium flex-shrink-0 text-sm ${
                      item.kind === 'income'
                        ? 'text-income-green'
                        : item.kind === 'spending'
                          ? 'text-spending-red'
                          : 'text-text-secondary'
                    }`}
                  >
                    {item.kind === 'income' ? '+' : item.kind === 'spending' ? '' : '↔ '}
                    {formatCurrency(item.amount)}
                  </span>
                </li>
              );
            })
          : (displayList as FlattenedItem[]).map((item) => {
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
      {showViewAll && (
        <button
          type="button"
          className="w-full mt-3 py-2 text-xs text-accent hover:opacity-80 transition-opacity text-center"
        >
          View all transactions →
        </button>
      )}
    </div>
  );
};

export default RecentTransactions;
