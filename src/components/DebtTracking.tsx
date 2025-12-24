import React, { useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { format } from 'date-fns';

const DebtTracking: React.FC = () => {
  const debts = useBudgetStore((state) => state.debts);
  const debtPayments = useBudgetStore((state) => state.debtPayments);
  const accounts = useBudgetStore((state) => state.accounts);
  const addDebt = useBudgetStore((state) => state.addDebt);
  const removeDebt = useBudgetStore((state) => state.removeDebt);
  const updateDebt = useBudgetStore((state) => state.updateDebt);
  const addDebtPayment = useBudgetStore((state) => state.addDebtPayment);
  const getTotalDebt = useBudgetStore((state) => state.getTotalDebt);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  
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
      });
      setPaymentAmount('');
      setPaymentDescription('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setShowPaymentModal(null);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  const debtTypeLabels = {
    credit_card: 'Credit Card',
    loan: 'Loan',
    mortgage: 'Mortgage',
    other: 'Other',
  };
  
  const totalDebt = getTotalDebt();
  
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Debt Tracking</h1>
            <p className="text-lg text-gray-600 mt-2">
              Total Debt: <span className="font-bold text-red-600">{formatCurrency(totalDebt)}</span>
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            + Add Debt
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debts.map((debt) => {
            const payments = debtPayments.filter(p => p.debtId === debt.id);
            const account = debt.accountId ? accounts.find(a => a.id === debt.accountId) : null;
            const paidAmount = debt.principalAmount - debt.currentBalance;
            const progress = debt.principalAmount > 0 ? (paidAmount / debt.principalAmount) * 100 : 0;
            
            return (
              <div key={debt.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{debt.name}</h3>
                    <p className="text-sm text-gray-500">{debtTypeLabels[debt.type]}</p>
                    {account && (
                      <p className="text-sm text-gray-500">{account.name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeDebt(debt.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
                
                <div className="mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Original Amount:</span>
                    <span className="font-semibold">{formatCurrency(debt.principalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Balance:</span>
                    <span className="font-semibold text-red-600">{formatCurrency(debt.currentBalance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(paidAmount)}</span>
                  </div>
                  {debt.interestRate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Interest Rate:</span>
                      <span className="font-semibold">{debt.interestRate}%</span>
                    </div>
                  )}
                  {debt.minimumPayment && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Min. Payment:</span>
                      <span className="font-semibold">{formatCurrency(debt.minimumPayment)}</span>
                    </div>
                  )}
                  {debt.dueDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-semibold">Day {debt.dueDate} of month</span>
                    </div>
                  )}
                  
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                    <div
                      className="h-3 rounded-full bg-green-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-1">
                    {progress.toFixed(1)}% paid off
                  </div>
                </div>
                
                <button
                  onClick={() => setShowPaymentModal(debt.id)}
                  className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold mb-2"
                >
                  Record Payment
                </button>
                
                {payments.length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium">
                      Payment History ({payments.length})
                    </summary>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {payments.map((payment) => (
                        <div key={payment.id} className="text-xs text-gray-600 flex justify-between">
                          <span>{format(new Date(payment.date), 'MMM d, yyyy')}</span>
                          <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
        
        {debts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No debts tracked</p>
            <p className="text-sm">Add a debt to start tracking your payments</p>
          </div>
        )}
        
        {/* Add Debt Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Add Debt</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Debt Name
                  </label>
                  <input
                    type="text"
                    value={newDebtName}
                    onChange={(e) => setNewDebtName(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="e.g., Credit Card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={newDebtType}
                    onChange={(e) => setNewDebtType(e.target.value as any)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                  >
                    {Object.entries(debtTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Principal Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newDebtPrincipal}
                    onChange={(e) => setNewDebtPrincipal(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interest Rate % (optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newDebtInterest}
                    onChange={(e) => setNewDebtInterest(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Payment (optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newDebtMinPayment}
                    onChange={(e) => setNewDebtMinPayment(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date (day of month, optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newDebtDueDate}
                    onChange={(e) => setNewDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="e.g., 15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account (optional)
                  </label>
                  <select
                    value={newDebtAccount}
                    onChange={(e) => setNewDebtAccount(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                  >
                    <option value="">No account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddDebt}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewDebtName('');
                      setNewDebtPrincipal('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg font-semibold hover:bg-gray-500"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">Record Payment</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="e.g., Monthly payment"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddPayment(showPaymentModal)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                  >
                    Record
                  </button>
                  <button
                    onClick={() => {
                      setShowPaymentModal(null);
                      setPaymentAmount('');
                      setPaymentDescription('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg font-semibold hover:bg-gray-500"
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

