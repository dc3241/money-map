import React from 'react';
import { format } from 'date-fns';
import { useBudgetStore } from '../store/useBudgetStore';
import { usePlaidActuals } from '../context/PlaidActualsContext';
import { usePlaidRangeTransactionsState } from '../context/PlaidRangeTransactionsContext';
import {
  plaidDailyTotal,
  plaidIncomeOnDate,
  plaidSpendingOnDate,
  formatPlaidIncomeLabel,
  formatPlaidSpendingLabel,
} from '../utils/plaidAggregates';

interface WeekDayBoxProps {
  date: Date;
  onClick: () => void;
  isToday?: boolean;
}

const WeekDayBox: React.FC<WeekDayBoxProps> = ({ date, onClick, isToday = false }) => {
  const days = useBudgetStore((state) => state.days);
  const getDailyTotal = useBudgetStore((state) => state.getDailyTotal);
  const { transactions } = usePlaidRangeTransactionsState();
  const { usePlaidForActuals } = usePlaidActuals();

  const dateKey = format(date, 'yyyy-MM-dd');
  const dayData = days[dateKey] || { date: dateKey, income: [], spending: [], transfers: [] };
  const storeTotals = getDailyTotal(dateKey);
  const plaidTotals = plaidDailyTotal(transactions, dateKey);
  const totals = usePlaidForActuals ? plaidTotals : storeTotals;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const incomeTxs = usePlaidForActuals
    ? plaidIncomeOnDate(transactions, dateKey)
    : null;
  const spendingTxs = usePlaidForActuals
    ? plaidSpendingOnDate(transactions, dateKey)
    : null;

  return (
    <div
      className={`
        relative rounded-xl px-2 py-1 md:p-4 min-h-0 w-full max-w-full min-w-0 cursor-pointer 
        transition-all duration-200 flex flex-col box-border border
        ${isToday ? 'border-2 border-accent bg-surface-3' : 'bg-surface-2 border-border-subtle hover:border-border-hover hover:bg-surface-3'}
      `}
      style={{ maxWidth: '100%', height: '100%', maxHeight: '100%' }}
      onClick={onClick}
    >
      {/* Day Header */}
      <div className="flex flex-col gap-0.5 mb-2 flex-shrink-0 border-b border-border-subtle pb-1 md:pb-2">
        <div>
          <div className="text-text-muted text-xs uppercase tracking-widest font-medium truncate">
            {format(date, 'EEEE')}
          </div>
          <div className="text-text-secondary text-xs truncate">
            {format(date, 'MMM d')}
          </div>
        </div>
        <div className={`text-xs font-semibold text-right tabular-nums ${
          totals.profit > 0
            ? 'text-income-green'
            : totals.profit < 0
              ? 'text-spending-red'
              : 'text-text-muted'
        }`}>
          {totals.profit >= 0 ? '+' : ''}{formatCurrency(totals.profit)}
        </div>
      </div>
      
      <div className="flex flex-col gap-2 md:gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Income Section */}
        <div className="border-l-2 border-income-green bg-income-green-dim rounded-md p-2 flex-1 min-h-0 flex flex-col">
          <div className="flex flex-col gap-0.5 mb-1.5">
            <div className="text-text-muted text-xs uppercase tracking-widest font-medium">
              Income
            </div>
            <div className="text-income-green text-xs font-semibold tabular-nums">
              {formatCurrency(totals.income)}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {usePlaidForActuals ? (
              incomeTxs && incomeTxs.length > 0 ? (
                <div className="space-y-1 md:space-y-2 min-w-0">
                  {incomeTxs.map((tx) => (
                    <div key={tx.transaction_id} className="bg-income-green-dim rounded-md px-1.5 py-1 min-w-0 overflow-hidden">
                      <div className="font-semibold text-xs tabular-nums text-income-green">
                        {formatCurrency(Math.abs(tx.amount))}
                      </div>
                      <div className="text-text-muted text-xs truncate">
                        {formatPlaidIncomeLabel(tx)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-text-muted text-xs italic">No income entries</div>
              )
            ) : dayData.income.length > 0 ? (
              <div className="space-y-1 md:space-y-2 min-w-0">
                {dayData.income.map((transaction) => (
                  <div key={transaction.id} className="bg-income-green-dim rounded-md px-1.5 py-1 min-w-0 overflow-hidden">
                    <div className="font-semibold text-xs tabular-nums text-income-green">
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-text-muted text-xs truncate">
                      {transaction.description}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-text-muted text-xs italic">No income entries</div>
            )}
          </div>
        </div>

        <div className="border-t border-border-subtle my-1.5" />

        {/* Spending Section */}
        <div className="border-l-2 border-spending-red bg-spending-red-dim rounded-md p-2 flex-1 min-h-0 flex flex-col">
          <div className="flex flex-col gap-0.5 mb-1.5">
            <div className="text-text-muted text-xs uppercase tracking-widest font-medium">
              Spending
            </div>
            <div className="text-spending-red text-xs font-semibold tabular-nums">
              {formatCurrency(totals.spending)}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {usePlaidForActuals ? (
              spendingTxs && spendingTxs.length > 0 ? (
                <div className="space-y-1 md:space-y-2 min-w-0">
                  {spendingTxs.map((tx) => (
                    <div key={tx.transaction_id} className="bg-spending-red-dim rounded-md px-1.5 py-1 min-w-0 overflow-hidden">
                      <div className="font-semibold text-xs tabular-nums text-spending-red">
                        {formatCurrency(tx.amount)}
                      </div>
                      <div className="text-text-muted text-xs truncate">
                        {formatPlaidSpendingLabel(tx)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-text-muted text-xs italic">No spending entries</div>
              )
            ) : dayData.spending.length > 0 ? (
              <div className="space-y-1 md:space-y-2 min-w-0">
                {dayData.spending.map((transaction) => (
                  <div key={transaction.id} className="bg-spending-red-dim rounded-md px-1.5 py-1 min-w-0 overflow-hidden">
                    <div className="font-semibold text-xs tabular-nums text-spending-red">
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-text-muted text-xs truncate">
                      {transaction.description}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-text-muted text-xs italic">No spending entries</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekDayBox;
