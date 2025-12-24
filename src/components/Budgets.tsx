import React, { useState, useMemo } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { format } from 'date-fns';

const Budgets: React.FC = () => {
  const budgets = useBudgetStore((state) => state.budgets);
  const categories = useBudgetStore((state) => state.categories);
  const addBudget = useBudgetStore((state) => state.addBudget);
  const removeBudget = useBudgetStore((state) => state.removeBudget);
  const updateBudget = useBudgetStore((state) => state.updateBudget);
  const getBudgetStatus = useBudgetStore((state) => state.getBudgetStatus);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [newBudgetPeriod, setNewBudgetPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  
  const expenseCategories = categories.filter(c => c.type === 'expense');
  
  const currentBudgets = useMemo(() => {
    return budgets.filter(b => {
      if (b.period === 'monthly') {
        return b.year === selectedYear && b.month === selectedMonth;
      } else if (b.period === 'yearly') {
        return b.year === selectedYear;
      }
      return true;
    });
  }, [budgets, selectedYear, selectedMonth]);
  
  const handleAddBudget = () => {
    const amount = parseFloat(newBudgetAmount);
    if (newBudgetCategory && amount > 0) {
      addBudget({
        categoryId: newBudgetCategory,
        amount,
        period: newBudgetPeriod,
        year: selectedYear,
        month: newBudgetPeriod === 'monthly' ? selectedMonth : undefined,
        week: newBudgetPeriod === 'weekly' ? 1 : undefined,
      });
      setNewBudgetCategory('');
      setNewBudgetAmount('');
      setShowAddModal(false);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Budget Goals</h1>
          <div className="flex gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            {currentBudgets.some(b => b.period === 'monthly') && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {format(new Date(selectedYear, month - 1, 1), 'MMMM')}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              + Add Budget
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentBudgets.map((budget) => {
            const status = getBudgetStatus(budget.id, selectedYear, selectedMonth);
            const category = categories.find(c => c.id === budget.categoryId);
            
            return (
              <div key={budget.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {category?.icon || '📌'} {category?.name || budget.categoryId}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {budget.period === 'monthly' ? 'Monthly' : budget.period === 'yearly' ? 'Yearly' : 'Weekly'} Budget
                    </p>
                  </div>
                  <button
                    onClick={() => removeBudget(budget.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Limit:</span>
                    <span className="font-semibold">{formatCurrency(status.limit)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Spent:</span>
                    <span className="font-semibold text-red-600">{formatCurrency(status.spent)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-gray-600">Remaining:</span>
                    <span className={`font-semibold ${status.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(status.remaining)}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        status.percentage > 100
                          ? 'bg-red-500'
                          : status.percentage > 80
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(status.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {status.percentage.toFixed(1)}% used
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {currentBudgets.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No budgets set</p>
            <p className="text-sm">Add a budget to track your spending limits</p>
          </div>
        )}
        
        {/* Add Budget Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">Add Budget</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newBudgetCategory}
                    onChange={(e) => setNewBudgetCategory(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                  >
                    <option value="">Select category</option>
                    {expenseCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon || '📌'} {cat.name}
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
                    value={newBudgetAmount}
                    onChange={(e) => setNewBudgetAmount(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period
                  </label>
                  <select
                    value={newBudgetPeriod}
                    onChange={(e) => setNewBudgetPeriod(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddBudget}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewBudgetCategory('');
                      setNewBudgetAmount('');
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

export default Budgets;

