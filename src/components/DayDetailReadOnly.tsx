import React from "react";
import { format } from "date-fns";
import { usePlaidActualsOptional } from "../context/PlaidActualsContext";
import { usePlaidRangeTransactionsState } from "../context/PlaidRangeTransactionsContext";
import {
  plaidDailyTotal,
  plaidIncomeOnDate,
  plaidExcludedInflowOnDate,
  plaidSpendingOnDate,
  formatPlaidIncomeLabel,
  formatPlaidSpendingLabel,
} from "../utils/plaidAggregates";

interface DayDetailReadOnlyProps {
  date: Date;
  onClose: () => void;
}

/**
 * Read-only day breakdown for bank-linked users (Plaid transactions only).
 */
const DayDetailReadOnly: React.FC<DayDetailReadOnlyProps> = ({ date, onClose }) => {
  const ctx = usePlaidActualsOptional();
  const { transactions, accountTypeByAccountId } = usePlaidRangeTransactionsState();
  if (!ctx?.usePlaidForActuals) return null;
  const dateKey = format(date, "yyyy-MM-dd");
  const totals = plaidDailyTotal(transactions, dateKey, accountTypeByAccountId);
  const incomeList = plaidIncomeOnDate(transactions, dateKey, accountTypeByAccountId);
  const excludedInflow = plaidExcludedInflowOnDate(
    transactions,
    dateKey,
    accountTypeByAccountId
  );
  const spendingList = plaidSpendingOnDate(transactions, dateKey);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="day-readonly-title"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 id="day-readonly-title" className="text-2xl font-bold text-gray-900">
              {format(date, "EEEE, MMMM d, yyyy")}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Bank activity (Plaid). Editing is disabled.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold flex-shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="border-l-4 border-emerald-500 bg-emerald-50/50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Income</h3>
            <p className="text-lg font-semibold text-emerald-700 tabular-nums mb-3">
              {formatCurrency(totals.income)}
            </p>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {incomeList.length === 0 ? (
                <li className="text-sm text-gray-500">None</li>
              ) : (
                incomeList.map((tx) => (
                  <li key={tx.transaction_id} className="text-sm border-b border-emerald-100 pb-1">
                    <div className="font-medium text-emerald-800 tabular-nums">
                      {formatCurrency(Math.abs(tx.amount))}
                    </div>
                    <div className="text-gray-600 truncate">{formatPlaidIncomeLabel(tx)}</div>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="border-l-4 border-rose-500 bg-rose-50/50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Spending</h3>
            <p className="text-lg font-semibold text-rose-700 tabular-nums mb-3">
              {formatCurrency(totals.spending)}
            </p>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {spendingList.length === 0 ? (
                <li className="text-sm text-gray-500">None</li>
              ) : (
                spendingList.map((tx) => (
                  <li key={tx.transaction_id} className="text-sm border-b border-rose-100 pb-1">
                    <div className="font-medium text-rose-800 tabular-nums">
                      {formatCurrency(tx.amount)}
                    </div>
                    <div className="text-gray-600 truncate">{formatPlaidSpendingLabel(tx)}</div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {excludedInflow.length > 0 && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Payments & internal transfers (not counted as income)
            </h3>
            <ul className="space-y-2 max-h-36 overflow-y-auto">
              {excludedInflow.map((tx) => (
                <li
                  key={tx.transaction_id}
                  className="text-sm flex justify-between gap-2 border-b border-gray-200 pb-1 last:border-0"
                >
                  <span className="text-gray-600 truncate">
                    {formatPlaidIncomeLabel(tx)}
                  </span>
                  <span className="tabular-nums text-gray-700 flex-shrink-0">
                    {formatCurrency(Math.abs(tx.amount))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          className={`rounded-lg p-4 text-center border ${
            totals.profit >= 0 ? "border-emerald-200 bg-emerald-50/30" : "border-rose-200 bg-rose-50/30"
          }`}
        >
          <div className="text-sm text-gray-600 mb-1 font-medium uppercase tracking-wide">Daily net</div>
          <div
            className={`text-2xl font-semibold tabular-nums ${
              totals.profit >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {totals.profit >= 0 ? "+" : ""}
            {formatCurrency(totals.profit)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayDetailReadOnly;
