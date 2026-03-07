import React, { useMemo } from 'react';
import { useBudgetStore } from '../../store/useBudgetStore';

interface DebtPayoffSnapshotProps {
  year: number;
  month: number;
  onViewDebt?: () => void;
}

const DebtPayoffSnapshot: React.FC<DebtPayoffSnapshotProps> = ({ year, month, onViewDebt }) => {
  const debts = useBudgetStore((state) => state.debts);
  const debtPayments = useBudgetStore((state) => state.debtPayments);

  const paidThisMonth = useMemo(() => {
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return debtPayments
      .filter((p) => p.date >= monthStart && p.date <= monthEnd)
      .reduce((sum, p) => sum + p.amount, 0);
  }, [debtPayments, year, month]);

  const totalDebt = useMemo(
    () => debts.reduce((sum, d) => sum + d.currentBalance, 0),
    [debts]
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  return (
    <div className="bg-surface-2 border border-border-subtle rounded-xl p-4 md:p-5 flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-3">
        <span className="text-text-muted text-xs uppercase tracking-widest font-medium">
          Debt Payoff
        </span>
        {onViewDebt && (
          <button
            type="button"
            onClick={onViewDebt}
            className="text-accent text-xs font-medium hover:underline"
          >
            Details →
          </button>
        )}
      </div>
      <div className="flex justify-between items-baseline mb-3">
        <div>
          <div className="text-text-muted text-xs uppercase">Total debt</div>
          <div className="text-lg font-bold text-text-primary tabular-nums">{formatCurrency(totalDebt)}</div>
        </div>
        <div className="text-right">
          <div className="text-text-muted text-xs uppercase">Paid off</div>
          <div className="text-lg font-bold text-income-green tabular-nums">{formatCurrency(paidThisMonth)}</div>
          <div className="text-text-muted text-xs">this month</div>
        </div>
      </div>
      {debts.length === 0 ? (
        <p className="text-text-muted text-sm">No debts tracked.</p>
      ) : (
        <ul className="space-y-2 flex-1 min-h-0 overflow-y-auto">
          {debts.slice(0, 4).map((debt) => {
            const paid = debt.principalAmount - debt.currentBalance;
            const pctPaid = debt.principalAmount > 0 ? (paid / debt.principalAmount) * 100 : 0;
            const increased = debt.currentBalance > debt.principalAmount;
            return (
              <li key={debt.id} className="text-sm">
                <div className="flex justify-between items-baseline">
                  <span className="text-text-primary truncate">{debt.name}</span>
                  <span className="text-text-primary tabular-nums font-medium flex-shrink-0 ml-2">
                    {formatCurrency(debt.currentBalance)}
                  </span>
                </div>
                <div className={`text-xs mt-0.5 ${increased ? 'text-spending-red' : 'text-text-muted'}`}>
                  {increased ? 'Over principal (increased)' : `${Math.round(pctPaid)}% paid`}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default DebtPayoffSnapshot;
