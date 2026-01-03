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
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-slate-50/50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                Debt Tracking
              </h1>
              <p className="text-gray-600 text-lg">Monitor and manage your debt payments</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              <span>Add Debt</span>
            </button>
          </div>

          {/* Summary Cards */}
          {debts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Total Debt</div>
                <div className="text-3xl font-bold text-red-600">{formatCurrency(totalDebt)}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Total Paid</div>
                <div className="text-3xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Original Total</div>
                <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalPrincipal)}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Progress</div>
                <div className="text-3xl font-bold text-blue-600">{overallProgress.toFixed(1)}%</div>
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
              
              // Gradient colors based on progress - matching sidebar slate-900 theme
              const gradientColors = isPaidOff
                ? 'from-emerald-500 via-emerald-600 to-emerald-700'
                : progress > 50
                ? 'from-slate-700 via-slate-800 to-slate-900'
                : 'from-slate-600 via-slate-700 to-slate-800';
              
              return (
                <div
                  key={debt.id}
                  className={`group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:scale-[1.02] ${
                    isPaidOff ? 'ring-2 ring-emerald-400 ring-opacity-50' : ''
                  }`}
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
                            <h3 className="text-xl font-bold">{debt.name}</h3>
                            <p className="text-sm text-white/80 mt-0.5">{debtTypeLabels[debt.type]}</p>
                            {account && (
                              <p className="text-xs text-white/70 mt-0.5">{account.name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditDebt(debt)}
                            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded-lg"
                            title="Edit debt"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeDebt(debt.id)}
                            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded-lg"
                            title="Delete debt"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Circular Progress */}
                      <div className="flex items-center justify-center my-6">
                        <div className="relative w-32 h-32">
                          <svg className="transform -rotate-90 w-32 h-32">
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              stroke="rgba(255,255,255,0.3)"
                              strokeWidth="12"
                              fill="none"
                            />
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              stroke="white"
                              strokeWidth="12"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 56}`}
                              strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                              strokeLinecap="round"
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-3xl font-bold">{Math.round(progress)}%</div>
                              {isPaidOff && (
                                <div className="text-xs mt-1 animate-pulse">🎉 Paid Off!</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Amounts */}
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600">Current Balance</span>
                        <span className="text-2xl font-bold text-red-600">
                          {formatCurrency(debt.currentBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600">Original Amount</span>
                        <span className="text-xl font-semibold text-gray-900">
                          {formatCurrency(debt.principalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-600">Paid Off</span>
                        <span className={`text-lg font-semibold ${paidAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(paidAmount)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Linear Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${gradientColors} transition-all duration-1000 ease-out shadow-sm`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Debt Details */}
                    <div className="space-y-2 mb-4">
                      {debt.interestRate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Interest Rate</span>
                          <span className="font-semibold text-gray-900">{debt.interestRate}% APR</span>
                        </div>
                      )}
                      {debt.minimumPayment && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Min. Payment</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(debt.minimumPayment)}</span>
                        </div>
                      )}
                      {debt.dueDate && (
                        <div className={`px-3 py-2 rounded-lg ${
                          timeUntilDue.urgency === 'high' ? 'bg-red-50 text-red-700' :
                          timeUntilDue.urgency === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-blue-50 text-blue-700'
                        }`}>
                          <div className="flex items-center justify-between text-sm">
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
                      className={`w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 mb-3 ${
                        isPaidOff
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                      }`}
                    >
                      {isPaidOff ? '✓ Debt Paid Off!' : '+ Record Payment'}
                    </button>

                    {/* Payment History */}
                    {payments.length > 0 && (
                      <div className="border-t border-gray-100 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">Payment History</span>
                          <span className="text-xs text-gray-500">{payments.length} payments</span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {payments.map((payment) => (
                            <div key={payment.id} className="flex justify-between items-center text-xs bg-gray-50 rounded-lg px-3 py-2 group hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-gray-600">{format(new Date(payment.date), 'MMM d, yyyy')}</span>
                                {payment.description && (
                                  <span className="text-gray-500">• {payment.description}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-emerald-600">{formatCurrency(payment.amount)}</span>
                                <button
                                  onClick={() => removeDebtPayment(payment.id)}
                                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all p-1 hover:bg-red-50 rounded"
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
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="text-8xl mb-6">💸</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Start Tracking Your Debt</h2>
              <p className="text-gray-600 text-lg mb-8">
                Add your debts to monitor payments and track your progress toward becoming debt-free!
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-lg"
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
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Add Debt
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Debt Name
                  </label>
                  <input
                    type="text"
                    value={newDebtName}
                    onChange={(e) => setNewDebtName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                    placeholder="e.g., Credit Card, Car Loan..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={newDebtType}
                    onChange={(e) => setNewDebtType(e.target.value as any)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none bg-white"
                  >
                    {Object.entries(debtTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Principal Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newDebtPrincipal}
                      onChange={(e) => setNewDebtPrincipal(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Interest Rate % <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newDebtInterest}
                      onChange={(e) => setNewDebtInterest(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Minimum Payment <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newDebtMinPayment}
                      onChange={(e) => setNewDebtMinPayment(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Due Date <span className="text-gray-400 font-normal">(day of month, optional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newDebtDueDate}
                    onChange={(e) => setNewDebtDueDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                    placeholder="e.g., 15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Account <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={newDebtAccount}
                    onChange={(e) => setNewDebtAccount(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none bg-white"
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
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all"
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
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
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
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Record Payment
              </h2>
              <p className="text-gray-600 mb-6">
                {debts.find(d => d.id === showPaymentModal)?.name}
              </p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-xl">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-4 text-2xl border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none font-semibold"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                    placeholder="e.g., Monthly payment"
                  />
                </div>
                {accounts.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      From Account <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <select
                      value={paymentAccount}
                      onChange={(e) => setPaymentAccount(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none bg-white"
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
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all"
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
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
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
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Edit Debt
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Debt Name
                  </label>
                  <input
                    type="text"
                    value={editDebtName}
                    onChange={(e) => setEditDebtName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                    placeholder="e.g., Credit Card, Car Loan..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={editDebtType}
                    onChange={(e) => setEditDebtType(e.target.value as any)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none bg-white"
                  >
                    {Object.entries(debtTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Principal Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editDebtPrincipal}
                      onChange={(e) => setEditDebtPrincipal(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Current Balance
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editDebtCurrentBalance}
                      onChange={(e) => setEditDebtCurrentBalance(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Interest Rate % <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editDebtInterest}
                      onChange={(e) => setEditDebtInterest(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Minimum Payment <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editDebtMinPayment}
                      onChange={(e) => setEditDebtMinPayment(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Due Date <span className="text-gray-400 font-normal">(day of month, optional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editDebtDueDate}
                    onChange={(e) => setEditDebtDueDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
                    placeholder="e.g., 15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Account <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={editDebtAccount}
                    onChange={(e) => setEditDebtAccount(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none bg-white"
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
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all"
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

export default DebtTracking;

