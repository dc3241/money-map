import { useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import type { AccountType } from '../types';

// Account type icon mapping
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
  const [alsoTrackAsDebt, setAlsoTrackAsDebt] = useState(true);

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
      }, newAccountType === 'credit_card' ? alsoTrackAsDebt : false);
      setNewAccountName('');
      setNewAccountType('checking');
      setNewAccountBalance('');
      setAlsoTrackAsDebt(true);
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate summary statistics
  // Credit cards are debt, so subtract them from total balance
  const totalBalance = accounts.reduce((sum, account) => {
    const balance = getAccountBalance(account.id);
    if (account.type === 'credit_card') {
      return sum - balance; // Subtract credit card balances (they're debt)
    }
    return sum + balance; // Add asset account balances
  }, 0);
  
  const largestAccount = accounts.reduce((largest, account) => {
    const balance = getAccountBalance(account.id);
    const largestBalance = getAccountBalance(largest.id);
    return balance > largestBalance ? account : largest;
  }, accounts[0]);
  
  const totalInitial = accounts.reduce((sum, account) => {
    if (account.type === 'credit_card') {
      return sum - account.initialBalance; // Subtract credit card initial balances (they're debt)
    }
    return sum + account.initialBalance; // Add asset account initial balances
  }, 0);
  const balanceChange = totalBalance - totalInitial;

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-slate-50/50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                Accounts
              </h1>
              <p className="text-gray-600 text-lg">Manage all your financial accounts in one place</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                disabled={accounts.length < 2}
              >
                Transfer
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                <span>Add Account</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {accounts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Total Balance</div>
                <div className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(totalBalance)}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Number of Accounts</div>
                <div className="text-3xl font-bold text-blue-600">{accounts.length}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Largest Account</div>
                <div className="text-lg font-bold text-gray-900 truncate">{largestAccount?.name || 'N/A'}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {largestAccount ? formatCurrency(getAccountBalance(largestAccount.id)) : ''}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Balance Change</div>
                <div className={`text-3xl font-bold ${balanceChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {balanceChange >= 0 ? '+' : ''}{formatCurrency(balanceChange)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accounts Grid */}
        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => {
              const balance = getAccountBalance(account.id);
              const balanceChange = balance - account.initialBalance;
              const icon = getAccountIcon(account.type);
              
              // Gradient colors based on account type - matching sidebar slate-900 theme
              const gradientColors = account.type === 'savings' || account.type === 'ira' || account.type === '401k'
                ? 'from-emerald-500 via-emerald-600 to-emerald-700'
                : account.type === 'investment'
                ? 'from-blue-500 via-blue-600 to-blue-700'
                : account.type === 'credit_card'
                ? 'from-red-500 via-red-600 to-red-700'
                : 'from-slate-600 via-slate-700 to-slate-800';
              
              return (
                <div
                  key={account.id}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:scale-[1.02]"
                >
                  {/* Gradient Header */}
                  <div className={`bg-gradient-to-r ${gradientColors} p-6 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                    
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-4xl">{icon}</div>
                          <div>
                            <h3 className="text-xl font-bold">{account.name}</h3>
                            <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full font-medium mt-1 inline-block">
                              {accountTypeLabels[account.type]}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeAccount(account.id)}
                          className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded-lg"
                          title="Delete account"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Balance Display */}
                      <div className="mt-6">
                        <div className="text-sm text-white/80 mb-1">
                          {account.type === 'credit_card' ? 'Amount Owed' : 'Current Balance'}
                        </div>
                        <div className="text-4xl font-bold tabular-nums">
                          {account.type === 'credit_card' 
                            ? formatCurrency(-balance) // Show credit card balance as negative (debt)
                            : formatCurrency(balance)
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-600">
                          {account.type === 'credit_card' ? 'Initial Balance Owed' : 'Initial Balance'}
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                          {account.type === 'credit_card'
                            ? formatCurrency(-account.initialBalance)
                            : formatCurrency(account.initialBalance)
                          }
                        </span>
                      </div>
                      {balanceChange !== 0 && (
                        <div className={`px-3 py-2 rounded-lg ${
                          balanceChange >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Change</span>
                            <span className="font-semibold">
                              {balanceChange >= 0 ? '+' : ''}{formatCurrency(balanceChange)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="text-8xl mb-6">💳</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Add Your First Account</h2>
              <p className="text-gray-600 text-lg mb-8">
                Start tracking your finances by adding your checking, savings, and other accounts!
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-lg"
              >
                Add Your First Account
              </button>
            </div>
          </div>
        )}

        {/* Add Account Modal */}
        {showAddModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <div 
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Add Account
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                    placeholder="e.g., Chase Checking"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Account Type
                  </label>
                  <select
                    value={newAccountType}
                    onChange={(e) => setNewAccountType(e.target.value as AccountType)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none bg-white"
                  >
                    {Object.entries(accountTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {getAccountIcon(value as AccountType)} {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {newAccountType === 'credit_card' ? 'Current Balance Owed' : 'Current Balance'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newAccountBalance}
                      onChange={(e) => setNewAccountBalance(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {newAccountType === 'credit_card' && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <input
                      type="checkbox"
                      id="trackAsDebt"
                      checked={alsoTrackAsDebt}
                      onChange={(e) => setAlsoTrackAsDebt(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="trackAsDebt" className="flex-1 text-sm text-gray-700 cursor-pointer">
                      <span className="font-semibold">Also track as debt</span>
                      <span className="block text-gray-600 mt-1">
                        Automatically add this credit card to Debt Tracking for payment management, interest tracking, and due dates.
                      </span>
                    </label>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAddAccount}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all"
                  >
                    Add Account
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewAccountName('');
                      setNewAccountBalance('');
                      setAlsoTrackAsDebt(true);
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
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
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowTransferModal(false);
              setTransferFrom('');
              setTransferTo('');
              setTransferAmount('');
              setTransferDescription('');
            }}
          >
            <div 
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Transfer Money
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From Account
                  </label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none bg-white"
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {getAccountIcon(account.type)} {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    To Account
                  </label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none bg-white"
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter((a) => a.id !== transferFrom)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {getAccountIcon(account.type)} {account.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Transfer Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-xl">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-4 text-2xl border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none font-semibold"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Transfer Date
                  </label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={transferDescription}
                    onChange={(e) => setTransferDescription(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none"
                    placeholder="e.g., Credit card payment"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleTransfer}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl font-semibold hover:from-slate-700 hover:to-slate-800 shadow-md hover:shadow-lg transition-all disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:shadow-none"
                    disabled={!transferFrom || !transferTo || !transferAmount || transferFrom === transferTo}
                  >
                    Transfer Money
                  </button>
                  <button
                    onClick={() => {
                      setShowTransferModal(false);
                      setTransferFrom('');
                      setTransferTo('');
                      setTransferAmount('');
                      setTransferDescription('');
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
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

