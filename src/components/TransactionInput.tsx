import React, { useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';

interface TransactionInputProps {
  type: 'income' | 'spending';
  onAdd: (amount: number, description: string, accountId?: string) => void;
}

const TransactionInput: React.FC<TransactionInputProps> = ({ type, onAdd }) => {
  const accounts = useBudgetStore((state) => state.accounts);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (numAmount > 0 && description.trim()) {
      onAdd(numAmount, description.trim(), accountId || undefined);
      setAmount('');
      setDescription('');
      setAccountId('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-2">
      {accounts.length > 0 && (
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition-all"
        >
          <option value="">Select account (optional)</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition-all"
          required
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition-all"
          required
        />
      </div>
      <button
        type="submit"
        className={`px-4 py-2 rounded-lg text-sm font-bold text-white shadow-md hover:shadow-lg transition-all flex-shrink-0 whitespace-nowrap ${
          type === 'income'
            ? 'bg-emerald-500 hover:bg-emerald-600 border-2 border-emerald-600'
            : 'bg-red-500 hover:bg-red-600 border-2 border-red-600'
        }`}
      >
        Add
      </button>
    </form>
  );
};

export default TransactionInput;

