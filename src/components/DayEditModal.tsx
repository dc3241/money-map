import React, { useState } from 'react';
import { format } from 'date-fns';
import { useBudgetStore } from '../store/useBudgetStore';
import TransactionInput from './TransactionInput';
import type { Transaction } from '../types';

interface DayEditModalProps {
  date: Date;
  onClose: () => void;
}

const DayEditModal: React.FC<DayEditModalProps> = ({ date, onClose }) => {
  // Subscribe to the days object directly so component re-renders when transactions are added
  const days = useBudgetStore((state) => state.days);
  const addTransaction = useBudgetStore((state) => state.addTransaction);
  const removeTransaction = useBudgetStore((state) => state.removeTransaction);
  const updateTransaction = useBudgetStore((state) => state.updateTransaction);
  const getDailyTotal = useBudgetStore((state) => state.getDailyTotal);

  const categories = useBudgetStore((state) => state.categories);
  const accounts = useBudgetStore((state) => state.accounts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editAccountId, setEditAccountId] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');

  const dateKey = format(date, 'yyyy-MM-dd');
  // Get dayData from the subscribed days object
  const dayData = days[dateKey] || { date: dateKey, income: [], spending: [], transfers: [] };
  const totals = getDailyTotal(dateKey);

  const handleAddIncome = (amount: number, description: string, accountId?: string, categoryId?: string) => {
    const transaction: Transaction = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'income',
      amount,
      description,
      accountId,
      category: categoryId,
    };
    addTransaction(dateKey, transaction);
  };

  const handleAddSpending = (amount: number, description: string, accountId?: string, categoryId?: string) => {
    const transaction: Transaction = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'spending',
      amount,
      description,
      accountId,
      category: categoryId,
    };
    addTransaction(dateKey, transaction);
  };

  const handleRemove = (transactionId: string) => {
    removeTransaction(dateKey, transactionId);
    if (editingId === transactionId) {
      setEditingId(null);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditAmount(transaction.amount.toString());
    setEditDescription(transaction.description);
    setEditCategory(transaction.category || '');
    setEditAccountId(transaction.accountId || '');
    setEditDate(dateKey); // Initialize with current date
  };

  const handleSaveEdit = (transactionId: string) => {
    const numAmount = parseFloat(editAmount);
    if (numAmount > 0 && editDescription.trim() && editDate) {
      const newDateKey = editDate;
      
      // If date changed, we need to move the transaction
      if (newDateKey !== dateKey) {
        // Get the original transaction
        const originalTransaction = [...dayData.income, ...dayData.spending, ...(dayData.transfers || [])]
          .find(t => t.id === transactionId);
        
        if (originalTransaction) {
          // Remove from old date
          removeTransaction(dateKey, transactionId);
          
          // Add to new date with updated values
          // If this was a recurring transaction, convert it to a manual transaction
          // by clearing the recurring flags and generating a new ID
          const updatedTransaction: Transaction = {
            ...originalTransaction,
            id: originalTransaction.isRecurring 
              ? `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Generate new ID for moved recurring transactions
              : originalTransaction.id, // Keep original ID for non-recurring transactions
            amount: numAmount,
            description: editDescription.trim(),
            category: editCategory || undefined,
            accountId: editAccountId || undefined,
            // Clear recurring flags if this was a recurring transaction being moved
            // This prevents populateRecurringForMonth from recreating it at the original date
            isRecurring: originalTransaction.isRecurring ? undefined : originalTransaction.isRecurring,
            recurringId: originalTransaction.isRecurring ? undefined : originalTransaction.recurringId,
          };
          addTransaction(newDateKey, updatedTransaction);
        }
      } else {
        // Same date, just update normally
        updateTransaction(dateKey, transactionId, {
          amount: numAmount,
          description: editDescription.trim(),
          category: editCategory || undefined,
          accountId: editAccountId || undefined,
        });
      }
      
      setEditingId(null);
      setEditAmount('');
      setEditDescription('');
      setEditCategory('');
      setEditAccountId('');
      setEditDate('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
    setEditDescription('');
    setEditCategory('');
    setEditAccountId('');
    setEditDate('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-2xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{format(date, 'EEEE, MMMM d, yyyy')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 min-w-0">
          {/* Income Section */}
          <div className="border-l-4 border-emerald-500 bg-white rounded-lg p-4 shadow-md min-w-0 flex flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Income</h3>
            <TransactionInput type="income" onAdd={handleAddIncome} />
            <div className="space-y-2 max-h-48 overflow-y-auto flex-1 min-h-0">
              {dayData.income.map((transaction) => {
                const isRecurring = transaction.isRecurring || !!transaction.recurringId;
                return (
                  <div
                    key={transaction.id}
                    className="bg-white rounded p-2 flex flex-col gap-2 min-w-0"
                  >
                    {editingId === transaction.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="px-2 py-1 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-400"
                      />
                      {accounts.length > 0 && (
                        <select
                          value={editAccountId}
                          onChange={(e) => setEditAccountId(e.target.value)}
                          className="px-2 py-1 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-400"
                        >
                          <option value="">No account</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="px-2 py-1 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-400"
                        placeholder="Amount"
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="px-2 py-1 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-400"
                        placeholder="Description"
                      />
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="px-2 py-1 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-400"
                      >
                        <option value="">No category</option>
                        {categories.filter(c => c.type === 'income').map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.icon || '📌'} {category.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(transaction.id)}
                          className="flex-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded font-semibold transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold tabular-nums text-emerald-600">{formatCurrency(transaction.amount)}</div>
                        <div className="text-xs text-gray-600 truncate">{transaction.description}</div>
                        {isRecurring && (
                          <div className="text-xs text-blue-500 italic">Recurring transaction</div>
                        )}
                        {transaction.accountId && (
                          <div className="text-xs text-gray-500">
                            {accounts.find(a => a.id === transaction.accountId)?.name || 'Unknown account'}
                          </div>
                        )}
                        {transaction.category && (
                          <div className="text-xs text-gray-500">
                            {categories.find(c => c.id === transaction.category)?.name || transaction.category}
                          </div>
                        )}
                      </div>
                      {/* Allow editing/deleting recurring transactions - account balances update automatically */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-blue-500 hover:text-blue-700 text-sm whitespace-nowrap"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemove(transaction.id)}
                          className="text-red-500 hover:text-red-700 text-sm whitespace-nowrap"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                );
              })}
              {dayData.income.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">No income entries</div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="font-semibold text-emerald-600 tabular-nums">
                Total: {formatCurrency(totals.income)}
              </div>
            </div>
          </div>

          {/* Spending Section */}
          <div className="border-l-4 border-rose-500 bg-white rounded-lg p-4 shadow-md min-w-0 flex flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Spending</h3>
            <TransactionInput type="spending" onAdd={handleAddSpending} />
            <div className="space-y-2 max-h-48 overflow-y-auto flex-1 min-h-0">
              {dayData.spending.map((transaction) => {
                const isRecurring = transaction.isRecurring || !!transaction.recurringId;
                return (
                  <div
                    key={transaction.id}
                    className="bg-white rounded p-2 flex flex-col gap-2 min-w-0"
                  >
                    {editingId === transaction.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="px-2 py-1 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-red-400"
                      />
                      {accounts.length > 0 && (
                        <select
                          value={editAccountId}
                          onChange={(e) => setEditAccountId(e.target.value)}
                          className="px-2 py-1 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-red-400"
                        >
                          <option value="">No account</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="px-2 py-1 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-red-400"
                        placeholder="Amount"
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="px-2 py-1 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-red-400"
                        placeholder="Description"
                      />
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="px-2 py-1 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-red-400"
                      >
                        <option value="">No category</option>
                        {categories.filter(c => c.type === 'expense').map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.icon || '📌'} {category.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(transaction.id)}
                          className="flex-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded font-semibold transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold tabular-nums text-rose-600">{formatCurrency(transaction.amount)}</div>
                        <div className="text-xs text-gray-600 truncate">{transaction.description}</div>
                        {isRecurring && (
                          <div className="text-xs text-blue-500 italic">Recurring transaction</div>
                        )}
                        {transaction.accountId && (
                          <div className="text-xs text-gray-500">
                            {accounts.find(a => a.id === transaction.accountId)?.name || 'Unknown account'}
                          </div>
                        )}
                        {transaction.category && (
                          <div className="text-xs text-gray-500">
                            {categories.find(c => c.id === transaction.category)?.name || transaction.category}
                          </div>
                        )}
                      </div>
                      {/* Allow editing/deleting recurring transactions - account balances update automatically */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-blue-500 hover:text-blue-700 text-sm whitespace-nowrap"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemove(transaction.id)}
                          className="text-red-500 hover:text-red-700 text-sm whitespace-nowrap"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                );
              })}
              {dayData.spending.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">No spending entries</div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="font-semibold text-rose-600 tabular-nums">
                Total: {formatCurrency(totals.spending)}
              </div>
            </div>
          </div>

          {/* Transfers Section */}
          <div className="border-l-4 border-blue-500 bg-white rounded-lg p-4 shadow-md min-w-0 flex flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Transfers</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto flex-1 min-h-0">
              {(dayData.transfers || []).map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-white rounded p-2 flex flex-col gap-2 min-w-0 border border-blue-100"
                >
                  {editingId === transaction.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="px-2 py-1 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-blue-400"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="px-2 py-1 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-blue-400"
                        placeholder="Amount"
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="px-2 py-1 border-2 border-gray-300 rounded text-sm focus:outline-none focus:border-blue-400"
                        placeholder="Description"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(transaction.id)}
                          className="flex-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-semibold transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold tabular-nums text-blue-600">{formatCurrency(transaction.amount)}</div>
                        <div className="text-xs text-gray-600 truncate">{transaction.description}</div>
                        {transaction.accountId && transaction.transferToAccountId && (
                          <div className="text-xs text-gray-500">
                            {accounts.find(a => a.id === transaction.accountId)?.name || 'Unknown'} → {accounts.find(a => a.id === transaction.transferToAccountId)?.name || 'Unknown'}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-blue-500 hover:text-blue-700 text-sm whitespace-nowrap"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemove(transaction.id)}
                          className="text-red-500 hover:text-red-700 text-sm whitespace-nowrap"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(dayData.transfers || []).length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">No transfers</div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Included in spending total</div>
              <div className="font-semibold text-blue-600 tabular-nums text-sm">
                Total: {formatCurrency((dayData.transfers || []).reduce((sum, t) => sum + t.amount, 0))}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Profit/Loss */}
        <div className={`rounded-lg p-4 text-center border border-gray-200 shadow-md bg-gray-50 ${
          totals.profit >= 0 
            ? '' 
            : ''
        }`}>
          <div className="text-sm text-gray-600 mb-1 font-semibold uppercase tracking-wide">Daily Net</div>
          <div className={`text-2xl font-semibold tabular-nums ${
            totals.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {totals.profit >= 0 ? '+' : ''}{formatCurrency(totals.profit)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayEditModal;

