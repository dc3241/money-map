import React, { useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { format, differenceInDays, differenceInMonths, differenceInYears } from 'date-fns';

// Goal icon mapping
const getGoalIcon = (goalName: string): string => {
  const name = goalName.toLowerCase();
  if (name.includes('car') || name.includes('vehicle')) return '🚗';
  if (name.includes('house') || name.includes('home') || name.includes('mortgage')) return '🏠';
  if (name.includes('vacation') || name.includes('trip') || name.includes('travel') || name.includes('honey')) return '✈️';
  if (name.includes('emergency') || name.includes('fund')) return '🛡️';
  if (name.includes('wedding')) return '💍';
  if (name.includes('education') || name.includes('school') || name.includes('college')) return '🎓';
  if (name.includes('retirement')) return '💰';
  return '🎯';
};

// Calculate time remaining
const getTimeRemaining = (targetDate?: string): { text: string; urgency: 'low' | 'medium' | 'high' } => {
  if (!targetDate) return { text: 'No deadline', urgency: 'low' };
  
  const today = new Date();
  const target = new Date(targetDate);
  const days = differenceInDays(target, today);
  
  if (days < 0) return { text: 'Overdue', urgency: 'high' };
  if (days < 30) return { text: `${days} days left`, urgency: 'high' };
  if (days < 90) return { text: `${days} days left`, urgency: 'medium' };
  
  const months = differenceInMonths(target, today);
  if (months < 12) return { text: `${months} months left`, urgency: 'low' };
  
  const years = differenceInYears(target, today);
  return { text: `${years} years left`, urgency: 'low' };
};

const SavingsGoals: React.FC = () => {
  const goals = useBudgetStore((state) => state.savingsGoals);
  const accounts = useBudgetStore((state) => state.accounts);
  const addSavingsGoal = useBudgetStore((state) => state.addSavingsGoal);
  const removeSavingsGoal = useBudgetStore((state) => state.removeSavingsGoal);
  const addToSavingsGoal = useBudgetStore((state) => state.addToSavingsGoal);
  const getGoalProgress = useBudgetStore((state) => state.getGoalProgress);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState<string | null>(null);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [addMoneyDate, setAddMoneyDate] = useState(new Date().toISOString().split('T')[0]);
  const [addMoneyAccount, setAddMoneyAccount] = useState('');
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

  const handleAddMoney = (goalId: string) => {
    const amount = parseFloat(addMoneyAmount);
    if (!isNaN(amount) && amount > 0) {
      addToSavingsGoal(goalId, amount, addMoneyDate || undefined, addMoneyAccount || undefined);
      setAddMoneyAmount('');
      setAddMoneyDate(new Date().toISOString().split('T')[0]);
      setAddMoneyAccount('');
      setShowAddMoneyModal(null);
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

  // Calculate total progress across all goals
  const totalProgress = goals.length > 0
    ? goals.reduce((sum, goal) => sum + getGoalProgress(goal.id).percentage, 0) / goals.length
    : 0;

  const totalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-slate-50/50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                Savings Goals
              </h1>
              <p className="text-gray-600 text-lg">Track your progress toward financial milestones</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              <span>Add Goal</span>
            </button>
          </div>

          {/* Summary Cards */}
          {goals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Total Saved</div>
                <div className="text-3xl font-bold text-emerald-600">{formatCurrency(totalCurrent)}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Total Target</div>
                <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalTarget)}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Average Progress</div>
                <div className="text-3xl font-bold text-blue-600">{totalProgress.toFixed(1)}%</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Goals Grid */}
        {goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => {
              const progress = getGoalProgress(goal.id);
              const account = goal.accountId ? accounts.find(a => a.id === goal.accountId) : null;
              const timeRemaining = getTimeRemaining(goal.targetDate);
              const isComplete = progress.percentage >= 100;
              const icon = getGoalIcon(goal.name);
              
              // Gradient colors based on progress - matching sidebar slate-900 theme
              const gradientColors = isComplete
                ? 'from-emerald-500 via-emerald-600 to-emerald-700'
                : progress.percentage > 50
                ? 'from-slate-700 via-slate-800 to-slate-900'
                : 'from-slate-600 via-slate-700 to-slate-800';
              
              return (
                <div
                  key={goal.id}
                  className={`group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:scale-[1.02] ${
                    isComplete ? 'ring-2 ring-emerald-400 ring-opacity-50' : ''
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
                            <h3 className="text-xl font-bold">{goal.name}</h3>
                            {account && (
                              <p className="text-sm text-white/80 mt-0.5">{account.name}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeSavingsGoal(goal.id)}
                          className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded-lg"
                          title="Delete goal"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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
                              strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress.percentage / 100)}`}
                              strokeLinecap="round"
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-3xl font-bold">{Math.round(progress.percentage)}%</div>
                              {isComplete && (
                                <div className="text-xs mt-1 animate-pulse">🎉 Complete!</div>
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
                        <span className="text-sm text-gray-600">Current</span>
                        <span className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(goal.currentAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600">Target</span>
                        <span className="text-xl font-semibold text-gray-900">
                          {formatCurrency(goal.targetAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-600">Remaining</span>
                        <span className="text-lg font-semibold text-gray-700">
                          {formatCurrency(goal.targetAmount - goal.currentAmount)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Linear Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${gradientColors} transition-all duration-1000 ease-out shadow-sm`}
                          style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Time Remaining */}
                    {goal.targetDate && (
                      <div className={`mb-4 px-3 py-2 rounded-lg ${
                        timeRemaining.urgency === 'high' ? 'bg-red-50 text-red-700' :
                        timeRemaining.urgency === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {format(new Date(goal.targetDate), 'MMM d, yyyy')}
                          </span>
                          <span className="font-semibold">{timeRemaining.text}</span>
                        </div>
                      </div>
                    )}

                    {/* Add Money Button */}
                    <button
                      onClick={() => setShowAddMoneyModal(goal.id)}
                      disabled={isComplete}
                      className={`w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                        isComplete
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                      }`}
                    >
                      {isComplete ? '✓ Goal Achieved!' : '+ Add Money'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="text-8xl mb-6">🎯</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Start Your Savings Journey</h2>
              <p className="text-gray-600 text-lg mb-8">
                Create your first savings goal and watch your progress grow. Every milestone counts!
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-lg"
              >
                Create Your First Goal
              </button>
            </div>
          </div>
        )}
        
        {/* Add Goal Modal */}
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
                Create Savings Goal
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                    placeholder="e.g., Emergency Fund, Vacation, Car..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Target Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newGoalTarget}
                      onChange={(e) => setNewGoalTarget(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Target Date <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={newGoalDate}
                    onChange={(e) => setNewGoalDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Account <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={newGoalAccount}
                    onChange={(e) => setNewGoalAccount(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none bg-white"
                  >
                    <option value="">No specific account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAddGoal}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all"
                  >
                    Create Goal
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewGoalName('');
                      setNewGoalTarget('');
                      setNewGoalDate('');
                      setNewGoalAccount('');
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

        {/* Add Money Modal */}
        {showAddMoneyModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowAddMoneyModal(null);
              setAddMoneyAmount('');
              setAddMoneyDate(new Date().toISOString().split('T')[0]);
              setAddMoneyAccount('');
            }}
          >
            <div 
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Add Money
              </h2>
              <p className="text-gray-600 mb-6">
                {goals.find(g => g.id === showAddMoneyModal)?.name}
              </p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Amount to Add
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-xl">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addMoneyAmount}
                      onChange={(e) => setAddMoneyAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-4 text-2xl border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none font-semibold"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={addMoneyDate}
                    onChange={(e) => setAddMoneyDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                  />
                </div>
                {accounts.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      From Account <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <select
                      value={addMoneyAccount}
                      onChange={(e) => setAddMoneyAccount(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none bg-white"
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
                    onClick={() => handleAddMoney(showAddMoneyModal)}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all"
                  >
                    Add Money
                  </button>
                  <button
                    onClick={() => {
                      setShowAddMoneyModal(null);
                      setAddMoneyAmount('');
                      setAddMoneyDate(new Date().toISOString().split('T')[0]);
                      setAddMoneyAccount('');
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

export default SavingsGoals;

