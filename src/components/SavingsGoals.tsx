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
  const updateSavingsGoal = useBudgetStore((state) => state.updateSavingsGoal);
  const addToSavingsGoal = useBudgetStore((state) => state.addToSavingsGoal);
  const getGoalProgress = useBudgetStore((state) => state.getGoalProgress);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [addMoneyDate, setAddMoneyDate] = useState(new Date().toISOString().split('T')[0]);
  const [addMoneyAccount, setAddMoneyAccount] = useState('');
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [newGoalAccount, setNewGoalAccount] = useState('');
  
  // Edit goal states
  const [editGoalName, setEditGoalName] = useState('');
  const [editGoalTarget, setEditGoalTarget] = useState('');
  const [editGoalDate, setEditGoalDate] = useState('');
  const [editGoalAccount, setEditGoalAccount] = useState('');
  
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

  const handleEditGoal = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setEditingGoalId(goalId);
      setEditGoalName(goal.name);
      setEditGoalTarget(goal.targetAmount.toString());
      setEditGoalDate(goal.targetDate || '');
      setEditGoalAccount(goal.accountId || '');
      setShowEditModal(true);
    }
  };

  const handleUpdateGoal = () => {
    if (!editingGoalId) return;
    const target = parseFloat(editGoalTarget);
    if (editGoalName.trim() && target > 0) {
      updateSavingsGoal(editingGoalId, {
        name: editGoalName.trim(),
        targetAmount: target,
        targetDate: editGoalDate || undefined,
        accountId: editGoalAccount || undefined,
      });
      setShowEditModal(false);
      setEditingGoalId(null);
      setEditGoalName('');
      setEditGoalTarget('');
      setEditGoalDate('');
      setEditGoalAccount('');
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
    <div className="flex-1 overflow-y-auto bg-bg-app min-h-screen">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-text-primary mb-2">
                Savings Goals
              </h1>
              <p className="text-text-muted text-sm">Track your progress toward financial milestones</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              <span>Add Goal</span>
            </button>
          </div>

          {/* Summary Cards */}
          {goals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Total Saved</div>
                <div className="text-3xl font-semibold text-income-green">{formatCurrency(totalCurrent)}</div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Total Target</div>
                <div className="text-3xl font-semibold text-text-primary">{formatCurrency(totalTarget)}</div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Average Progress</div>
                <div className="text-3xl font-semibold text-income-green">{totalProgress.toFixed(1)}%</div>
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
              const progressFillClass = isComplete ? 'bg-income-green' : progress.percentage >= 75 ? 'bg-amber' : 'bg-income-green';
              const timeBadgeClass = timeRemaining.urgency === 'high' ? 'bg-spending-red-dim text-spending-red' :
                timeRemaining.urgency === 'medium' ? 'bg-amber/10 text-amber' : 'bg-surface-2 text-text-secondary';
              
              return (
                <div
                  key={goal.id}
                  className="group bg-surface-1 border border-border-subtle rounded-xl hover:border-border-hover transition-all duration-200 overflow-hidden p-6 cursor-pointer"
                  onClick={() => handleEditGoal(goal.id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl bg-surface-2 rounded-xl px-2 py-1">{icon}</div>
                      <div>
                        <h3 className="text-text-primary font-semibold text-sm">{goal.name}</h3>
                        {account && (
                          <p className="text-text-muted text-xs mt-0.5">{account.name}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this goal?')) {
                          removeSavingsGoal(goal.id);
                        }
                      }}
                      className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg"
                      title="Delete goal"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${progressFillClass} transition-all duration-500 ease-out`}
                        style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="text-text-muted text-xs mt-1">{Math.round(progress.percentage)}% complete</div>
                  </div>

                  {/* Amounts */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-text-muted text-xs">Current</span>
                      <span className="text-income-green font-semibold tabular-nums">
                        {formatCurrency(goal.currentAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-text-muted text-xs">Target</span>
                      <span className="text-text-secondary text-sm tabular-nums">
                        {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-border-subtle">
                      <span className="text-text-muted text-xs">Remaining</span>
                      <span className="text-text-secondary text-sm font-medium tabular-nums">
                        {formatCurrency(goal.targetAmount - goal.currentAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Time Remaining */}
                  {goal.targetDate && (
                    <div className={`mb-4 px-3 py-2 rounded-lg text-xs ${timeBadgeClass}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {format(new Date(goal.targetDate), 'MMM d, yyyy')}
                        </span>
                        <span className="font-semibold">{timeRemaining.text}</span>
                      </div>
                    </div>
                  )}

                  {/* Add Money Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddMoneyModal(goal.id);
                    }}
                    disabled={isComplete}
                    className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                      isComplete
                        ? 'bg-surface-2 text-text-muted cursor-not-allowed'
                        : 'bg-accent text-white hover:opacity-90'
                    }`}
                  >
                    {isComplete ? '✓ Goal Achieved!' : '+ Add Money'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto bg-surface-1 border border-dashed border-border-subtle rounded-xl p-12">
              <div className="text-8xl mb-6">🎯</div>
              <h2 className="text-2xl font-semibold text-text-primary mb-3">Start Your Savings Journey</h2>
              <p className="text-text-muted text-sm mb-8">
                Create your first savings goal and watch your progress grow. Every milestone counts!
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-8 py-4 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 text-lg"
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
              className="bg-surface-1 border border-border-subtle rounded-xl p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold text-text-primary mb-6">
                Create Savings Goal
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    placeholder="e.g., Emergency Fund, Vacation, Car..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Target Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newGoalTarget}
                      onChange={(e) => setNewGoalTarget(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Target Date <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={newGoalDate}
                    onChange={(e) => setNewGoalDate(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Account <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <select
                    value={newGoalAccount}
                    onChange={(e) => setNewGoalAccount(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
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
                    className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
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
                    className="flex-1 px-6 py-3 bg-surface-2 border border-border-subtle text-text-secondary rounded-xl font-medium hover:border-border-hover hover:text-text-primary transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Goal Modal */}
        {showEditModal && editingGoalId && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowEditModal(false);
              setEditingGoalId(null);
            }}
          >
            <div 
              className="bg-surface-1 border border-border-subtle rounded-xl p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold text-text-primary mb-6">
                Edit Savings Goal
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={editGoalName}
                    onChange={(e) => setEditGoalName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    placeholder="e.g., Emergency Fund, Vacation, Car..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Target Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editGoalTarget}
                      onChange={(e) => setEditGoalTarget(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Target Date <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={editGoalDate}
                    onChange={(e) => setEditGoalDate(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Account <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <select
                    value={editGoalAccount}
                    onChange={(e) => setEditGoalAccount(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
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
                    onClick={handleUpdateGoal}
                    className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
                  >
                    Update Goal
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingGoalId(null);
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
              className="bg-surface-1 border border-border-subtle rounded-xl p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold text-text-primary mb-2">
                Add Money
              </h2>
              <p className="text-text-muted mb-6">
                {goals.find(g => g.id === showAddMoneyModal)?.name}
              </p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Amount to Add
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium text-xl">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addMoneyAmount}
                      onChange={(e) => setAddMoneyAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-4 text-2xl bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none font-semibold transition-all"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={addMoneyDate}
                    onChange={(e) => setAddMoneyDate(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  />
                </div>
                {accounts.length > 0 && (
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      From Account <span className="text-text-muted font-normal">(optional)</span>
                    </label>
                    <select
                      value={addMoneyAccount}
                      onChange={(e) => setAddMoneyAccount(e.target.value)}
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
                    onClick={() => handleAddMoney(showAddMoneyModal)}
                    className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
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

export default SavingsGoals;

