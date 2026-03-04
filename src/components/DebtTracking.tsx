import React, { useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { format, differenceInDays, addMonths } from 'date-fns';
import type { Debt } from '../types';

// Debt type icon mapping
const getDebtIcon = (type: string): string => {
  switch (type) {
    case 'credit_card': return '💳';
    case 'loan': return '📋';
    case 'mortgage': return '🏠';
    case 'other': return '📊';
    default: return '💸';
  }
};

// Calculate days until next due date
const getDaysUntilDue = (dueDate?: number): { text: string; urgency: 'low' | 'medium' | 'high' } => {
  if (!dueDate) return { text: 'No due date', urgency: 'low' };
  
  const today = new Date();
  const currentMonthDue = new Date(today.getFullYear(), today.getMonth(), dueDate);
  const nextMonthDue = addMonths(currentMonthDue, 1);
  
  const dueDateThisMonth = today.getDate() <= dueDate ? currentMonthDue : nextMonthDue;
  const days = differenceInDays(dueDateThisMonth, today);
  
  if (days < 0) return { text: 'Overdue', urgency: 'high' };
  if (days <= 7) return { text: `${days} days`, urgency: 'high' };
  if (days <= 14) return { text: `${days} days`, urgency: 'medium' };
  return { text: `${days} days`, urgency: 'low' };
};

const DebtTracking: React.FC = () => {
  const debts = useBudgetStore((state) => state.debts);
  const debtPayments = useBudgetStore((state) => state.debtPayments);
  const accounts = useBudgetStore((state) => state.accounts);
  const addDebt = useBudgetStore((state) => state.addDebt);
  const removeDebt = useBudgetStore((state) => state.removeDebt);
  const updateDebt = useBudgetStore((state) => state.updateDebt);
  const addDebtPayment = useBudgetStore((state) => state.addDebtPayment);
  const removeDebtPayment = useBudgetStore((state) => state.removeDebtPayment);
  const getTotalDebt = useBudgetStore((state) => state.getTotalDebt);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [editingDebt, setEditingDebt] = useState<string | null>(null);
  
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtType, setNewDebtType] = useState<'credit_card' | 'loan' | 'mortgage' | 'other'>('credit_card');
  const [newDebtPrincipal, setNewDebtPrincipal] = useState('');
  const [newDebtInterest, setNewDebtInterest] = useState('');
  const [newDebtMinPayment, setNewDebtMinPayment] = useState('');
  const [newDebtDueDate, setNewDebtDueDate] = useState('');
  const [newDebtAccount, setNewDebtAccount] = useState('');
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');

  // Edit debt form state
  const [editDebtName, setEditDebtName] = useState('');
  const [editDebtType, setEditDebtType] = useState<'credit_card' | 'loan' | 'mortgage' | 'other'>('credit_card');
  const [editDebtPrincipal, setEditDebtPrincipal] = useState('');
  const [editDebtCurrentBalance, setEditDebtCurrentBalance] = useState('');
  const [editDebtInterest, setEditDebtInterest] = useState('');
  const [editDebtMinPayment, setEditDebtMinPayment] = useState('');
  const [editDebtDueDate, setEditDebtDueDate] = useState('');
  const [editDebtAccount, setEditDebtAccount] = useState('');
  
  const handleAddDebt = () => {
    const principal = parseFloat(newDebtPrincipal);
    if (newDebtName.trim() && principal > 0) {
      addDebt({
        name: newDebtName.trim(),
        type: newDebtType,
        principalAmount: principal,
        currentBalance: principal,
        interestRate: newDebtInterest ? parseFloat(newDebtInterest) : undefined,
        minimumPayment: newDebtMinPayment ? parseFloat(newDebtMinPayment) : undefined,
        dueDate: newDebtDueDate ? parseInt(newDebtDueDate) : undefined,
        accountId: newDebtAccount || undefined,
      });
      setNewDebtName('');
      setNewDebtPrincipal('');
      setNewDebtInterest('');
      setNewDebtMinPayment('');
      setNewDebtDueDate('');
      setNewDebtAccount('');
      setShowAddModal(false);
    }
  };
  
  const handleAddPayment = (debtId: string) => {
    const amount = parseFloat(paymentAmount);
    if (amount > 0) {
      addDebtPayment({
        debtId,
        amount,
        date: paymentDate,
        description: paymentDescription || undefined,
        accountId: paymentAccount || undefined,
      });
      setPaymentAmount('');
      setPaymentDescription('');
      setPaymentAccount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setShowPaymentModal(null);
    }
  };

  const handleEditDebt = (debt: Debt) => {
    setEditDebtName(debt.name);
    setEditDebtType(debt.type);
    setEditDebtPrincipal(debt.principalAmount.toString());
    setEditDebtCurrentBalance(debt.currentBalance.toString());
    setEditDebtInterest(debt.interestRate?.toString() || '');
    setEditDebtMinPayment(debt.minimumPayment?.toString() || '');
    setEditDebtDueDate(debt.dueDate?.toString() || '');
    setEditDebtAccount(debt.accountId || '');
    setEditingDebt(debt.id);
  };

  const handleSaveEdit = () => {
    if (editingDebt && editDebtName.trim()) {
      const principal = parseFloat(editDebtPrincipal);
      const currentBalance = parseFloat(editDebtCurrentBalance);
      if (!isNaN(principal) && !isNaN(currentBalance) && principal > 0 && currentBalance >= 0) {
        updateDebt(editingDebt, {
          name: editDebtName.trim(),
          type: editDebtType,
          principalAmount: principal,
          currentBalance: currentBalance,
          interestRate: editDebtInterest ? parseFloat(editDebtInterest) : undefined,
          minimumPayment: editDebtMinPayment ? parseFloat(editDebtMinPayment) : undefined,
          dueDate: editDebtDueDate ? parseInt(editDebtDueDate) : undefined,
          accountId: editDebtAccount || undefined,
        });
        setEditingDebt(null);
        // Reset all edit fields
        setEditDebtName('');
        setEditDebtType('credit_card');
        setEditDebtPrincipal('');
        setEditDebtCurrentBalance('');
        setEditDebtInterest('');
        setEditDebtMinPayment('');
        setEditDebtDueDate('');
        setEditDebtAccount('');
      }
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
  
  const debtTypeLabels = {
    credit_card: 'Credit Card',
    loan: 'Loan',
    mortgage: 'Mortgage',
    other: 'Other',
  };

  const totalDebt = getTotalDebt();
  const totalPaid = debts.reduce((sum, debt) => sum + (debt.principalAmount - debt.currentBalance), 0);
  const totalPrincipal = debts.reduce((sum, debt) => sum + debt.principalAmount, 0);
  const overallProgress = totalPrincipal > 0 ? (totalPaid / totalPrincipal) * 100 : 0;
  
  return (
    <div className="flex-1 overflow-y-auto bg-bg-app min-h-screen">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-text-primary mb-2">
                Debt Tracking
              </h1>
              <p className="text-text-muted text-sm">Monitor and manage your debt payments</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              <span>Add Debt</span>
            </button>
          </div>

          {/* Summary Cards */}
          {debts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Total Debt</div>
                <div className="text-3xl font-semibold text-spending-red">{formatCurrency(totalDebt)}</div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Total Paid</div>
                <div className="text-3xl font-semibold text-income-green">{formatCurrency(totalPaid)}</div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Original Total</div>
                <div className="text-3xl font-semibold text-text-primary">{formatCurrency(totalPrincipal)}</div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Progress</div>
                <div className="text-3xl font-semibold text-income-green">{overallProgress.toFixed(1)}%</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Debts Grid */}
        {debts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {debts.map((debt) => {
              const payments = debtPayments.filter(p => p.debtId === debt.id);
              const account = debt.accountId ? accounts.find(a => a.id === debt.accountId) : null;
              const paidAmount = debt.principalAmount - debt.currentBalance;
              const progress = debt.principalAmount > 0 ? (paidAmount / debt.principalAmount) * 100 : 0;
              const isPaidOff = debt.currentBalance <= 0;
              const timeUntilDue = getDaysUntilDue(debt.dueDate);
              const icon = getDebtIcon(debt.type);
              const dueBadgeClass = timeUntilDue.urgency === 'high' ? 'bg-spending-red-dim text-spending-red' :
                timeUntilDue.urgency === 'medium' ? 'bg-amber/10 text-amber' : 'bg-surface-2 text-text-secondary';
              
              return (
                <div
                  key={debt.id}
                  className="group bg-surface-1 border border-border-subtle rounded-xl hover:border-border-hover transition-all duration-200 overflow-hidden p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl bg-surface-2 rounded-xl px-2 py-1">{icon}</div>
                      <div>
                        <h3 className="text-text-primary font-semibold text-sm">{debt.name}</h3>
                        <span className="bg-surface-2 text-text-secondary text-xs rounded-lg px-2 py-0.5">
                          {debtTypeLabels[debt.type]}
                        </span>
                        {account && (
                          <p className="text-text-muted text-xs mt-1">{account.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditDebt(debt)}
                        className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg"
                        title="Edit debt"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeDebt(debt.id)}
                        className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg"
                        title="Delete debt"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-income-green transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="text-text-muted text-xs mt-1">{Math.round(progress)}% paid off</div>
                  </div>

                  {/* Amounts */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-text-muted text-xs">Current Balance</span>
                      <span className="text-spending-red font-semibold tabular-nums">
                        {formatCurrency(debt.currentBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-text-muted text-xs">Original Amount</span>
                      <span className="text-text-secondary text-sm tabular-nums">
                        {formatCurrency(debt.principalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-border-subtle">
                      <span className="text-text-muted text-xs">Paid Off</span>
                      <span className="text-income-green font-semibold tabular-nums">
                        {formatCurrency(paidAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Debt Details */}
                  <div className="space-y-2 mb-4">
                    {debt.interestRate && (
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Interest Rate</span>
                        <span className="text-text-secondary font-medium">{debt.interestRate}% APR</span>
                      </div>
                    )}
                    {debt.minimumPayment && (
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Min. Payment</span>
                        <span className="text-text-secondary font-medium tabular-nums">{formatCurrency(debt.minimumPayment)}</span>
                      </div>
                    )}
                    {debt.dueDate && (
                      <div className={`px-3 py-2 rounded-lg ${dueBadgeClass} text-xs`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Due: Day {debt.dueDate}</span>
                          <span className="font-semibold">{timeUntilDue.text}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Record Payment Button */}
                  <button
                    onClick={() => setShowPaymentModal(debt.id)}
                    disabled={isPaidOff}
                    className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 mb-3 ${
                      isPaidOff
                        ? 'bg-surface-2 text-text-muted cursor-not-allowed'
                        : 'bg-accent text-white hover:opacity-90'
                    }`}
                  >
                    {isPaidOff ? '✓ Debt Paid Off!' : '+ Record Payment'}
                  </button>

                  {/* Payment History */}
                  {payments.length > 0 && (
                    <div className="border-t border-border-subtle pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-text-muted text-xs font-medium">Payment History</span>
                        <span className="text-text-muted text-xs">{payments.length} payments</span>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {payments.map((payment) => (
                          <div key={payment.id} className="flex justify-between items-center text-xs bg-surface-2 rounded-lg px-3 py-2 border border-border-subtle group hover:border-border-hover transition-colors">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-text-muted">{format(new Date(payment.date), 'MMM d, yyyy')}</span>
                              {payment.description && (
                                <span className="text-text-muted truncate">• {payment.description}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-semibold text-income-green tabular-nums">{formatCurrency(payment.amount)}</span>
                              <button
                                onClick={() => removeDebtPayment(payment.id)}
                                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-spending-red transition-all p-1 rounded"
                                title="Delete payment"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto bg-surface-1 border border-dashed border-border-subtle rounded-xl p-12">
              <div className="text-8xl mb-6">💸</div>
              <h2 className="text-2xl font-semibold text-text-primary mb-3">Start Tracking Your Debt</h2>
              <p className="text-text-muted text-sm mb-8">
                Add your debts to monitor payments and track your progress toward becoming debt-free!
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-8 py-4 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 text-lg"
              >
                Add Your First Debt
              </button>
            </div>
          </div>
        )}
        
        {/* Add Debt Modal */}
        {showAddModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <div 
              className="bg-surface-1 border border-border-subtle rounded-xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold text-text-primary mb-6">
                Add Debt
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Debt Name
                  </label>
                  <input
                    type="text"
                    value={newDebtName}
                    onChange={(e) => setNewDebtName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    placeholder="e.g., Credit Card, Car Loan..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Type
                  </label>
                  <select
                    value={newDebtType}
                    onChange={(e) => setNewDebtType(e.target.value as any)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  >
                    {Object.entries(debtTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Principal Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newDebtPrincipal}
                      onChange={(e) => setNewDebtPrincipal(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Interest Rate % <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newDebtInterest}
                      onChange={(e) => setNewDebtInterest(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Minimum Payment <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newDebtMinPayment}
                      onChange={(e) => setNewDebtMinPayment(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Due Date <span className="text-text-muted font-normal">(day of month, optional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newDebtDueDate}
                    onChange={(e) => setNewDebtDueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    placeholder="e.g., 15"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Account <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <select
                    value={newDebtAccount}
                    onChange={(e) => setNewDebtAccount(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  >
                    <option value="">No account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAddDebt}
                    className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
                  >
                    Add Debt
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewDebtName('');
                      setNewDebtPrincipal('');
                      setNewDebtInterest('');
                      setNewDebtMinPayment('');
                      setNewDebtDueDate('');
                      setNewDebtAccount('');
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
        
        {/* Payment Modal */}
        {showPaymentModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowPaymentModal(null);
              setPaymentAmount('');
              setPaymentDescription('');
              setPaymentAccount('');
            }}
          >
            <div 
              className="bg-surface-1 border border-border-subtle rounded-xl p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold text-text-primary mb-2">
                Record Payment
              </h2>
              <p className="text-text-muted mb-6">
                {debts.find(d => d.id === showPaymentModal)?.name}
              </p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Payment Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium text-xl">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-4 text-2xl bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none font-semibold transition-all"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Description <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    placeholder="e.g., Monthly payment"
                  />
                </div>
                {accounts.length > 0 && (
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      From Account <span className="text-text-muted font-normal">(optional)</span>
                    </label>
                    <select
                      value={paymentAccount}
                      onChange={(e) => setPaymentAccount(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    >
                      <option value="">No account selected</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleAddPayment(showPaymentModal)}
                    className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
                  >
                    Record Payment
                  </button>
                  <button
                    onClick={() => {
                      setShowPaymentModal(null);
                      setPaymentAmount('');
                      setPaymentDescription('');
                      setPaymentAccount('');
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

        {/* Edit Debt Modal */}
        {editingDebt && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setEditingDebt(null);
              // Reset all edit fields
              setEditDebtName('');
              setEditDebtType('credit_card');
              setEditDebtPrincipal('');
              setEditDebtCurrentBalance('');
              setEditDebtInterest('');
              setEditDebtMinPayment('');
              setEditDebtDueDate('');
              setEditDebtAccount('');
            }}
          >
            <div 
              className="bg-surface-1 border border-border-subtle rounded-xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold text-text-primary mb-6">
                Edit Debt
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Debt Name
                  </label>
                  <input
                    type="text"
                    value={editDebtName}
                    onChange={(e) => setEditDebtName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    placeholder="e.g., Credit Card, Car Loan..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Type
                  </label>
                  <select
                    value={editDebtType}
                    onChange={(e) => setEditDebtType(e.target.value as any)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  >
                    {Object.entries(debtTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Principal Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editDebtPrincipal}
                      onChange={(e) => setEditDebtPrincipal(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Current Balance
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editDebtCurrentBalance}
                      onChange={(e) => setEditDebtCurrentBalance(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Interest Rate % <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editDebtInterest}
                      onChange={(e) => setEditDebtInterest(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Minimum Payment <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editDebtMinPayment}
                      onChange={(e) => setEditDebtMinPayment(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Due Date <span className="text-text-muted font-normal">(day of month, optional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editDebtDueDate}
                    onChange={(e) => setEditDebtDueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    placeholder="e.g., 15"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Account <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <select
                    value={editDebtAccount}
                    onChange={(e) => setEditDebtAccount(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  >
                    <option value="">No account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
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
                      setEditingDebt(null);
                      // Reset all edit fields
                      setEditDebtName('');
                      setEditDebtType('credit_card');
                      setEditDebtPrincipal('');
                      setEditDebtCurrentBalance('');
                      setEditDebtInterest('');
                      setEditDebtMinPayment('');
                      setEditDebtDueDate('');
                      setEditDebtAccount('');
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

export default DebtTracking;

