import React, { useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { format } from 'date-fns';

const SavingsGoals: React.FC = () => {
  const goals = useBudgetStore((state) => state.savingsGoals);
  const accounts = useBudgetStore((state) => state.accounts);
  const addSavingsGoal = useBudgetStore((state) => state.addSavingsGoal);
  const removeSavingsGoal = useBudgetStore((state) => state.removeSavingsGoal);
  const updateSavingsGoal = useBudgetStore((state) => state.updateSavingsGoal);
  const addToSavingsGoal = useBudgetStore((state) => state.addToSavingsGoal);
  const getGoalProgress = useBudgetStore((state) => state.getGoalProgress);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [newGoalAccount, setNewGoalAccount] = useState('');
  
  const handleAddGoal = () => {
    const target = parseFloat(newGoalTarget);
    if (newGoalName.trim() && target > 0) {
      addSavingsGoal({
        name: newGoalName.trim(),
        targetAmount: target,
        targetDate: newGoalDate || undefined,
        accountId: newGoalAccount || undefined,
      });
      setNewGoalName('');
      setNewGoalTarget('');
      setNewGoalDate('');
      setNewGoalAccount('');
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
          <h1 className="text-3xl font-bold text-gray-900">Savings Goals</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
          >
            + Add Goal
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const progress = getGoalProgress(goal.id);
            const account = goal.accountId ? accounts.find(a => a.id === goal.accountId) : null;
            
            return (
              <div key={goal.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-emerald-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{goal.name}</h3>
                    {account && (
                      <p className="text-sm text-gray-500">{account.name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeSavingsGoal(goal.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Current:</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(goal.currentAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-semibold">{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className="h-3 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {progress.percentage.toFixed(1)}% complete
                  </div>
                  
                  {goal.targetDate && (
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    const amount = prompt('Enter amount to add:');
                    if (amount) {
                      const numAmount = parseFloat(amount);
                      if (!isNaN(numAmount) && numAmount > 0) {
                        addToSavingsGoal(goal.id, numAmount);
                      }
                    }
                  }}
                  className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold"
                >
                  Add Money
                </button>
              </div>
            );
          })}
        </div>
        
        {goals.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No savings goals yet</p>
            <p className="text-sm">Create a goal to track your savings progress</p>
          </div>
        )}
        
        {/* Add Goal Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">Add Savings Goal</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="e.g., Emergency Fund"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Date (optional)
                  </label>
                  <input
                    type="date"
                    value={newGoalDate}
                    onChange={(e) => setNewGoalDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account (optional)
                  </label>
                  <select
                    value={newGoalAccount}
                    onChange={(e) => setNewGoalAccount(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                  >
                    <option value="">No specific account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddGoal}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewGoalName('');
                      setNewGoalTarget('');
                      setNewGoalDate('');
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

export default SavingsGoals;

