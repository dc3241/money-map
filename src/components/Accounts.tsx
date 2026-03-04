import { useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import type { AccountType, Account } from '../types';
import PlaidLink from './PlaidLink';

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
  // Subscribe to days so component re-renders when transactions are added/updated
  const days = useBudgetStore((state) => state.days);
  // Ensure days is tracked by referencing it (prevents unused var warning while maintaining subscription)
  void days;
  const accounts = useBudgetStore((state) => state.accounts);
  const addAccount = useBudgetStore((state) => state.addAccount);
  const removeAccount = useBudgetStore((state) => state.removeAccount);
  const updateAccount = useBudgetStore((state) => state.updateAccount);
  const getAccountBalance = useBudgetStore((state) => state.getAccountBalance);
  const transferBetweenAccounts = useBudgetStore((state) => state.transferBetweenAccounts);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  
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

  // Edit account form state
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountType, setEditAccountType] = useState<AccountType>('checking');
  const [editAccountBalance, setEditAccountBalance] = useState('');

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

  const handleEditAccount = (account: Account) => {
    setEditAccountName(account.name);
    setEditAccountType(account.type);
    setEditAccountBalance(account.initialBalance.toString());
    setEditingAccount(account.id);
  };

  const handleSaveEdit = () => {
    if (editingAccount && editAccountName.trim()) {
      updateAccount(editingAccount, {
        name: editAccountName.trim(),
        type: editAccountType,
        // Removed initialBalance - it should not be editable after account creation
      });
      setEditingAccount(null);
      setEditAccountName('');
      setEditAccountType('checking');
      setEditAccountBalance('');
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
    <div className="flex-1 overflow-y-auto bg-bg-app min-h-screen">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-text-primary mb-2">
                Accounts
              </h1>
              <p className="text-text-muted text-sm">Manage all your financial accounts in one place</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-6 py-3 bg-surface-2 border border-border-subtle text-text-secondary rounded-xl hover:border-border-hover hover:text-text-primary font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={accounts.length < 2}
              >
                Transfer
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                <span>Add Account</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {accounts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Total Balance</div>
                <div className={`text-3xl font-semibold ${totalBalance >= 0 ? 'text-income-green' : 'text-spending-red'}`}>{formatCurrency(totalBalance)}</div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Number of Accounts</div>
                <div className="text-3xl font-semibold text-text-primary">{accounts.length}</div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Largest Account</div>
                <div className="text-lg font-semibold text-text-primary truncate">{largestAccount?.name || 'N/A'}</div>
                <div className="text-text-muted text-xs mt-1">
                  {largestAccount ? formatCurrency(getAccountBalance(largestAccount.id)) : ''}
                </div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Balance Change</div>
                <div className={`text-3xl font-semibold ${balanceChange > 0 ? 'text-income-green' : balanceChange < 0 ? 'text-spending-red' : 'text-text-primary'}`}>
                  {balanceChange >= 0 ? '+' : ''}{formatCurrency(balanceChange)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Link bank via Plaid (logged-in users only) */}
        <div className="mb-8">
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Link your bank</h2>
            <p className="text-sm text-text-muted mb-4">
              Connect your bank account with Plaid to automatically sync transactions.
            </p>
            <PlaidLink />
          </div>
        </div>

        {/* Accounts Grid */}
        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => {
              const balance = getAccountBalance(account.id);
              const rawBalanceChange = balance - account.initialBalance;
              // For credit cards, invert the change sign (increase in debt is bad = negative)
              const balanceChange = account.type === 'credit_card' 
                ? -rawBalanceChange 
                : rawBalanceChange;
              const icon = getAccountIcon(account.type);
              
              return (
                <div
                  key={account.id}
                  className="group bg-surface-1 border border-border-subtle rounded-xl hover:border-border-hover transition-all duration-200 overflow-hidden p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl bg-surface-2 rounded-xl px-2 py-1">{icon}</div>
                      <div>
                        <h3 className="text-xl font-semibold text-text-primary">{account.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-surface-2 text-text-secondary rounded-lg font-medium mt-1 inline-block">
                          {accountTypeLabels[account.type]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg"
                        title="Edit account"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeAccount(account.id)}
                        className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg"
                        title="Delete account"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Balance Display */}
                  <div className="mb-4">
                    <div className="text-text-muted text-xs uppercase tracking-widest mb-1">
                      {account.type === 'credit_card' ? 'Amount Owed' : 'Current Balance'}
                    </div>
                    <div className={`text-3xl font-semibold tabular-nums ${
                      account.type === 'credit_card' ? 'text-spending-red' : balance >= 0 ? 'text-income-green' : 'text-spending-red'
                    }`}>
                      {account.type === 'credit_card' 
                        ? formatCurrency(-balance) // Show credit card balance as negative (debt)
                        : formatCurrency(balance)
                      }
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3 pt-3 border-t border-border-subtle">
                    <div className="flex justify-between items-baseline">
                      <span className="text-text-muted text-xs">
                        {account.type === 'credit_card' ? 'Initial Balance Owed' : 'Initial Balance'}
                      </span>
                      <span className="text-text-secondary text-sm font-medium tabular-nums">
                        {account.type === 'credit_card'
                          ? formatCurrency(-account.initialBalance)
                          : formatCurrency(account.initialBalance)
                        }
                      </span>
                    </div>
                    {balanceChange !== 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-muted text-xs">Change</span>
                        <span className={`font-medium tabular-nums ${balanceChange > 0 ? 'text-income-green' : 'text-spending-red'}`}>
                          {balanceChange >= 0 ? '+' : ''}{formatCurrency(balanceChange)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="text-8xl mb-6">💳</div>
              <h2 className="text-3xl font-semibold text-text-primary mb-3">Add Your First Account</h2>
              <p className="text-text-muted text-sm mb-8">
                Start tracking your finances by adding your checking, savings, and other accounts!
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-8 py-4 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 text-lg"
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
              className="bg-surface-1 border border-border-subtle rounded-xl p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold text-text-primary mb-6">
                Add Account
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    placeholder="e.g., Chase Checking"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Account Type
                  </label>
                  <select
                    value={newAccountType}
                    onChange={(e) => setNewAccountType(e.target.value as AccountType)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  >
                    {Object.entries(accountTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {getAccountIcon(value as AccountType)} {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    {newAccountType === 'credit_card' ? 'Current Balance Owed' : 'Current Balance'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newAccountBalance}
                      onChange={(e) => setNewAccountBalance(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {newAccountType === 'credit_card' && (
                  <div className="flex items-start gap-3 p-4 bg-surface-2 rounded-xl border border-border-subtle">
                    <input
                      type="checkbox"
                      id="trackAsDebt"
                      checked={alsoTrackAsDebt}
                      onChange={(e) => setAlsoTrackAsDebt(e.target.checked)}
                      className="mt-1 w-4 h-4 text-accent border-border-subtle rounded focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="trackAsDebt" className="flex-1 text-sm text-text-secondary cursor-pointer">
                      <span className="font-medium text-text-primary">Also track as debt</span>
                      <span className="block text-text-muted mt-1">
                        Automatically add this credit card to Debt Tracking for payment management, interest tracking, and due dates.
                      </span>
                    </label>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAddAccount}
                    className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
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
                    className="flex-1 px-6 py-3 bg-surface-2 border border-border-subtle text-text-secondary rounded-xl font-medium hover:border-border-hover hover:text-text-primary transition-all duration-200"
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
              className="bg-surface-1 border border-border-subtle rounded-xl p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold text-text-primary mb-6">
                Transfer Money
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTransfer();
                }}
              >
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      From Account
                    </label>
                    <select
                      value={transferFrom}
                      onChange={(e) => setTransferFrom(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
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
                    <label className="block text-sm text-text-secondary mb-2">
                      To Account
                    </label>
                    <select
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
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
                    <label className="block text-sm text-text-secondary mb-2">
                      Transfer Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium text-xl">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full pl-10 pr-4 py-4 text-2xl bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none font-semibold transition-all"
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      Transfer Date
                    </label>
                    <input
                      type="date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      Description <span className="text-text-muted font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={transferDescription}
                      onChange={(e) => setTransferDescription(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                      placeholder="e.g., Credit card payment"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!transferFrom || !transferTo || !transferAmount || transferFrom === transferTo}
                    >
                      Transfer Money
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTransferModal(false);
                        setTransferFrom('');
                        setTransferTo('');
                        setTransferAmount('');
                        setTransferDescription('');
                      }}
                      className="flex-1 px-6 py-3 bg-surface-2 border border-border-subtle text-text-secondary rounded-xl font-medium hover:border-border-hover hover:text-text-primary transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Account Modal */}
        {editingAccount && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setEditingAccount(null);
              setEditAccountName('');
              setEditAccountType('checking');
              setEditAccountBalance('');
            }}
          >
            <div 
              className="bg-surface-1 border border-border-subtle rounded-xl p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold text-text-primary mb-6">
                Edit Account
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={editAccountName}
                    onChange={(e) => setEditAccountName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    placeholder="e.g., Chase Checking"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Account Type
                  </label>
                  <select
                    value={editAccountType}
                    onChange={(e) => setEditAccountType(e.target.value as AccountType)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  >
                    {Object.entries(accountTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {getAccountIcon(value as AccountType)} {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    {editAccountType === 'credit_card' ? 'Current Balance Owed' : 'Current Balance'}
                    <span className="text-xs text-text-muted font-normal ml-2">(cannot be edited)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editAccountBalance}
                      onChange={(e) => setEditAccountBalance(e.target.value)}
                      disabled
                      className="w-full pl-8 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-muted cursor-not-allowed opacity-80"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditingAccount(null);
                      setEditAccountName('');
                      setEditAccountType('checking');
                      setEditAccountBalance('');
                    }}
                    className="flex-1 px-6 py-3 bg-surface-2 border border-border-subtle text-text-secondary rounded-xl font-medium hover:border-border-hover hover:text-text-primary transition-all duration-200"
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

