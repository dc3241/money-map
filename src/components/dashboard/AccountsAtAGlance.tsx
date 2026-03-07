import React from 'react';
import { useBudgetStore } from '../../store/useBudgetStore';
import type { AccountType } from '../../types';

const getAccountIcon = (type: AccountType): string => {
  switch (type) {
    case 'checking': return '💳';
    case 'savings': return '💰';
    case 'credit_card': return '🏦';
    case 'investment': return '📈';
    case 'ira': return '🏛️';
    case '401k': return '🏛️';
    case 'other': return '📊';
    default: return '💳';
  }
};

const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  ira: 'IRA',
  '401k': '401(k)',
  investment: 'Investment',
  other: 'Other',
};

interface AccountsAtAGlanceProps {
  onViewAccounts?: () => void;
}

const AccountsAtAGlance: React.FC<AccountsAtAGlanceProps> = ({ onViewAccounts }) => {
  const accounts = useBudgetStore((state) => state.accounts);
  const getAccountBalance = useBudgetStore((state) => state.getAccountBalance);

  const totalBalance = accounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  return (
    <div className="bg-surface-2 border border-border-subtle rounded-xl p-4 md:p-5 flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-3">
        <span className="text-text-muted text-xs uppercase tracking-widest font-medium">
          Accounts
        </span>
        {onViewAccounts && (
          <button
            type="button"
            onClick={onViewAccounts}
            className="text-accent text-xs font-medium hover:underline"
          >
            Manage →
          </button>
        )}
      </div>
      <div className="text-xl md:text-2xl font-bold text-text-primary tabular-nums mb-3">
        {formatCurrency(totalBalance)}
      </div>
      {accounts.length === 0 ? (
        <p className="text-text-muted text-sm">No accounts yet.</p>
      ) : (
        <ul className="space-y-2 flex-1 min-h-0 overflow-y-auto">
          {accounts.slice(0, 5).map((account) => {
            const balance = getAccountBalance(account.id);
            const isCreditCard = account.type === 'credit_card';
            const displayBalance = isCreditCard ? -balance : balance;
            return (
              <li key={account.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-shrink-0">{getAccountIcon(account.type)}</span>
                  <span className="text-text-primary truncate">{account.name}</span>
                  <span className="text-text-muted text-xs flex-shrink-0">{accountTypeLabels[account.type]}</span>
                </span>
                <span className={`tabular-nums font-medium flex-shrink-0 ${
                  displayBalance >= 0 ? 'text-text-primary' : 'text-spending-red'
                }`}>
                  {displayBalance >= 0 ? '' : '-'}{formatCurrency(Math.abs(displayBalance))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AccountsAtAGlance;
