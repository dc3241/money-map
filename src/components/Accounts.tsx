import { useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import type { AccountType } from '../types';

const Accounts: React.FC = () => {
  const accounts = useBudgetStore((state) => state.accounts);
  const addAccount = useBudgetStore((state) => state.addAccount);
  const removeAccount = useBudgetStore((state) => state.removeAccount);
  const getAccountBalance = useBudgetStore((state) => state.getAccountBalance);
  const transferBetweenAccounts = useBudgetStore((state) => state.transferBetweenAccounts);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // Add account form state
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<AccountType>('checking');
  const [newAccountBalance, setNewAccountBalance] = useState('');

  // Transfer form state
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);

  const accountTypeLabels: Record<AccountType, string> = {
    checking: 'Checking',
    savings: 'Savings',
    credit_card: 'Credit Card',
    ira: 'IRA',
    '401k': '401(k)',
    investment: 'Investment',
    other: 'Other',
  };

  const handleAddAccount = () => {
    const balance = parseFloat(newAccountBalance);
    if (newAccountName.trim() && !isNaN(balance)) {
      addAccount({
        name: newAccountName.trim(),
        type: newAccountType,
        initialBalance: balance,
      });
      setNewAccountName('');
      setNewAccountType('checking');
      setNewAccountBalance('');
      setShowAddModal(false);
    }
  };

  const handleTransfer = () => {
    const amount = parseFloat(transferAmount);
    if (transferFrom && transferTo && amount > 0 && transferFrom !== transferTo) {
      transferBetweenAccounts(
        transferDate,
        transferFrom,
        transferTo,
        amount,
        transferDescription || undefined
      );
      setTransferFrom('');
      setTransferTo('');
      setTransferAmount('');
      setTransferDescription('');
      setTransferDate(new Date().toISOString().split('T')[0]);
      setShowTransferModal(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTransferModal(true)}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={accounts.length < 2}
            >
              Transfer
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors"
            >
              Add Account
            </button>
          </div>
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const balance = getAccountBalance(account.id);
            return (
              <div
                key={account.id}
                className="bg-white rounded-lg p-6 shadow-md border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{account.name}</h3>
                    <p className="text-sm text-gray-500">{accountTypeLabels[account.type]}</p>
                  </div>
                  <button
                    onClick={() => removeAccount(account.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-2xl font-bold tabular-nums mb-4">
                  {formatCurrency(balance)}
                </div>
                <div className="text-xs text-gray-500">
                  Initial: {formatCurrency(account.initialBalance)}
                </div>
              </div>
            );
          })}
        </div>

        {accounts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No accounts yet</p>
            <p className="text-sm">Add your first account to get started</p>
          </div>
        )}

        {/* Add Account Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">Add Account</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-400"
                    placeholder="e.g., Chase Checking"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Type
                  </label>
                  <select
                    value={newAccountType}
                    onChange={(e) => setNewAccountType(e.target.value as AccountType)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-400"
                  >
                    {Object.entries(accountTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAccountBalance}
                    onChange={(e) => setNewAccountBalance(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-400"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddAccount}
                    className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewAccountName('');
                      setNewAccountBalance('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">Transfer Money</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Account
                  </label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Account
                  </label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter((a) => a.id !== transferFrom)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-400"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={transferDescription}
                    onChange={(e) => setTransferDescription(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-400"
                    placeholder="e.g., Credit card payment"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleTransfer}
                    className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={!transferFrom || !transferTo || !transferAmount || transferFrom === transferTo}
                  >
                    Transfer
                  </button>
                  <button
                    onClick={() => {
                      setShowTransferModal(false);
                      setTransferFrom('');
                      setTransferTo('');
                      setTransferAmount('');
                      setTransferDescription('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Accounts;

