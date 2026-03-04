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
  const getBudgetTransactions = useBudgetStore((state) => state.getBudgetTransactions);
  const addCategory = useBudgetStore((state) => state.addCategory);
  const removeCategory = useBudgetStore((state) => state.removeCategory);
  const updateCategory = useBudgetStore((state) => state.updateCategory);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [reportBudgetId, setReportBudgetId] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'weekly' | 'monthly' | 'yearly'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'over' | 'at-risk' | 'on-track'>('all');
  
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [newBudgetPeriod, setNewBudgetPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  
  // Edit budget states
  const [editBudgetCategory, setEditBudgetCategory] = useState('');
  const [editBudgetAmount, setEditBudgetAmount] = useState('');
  const [editBudgetPeriod, setEditBudgetPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  
  // Category management states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📌');
  
  const expenseCategories = categories.filter(c => c.type === 'expense');
  
  // First filter by year/month (base filter)
  const yearMonthFilteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      if (b.period === 'monthly') {
        return b.year === selectedYear && b.month === selectedMonth;
      } else if (b.period === 'yearly') {
        return b.year === selectedYear;
      }
      return true;
    });
  }, [budgets, selectedYear, selectedMonth]);
  
  // Then apply category, period, and status filters
  const currentBudgets = useMemo(() => {
    return yearMonthFilteredBudgets.filter(b => {
      // Category filter
      if (selectedCategory && b.categoryId !== selectedCategory) {
        return false;
      }
      
      // Period filter
      if (selectedPeriod !== 'all' && b.period !== selectedPeriod) {
        return false;
      }
      
      // Status filter - need to check budget status
      if (selectedStatus !== 'all') {
        const status = getBudgetStatus(b.id, selectedYear, selectedMonth);
        const isOverBudget = status.percentage > 100;
        const isAtRisk = status.percentage > 80 && status.percentage <= 100;
        const isOnTrack = status.percentage <= 80;
        
        if (selectedStatus === 'over' && !isOverBudget) return false;
        if (selectedStatus === 'at-risk' && !isAtRisk) return false;
        if (selectedStatus === 'on-track' && !isOnTrack) return false;
      }
      
      return true;
    });
  }, [yearMonthFilteredBudgets, selectedCategory, selectedPeriod, selectedStatus, selectedYear, selectedMonth, getBudgetStatus]);
  
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

  const handleEditBudget = (budgetId: string) => {
    const budget = budgets.find(b => b.id === budgetId);
    if (budget) {
      setEditingBudget(budgetId);
      setEditBudgetCategory(budget.categoryId);
      setEditBudgetAmount(budget.amount.toString());
      setEditBudgetPeriod(budget.period);
      setShowEditModal(true);
    }
  };

  const handleUpdateBudget = () => {
    if (!editingBudget) return;
    const amount = parseFloat(editBudgetAmount);
    if (editBudgetCategory && amount > 0) {
      updateBudget(editingBudget, {
        categoryId: editBudgetCategory,
        amount,
        period: editBudgetPeriod,
      });
      setShowEditModal(false);
      setEditingBudget(null);
      setEditBudgetCategory('');
      setEditBudgetAmount('');
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const categoryName = newCategoryName.trim();
      addCategory({
        name: categoryName,
        type: 'expense',
        icon: newCategoryIcon || '📌',
      });
      
      // If we came from the budget modal, select the new category
      // We need to get it from the store after it's added
      setTimeout(() => {
        const updatedCategories = useBudgetStore.getState().categories;
        const createdCategory = updatedCategories.find(c => 
          c.name === categoryName && c.type === 'expense'
        );
        if (createdCategory && showAddModal) {
          setNewBudgetCategory(createdCategory.id);
        }
      }, 0);
      
      setNewCategoryName('');
      setNewCategoryIcon('📌');
      setShowCategoryModal(false);
    }
  };

  const handleEditCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setEditingCategoryId(categoryId);
      setNewCategoryName(category.name);
      setNewCategoryIcon(category.icon || '📌');
      setShowCategoryModal(true);
    }
  };

  const handleUpdateCategory = () => {
    if (!editingCategoryId || !newCategoryName.trim()) return;
    
    updateCategory(editingCategoryId, {
      name: newCategoryName.trim(),
      icon: newCategoryIcon || '📌',
    });
    
    setEditingCategoryId(null);
    setNewCategoryName('');
    setNewCategoryIcon('📌');
    setShowCategoryModal(false);
  };

  const handleCancelCategoryModal = () => {
    setEditingCategoryId(null);
    setNewCategoryName('');
    setNewCategoryIcon('📌');
    setShowCategoryModal(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    // Check if category is used in any budgets
    const isUsedInBudgets = budgets.some(b => b.categoryId === categoryId);
    if (isUsedInBudgets) {
      alert('Cannot delete category: It is being used in one or more budgets. Please remove those budgets first.');
      return;
    }
    
    if (confirm('Are you sure you want to delete this category?')) {
      removeCategory(categoryId);
    }
  };

  const isCategoryUsed = (categoryId: string) => {
    return budgets.some(b => b.categoryId === categoryId);
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
  const totalLimit = currentBudgets.reduce((sum, budget) => {
    const status = getBudgetStatus(budget.id, selectedYear, selectedMonth);
    return sum + status.limit;
  }, 0);
  
  const totalSpent = currentBudgets.reduce((sum, budget) => {
    const status = getBudgetStatus(budget.id, selectedYear, selectedMonth);
    return sum + status.spent;
  }, 0);
  
  const totalRemaining = currentBudgets.reduce((sum, budget) => {
    const status = getBudgetStatus(budget.id, selectedYear, selectedMonth);
    return sum + status.remaining;
  }, 0);
  
  const averageUsage = currentBudgets.length > 0
    ? currentBudgets.reduce((sum, budget) => {
        const status = getBudgetStatus(budget.id, selectedYear, selectedMonth);
        return sum + status.percentage;
      }, 0) / currentBudgets.length
    : 0;
  
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-bg-app min-h-screen w-full max-w-full min-w-0">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 w-full">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-text-primary mb-2">
                Budget Goals
              </h1>
              <p className="text-text-muted text-sm">Track your spending limits and stay on budget</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 bg-surface-2 border border-border-subtle rounded-xl text-text-secondary focus:border-accent focus:ring-0 focus:outline-none transition-all"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-4 py-2 bg-surface-2 border border-border-subtle rounded-xl text-text-secondary focus:border-accent focus:ring-0 focus:outline-none transition-all"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {format(new Date(selectedYear, month - 1, 1), 'MMMM')}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                <span>Add Budget</span>
              </button>
            </div>
          </div>

          {/* Filters Section */}
          {yearMonthFilteredBudgets.length > 0 && (
            <div className="bg-surface-1 rounded-xl p-6 border border-border-subtle mb-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary">Filters</h3>
                  {(selectedCategory || selectedPeriod !== 'all' || selectedStatus !== 'all') && (
                    <button
                      onClick={() => {
                        setSelectedCategory('');
                        setSelectedPeriod('all');
                        setSelectedStatus('all');
                      }}
                      className="text-sm text-text-muted hover:text-text-primary font-medium underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Category Filter */}
                  <div className="flex-1">
                    <label className="block text-sm text-text-secondary mb-2">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-4 py-2 bg-surface-2 border border-border-subtle rounded-xl text-text-secondary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    >
                      <option value="">All Categories</option>
                      {expenseCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon || '📌'} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Period Filter */}
                  <div className="flex-1">
                    <label className="block text-sm text-text-secondary mb-2">
                      Period
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {(['all', 'weekly', 'monthly', 'yearly'] as const).map((period) => {
                        const labels = {
                          all: 'All',
                          weekly: 'Weekly',
                          monthly: 'Monthly',
                          yearly: 'Yearly',
                        };
                        const isSelected = selectedPeriod === period;
                        return (
                          <button
                            key={period}
                            onClick={() => setSelectedPeriod(period)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                              isSelected
                                ? 'bg-surface-3 text-text-primary border border-border-hover'
                                : 'bg-surface-1 text-text-muted border border-border-subtle hover:border-border-hover'
                            }`}
                          >
                            {labels[period]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Status Filter */}
                  <div className="flex-1">
                    <label className="block text-sm text-text-secondary mb-2">
                      Status
                    </label>
                    <div className="flex gap-2 flex-nowrap overflow-x-auto">
                      {([
                        { value: 'all', label: 'All' },
                        { value: 'over', label: 'Over Budget' },
                        { value: 'at-risk', label: 'At Risk' },
                        { value: 'on-track', label: 'On Track' },
                      ] as const).map((status) => {
                        const isSelected = selectedStatus === status.value;
                        return (
                          <button
                            key={status.value}
                            onClick={() => setSelectedStatus(status.value as typeof selectedStatus)}
                            className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                              isSelected
                                ? 'bg-surface-3 text-text-primary border border-border-hover'
                                : 'bg-surface-1 text-text-muted border border-border-subtle hover:border-border-hover'
                            }`}
                          >
                            {status.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Filter Count */}
                {currentBudgets.length !== yearMonthFilteredBudgets.length && (
                  <div className="text-text-muted text-xs pt-2 border-t border-border-subtle">
                    Showing {currentBudgets.length} of {yearMonthFilteredBudgets.length} budgets
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {currentBudgets.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Total Budget</div>
                <div className="text-3xl font-semibold text-text-primary">{formatCurrency(totalLimit)}</div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Total Spent</div>
                <div className="text-3xl font-semibold text-spending-red">{formatCurrency(totalSpent)}</div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Remaining</div>
                <div className={`text-3xl font-semibold ${totalRemaining >= 0 ? 'text-income-green' : 'text-spending-red'}`}>
                  {formatCurrency(totalRemaining)}
                </div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Avg. Usage</div>
                <div className="text-3xl font-semibold text-text-primary">{averageUsage.toFixed(1)}%</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Budgets Grid */}
        {currentBudgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentBudgets.map((budget) => {
              const status = getBudgetStatus(budget.id, selectedYear, selectedMonth);
              const category = categories.find(c => c.id === budget.categoryId);
              const isOverBudget = status.percentage > 100;
              const isWarning = status.percentage > 80 && status.percentage <= 100;
              const periodLabel = budget.period === 'monthly' ? 'Monthly' : budget.period === 'yearly' ? 'Yearly' : 'Weekly';
              const progressFillClass = isOverBudget ? 'bg-spending-red' : isWarning ? 'bg-amber' : 'bg-income-green';
              const statusBadge = isOverBudget
                ? 'bg-spending-red-dim text-spending-red text-xs rounded-lg px-2 py-0.5'
                : isWarning
                ? 'bg-amber/10 text-amber text-xs rounded-lg px-2 py-0.5'
                : 'bg-income-green-dim text-income-green text-xs rounded-lg px-2 py-0.5';
              const statusLabel = isOverBudget ? 'Over Budget' : isWarning ? 'At Risk' : 'On Track';
              
              return (
                <div
                  key={budget.id}
                  className="group bg-surface-1 border border-border-subtle rounded-xl hover:border-border-hover transition-all duration-200 overflow-hidden cursor-pointer p-6"
                  onClick={() => handleEditBudget(budget.id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl bg-surface-2 rounded-xl px-2 py-1">{category?.icon || '📌'}</div>
                      <div>
                        <h3 className="text-text-primary font-semibold text-sm">{category?.name || budget.categoryId}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-surface-2 text-text-secondary text-xs rounded-lg px-2 py-0.5">
                            {periodLabel}
                          </span>
                          <span className={statusBadge}>{statusLabel}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportBudgetId(budget.id);
                        }}
                        className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg"
                        title="View transactions"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this budget?')) {
                            removeBudget(budget.id);
                          }
                        }}
                        className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg"
                        title="Delete budget"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden flex">
                      <div
                        className={`h-full rounded-full ${progressFillClass} transition-all duration-500 ease-out`}
                        style={{ width: `${Math.min(status.percentage, 100)}%` }}
                      />
                      {isOverBudget && (
                        <div
                          className="h-full rounded-full bg-spending-red transition-all duration-500 ease-out"
                          style={{ width: `${Math.min(status.percentage - 100, 100)}%` }}
                        />
                      )}
                    </div>
                    <div className="text-text-muted text-xs mt-1">{Math.round(Math.min(status.percentage, 100))}% used</div>
                  </div>

                  {/* Amounts */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-text-muted text-xs">Spent</span>
                      <span className="text-spending-red font-semibold tabular-nums">
                        {formatCurrency(status.spent)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-text-muted text-xs">Budget Limit</span>
                      <span className="text-text-secondary text-sm tabular-nums">
                        {formatCurrency(status.limit)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-border-subtle">
                      <span className="text-text-muted text-xs">Remaining</span>
                      <span className={`font-semibold tabular-nums ${status.remaining >= 0 ? 'text-income-green' : 'text-spending-red'}`}>
                        {formatCurrency(status.remaining)}
                      </span>
                    </div>
                  </div>
                  
                  {isOverBudget && (
                    <div className="px-3 py-2 rounded-lg bg-spending-red-dim text-spending-red text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Over budget by</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(Math.abs(status.remaining))}</span>
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
              <div className="text-8xl mb-6">📊</div>
              <h2 className="text-2xl font-semibold text-text-primary mb-3">Start Budgeting</h2>
              <p className="text-text-muted text-sm mb-8">
                Create budgets for your expense categories to track spending and stay on track!
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-8 py-4 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 text-lg"
              >
                Create Your First Budget
              </button>
            </div>
          </div>
        )}
        
        {/* Add Budget Modal */}
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
                Create Budget
              </h2>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-text-secondary">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowCategoryModal(true);
                      }}
                      className="text-xs text-text-muted hover:text-text-primary font-medium underline"
                    >
                      + Create New Category
                    </button>
                  </div>
                  <select
                    value={newBudgetCategory}
                    onChange={(e) => setNewBudgetCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
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
                  <label className="block text-sm text-text-secondary mb-2">
                    Budget Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newBudgetAmount}
                      onChange={(e) => setNewBudgetAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Period
                  </label>
                  <select
                    value={newBudgetPeriod}
                    onChange={(e) => setNewBudgetPeriod(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAddBudget}
                    className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
                  >
                    Create Budget
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewBudgetCategory('');
                      setNewBudgetAmount('');
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

        {/* Edit Budget Modal */}
        {showEditModal && editingBudget && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowEditModal(false);
              setEditingBudget(null);
            }}
          >
            <div 
              className="bg-surface-1 border border-border-subtle rounded-xl p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold text-text-primary mb-6">
                Edit Budget
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Category
                  </label>
                  <select
                    value={editBudgetCategory}
                    onChange={(e) => setEditBudgetCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
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
                  <label className="block text-sm text-text-secondary mb-2">
                    Budget Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editBudgetAmount}
                      onChange={(e) => setEditBudgetAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Period
                  </label>
                  <select
                    value={editBudgetPeriod}
                    onChange={(e) => setEditBudgetPeriod(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleUpdateBudget}
                    className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
                  >
                    Update Budget
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingBudget(null);
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

        {/* Budget Transactions Modal (Budget Goals cards only) */}
        {reportBudgetId && (() => {
          const reportBudget = budgets.find((b) => b.id === reportBudgetId);
          const reportCategory = reportBudget ? categories.find((c) => c.id === reportBudget.categoryId) : null;
          const periodLabel = reportBudget?.period === 'monthly' ? 'Monthly' : reportBudget?.period === 'yearly' ? 'Yearly' : 'Weekly';
          const dateLabel = reportBudget?.period === 'yearly'
            ? `${selectedYear}`
            : `${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')}`;
          const transactions = reportBudget ? getBudgetTransactions(reportBudgetId, selectedYear, selectedMonth) : [];
          return (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setReportBudgetId(null)}
            >
              <div
                className="bg-surface-1 border border-border-subtle rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-border-subtle">
                  <h2 className="text-xl font-semibold text-text-primary">
                    {reportCategory?.icon || '📌'} {reportCategory?.name || reportBudget?.categoryId} – {periodLabel} – {dateLabel}
                  </h2>
                  <p className="text-sm text-text-muted mt-1">Transactions in this budget</p>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {transactions.length === 0 ? (
                    <p className="text-text-muted text-center py-8">No transactions in this period.</p>
                  ) : (
                    <ul className="space-y-3">
                      {transactions.map(({ date, transaction }) => (
                        <li
                          key={`${date}-${transaction.id}`}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-2 border border-border-subtle"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-text-primary truncate">{transaction.description || 'No description'}</p>
                            <p className="text-xs text-text-muted">{format(new Date(date + 'T00:00:00'), 'MMM d, yyyy')}</p>
                          </div>
                          <span className="text-spending-red font-semibold tabular-nums ml-2 shrink-0">{formatCurrency(transaction.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="p-6 border-t border-border-subtle">
                  <button
                    onClick={() => setReportBudgetId(null)}
                    className="w-full px-6 py-3 bg-surface-2 border border-border-subtle text-text-secondary rounded-xl font-medium hover:border-border-hover hover:text-text-primary transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Create/Edit Category Modal */}
        {showCategoryModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={handleCancelCategoryModal}
          >
            <div 
              className="bg-surface-1 border border-border-subtle rounded-xl p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold text-text-primary mb-6">
                {editingCategoryId ? 'Edit Category' : 'Create Category'}
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Golf, Groceries, Gas"
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Icon (Emoji)
                  </label>
                  <input
                    type="text"
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    placeholder="📌"
                    maxLength={2}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all text-2xl text-center"
                  />
                  <p className="text-xs text-text-muted mt-1">
                    Enter an emoji or icon (1-2 characters)
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={editingCategoryId ? handleUpdateCategory : handleAddCategory}
                    className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
                  >
                    {editingCategoryId ? 'Update Category' : 'Create Category'}
                  </button>
                  <button
                    onClick={handleCancelCategoryModal}
                    className="flex-1 px-6 py-3 bg-surface-2 border border-border-subtle text-text-secondary rounded-xl font-medium hover:border-border-hover hover:text-text-primary transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Management Section */}
        <div className="mt-8 bg-surface-1 rounded-xl p-6 border border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-text-primary">Manage Categories</h2>
            <button
              onClick={() => {
                setEditingCategoryId(null);
                setNewCategoryName('');
                setNewCategoryIcon('📌');
                setShowCategoryModal(true);
              }}
              className="px-4 py-2 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 text-sm"
            >
              + Add Category
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {expenseCategories.map((category) => {
              const isUsed = isCategoryUsed(category.id);
              const isDefault = category.id.startsWith('cat-exp-') || category.id.startsWith('cat-inc-');
              
              return (
                <div
                  key={category.id}
                  className="p-4 rounded-xl border border-border-subtle bg-surface-2 transition-all hover:border-border-hover"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{category.icon || '📌'}</span>
                      <span className="font-semibold text-text-primary text-sm">{category.name}</span>
                    </div>
                    {!isDefault && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditCategory(category.id)}
                          className="text-text-muted hover:text-text-primary transition-colors p-1"
                          title="Edit category"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-text-muted hover:text-spending-red transition-colors p-1"
                          title="Delete category"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  {isUsed && (
                    <p className="text-xs text-text-muted mt-1">Used in budget</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Budgets;

