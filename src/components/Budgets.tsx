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
  const addCategory = useBudgetStore((state) => state.addCategory);
  const removeCategory = useBudgetStore((state) => state.removeCategory);
  const updateCategory = useBudgetStore((state) => state.updateCategory);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
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
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-slate-50/50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                Budget Goals
              </h1>
              <p className="text-gray-600 text-lg">Track your spending limits and stay on budget</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {currentBudgets.some(b => b.period === 'monthly') && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-4 py-2 border-2 border-gray-200 rounded-xl bg-white shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none"
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
                className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                <span>Add Budget</span>
              </button>
            </div>
          </div>

          {/* Filters Section */}
          {yearMonthFilteredBudgets.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                  {(selectedCategory || selectedPeriod !== 'all' || selectedStatus !== 'all') && (
                    <button
                      onClick={() => {
                        setSelectedCategory('');
                        setSelectedPeriod('all');
                        setSelectedStatus('all');
                      }}
                      className="text-sm text-slate-600 hover:text-slate-900 font-medium underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Category Filter */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl bg-white shadow-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${
                              isSelected
                                ? 'bg-slate-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <div className="flex gap-2 flex-nowrap overflow-x-auto">
                      {([
                        { value: 'all', label: 'All', color: 'gray' },
                        { value: 'over', label: 'Over Budget', color: 'red' },
                        { value: 'at-risk', label: 'At Risk', color: 'yellow' },
                        { value: 'on-track', label: 'On Track', color: 'emerald' },
                      ] as const).map((status) => {
                        const isSelected = selectedStatus === status.value;
                        const colorClasses = {
                          gray: isSelected ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                          red: isSelected ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100',
                          yellow: isSelected ? 'bg-yellow-600 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
                          emerald: isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                        };
                        return (
                          <button
                            key={status.value}
                            onClick={() => setSelectedStatus(status.value as typeof selectedStatus)}
                            className={`px-3 py-2 rounded-xl font-medium transition-all shadow-sm whitespace-nowrap flex-shrink-0 ${
                              colorClasses[status.color]
                            } ${isSelected ? 'shadow-md' : ''}`}
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
                  <div className="text-sm text-gray-600 pt-2 border-t border-gray-200">
                    Showing {currentBudgets.length} of {yearMonthFilteredBudgets.length} budgets
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {currentBudgets.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Total Budget</div>
                <div className="text-3xl font-bold text-slate-700">{formatCurrency(totalLimit)}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Total Spent</div>
                <div className="text-3xl font-bold text-red-600">{formatCurrency(totalSpent)}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Remaining</div>
                <div className={`text-3xl font-bold ${totalRemaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(totalRemaining)}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Avg. Usage</div>
                <div className="text-3xl font-bold text-blue-600">{averageUsage.toFixed(1)}%</div>
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
              
              // Gradient colors based on budget status - matching sidebar slate-900 theme
              const gradientColors = isOverBudget
                ? 'from-red-500 via-red-600 to-red-700'
                : isWarning
                ? 'from-yellow-500 via-yellow-600 to-yellow-700'
                : status.percentage > 50
                ? 'from-slate-700 via-slate-800 to-slate-900'
                : 'from-slate-600 via-slate-700 to-slate-800';
              
              const periodLabel = budget.period === 'monthly' ? 'Monthly' : budget.period === 'yearly' ? 'Yearly' : 'Weekly';
              
              return (
                <div
                  key={budget.id}
                  className={`group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:scale-[1.02] cursor-pointer ${
                    isOverBudget ? 'ring-2 ring-red-400 ring-opacity-50' : ''
                  }`}
                  onClick={() => handleEditBudget(budget.id)}
                >
                  {/* Gradient Header */}
                  <div className={`bg-gradient-to-r ${gradientColors} p-6 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                    
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-4xl">{category?.icon || '📌'}</div>
                          <div>
                            <h3 className="text-xl font-bold">{category?.name || budget.categoryId}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full font-medium">
                                {periodLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this budget?')) {
                              removeBudget(budget.id);
                            }
                          }}
                          className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded-lg"
                          title="Delete budget"
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
                              strokeDashoffset={`${2 * Math.PI * 56 * (1 - Math.min(status.percentage, 100) / 100)}`}
                              strokeLinecap="round"
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-3xl font-bold">{Math.round(Math.min(status.percentage, 100))}%</div>
                              {isOverBudget && (
                                <div className="text-xs mt-1 animate-pulse">⚠️ Over Budget!</div>
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
                        <span className="text-sm text-gray-600">Spent</span>
                        <span className="text-2xl font-bold text-red-600">
                          {formatCurrency(status.spent)}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600">Budget Limit</span>
                        <span className="text-xl font-semibold text-gray-900">
                          {formatCurrency(status.limit)}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-600">Remaining</span>
                        <span className={`text-lg font-semibold ${status.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(status.remaining)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Linear Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${gradientColors} transition-all duration-1000 ease-out shadow-sm`}
                          style={{ width: `${Math.min(status.percentage, 100)}%` }}
                        />
                        {isOverBudget && (
                          <div
                            className="h-full rounded-full bg-red-600 transition-all duration-1000 ease-out shadow-sm"
                            style={{ width: `${status.percentage - 100}%` }}
                          />
                        )}
                      </div>
                    </div>
                    
                    {isOverBudget && (
                      <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Over budget by</span>
                          <span className="font-semibold">{formatCurrency(Math.abs(status.remaining))}</span>
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
              <div className="text-8xl mb-6">📊</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Start Budgeting</h2>
              <p className="text-gray-600 text-lg mb-8">
                Create budgets for your expense categories to track spending and stay on track!
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-lg"
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
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Create Budget
              </h2>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowCategoryModal(true);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
                    >
                      + Create New Category
                    </button>
                  </div>
                  <select
                    value={newBudgetCategory}
                    onChange={(e) => setNewBudgetCategory(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none bg-white"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Budget Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newBudgetAmount}
                      onChange={(e) => setNewBudgetAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Period
                  </label>
                  <select
                    value={newBudgetPeriod}
                    onChange={(e) => setNewBudgetPeriod(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none bg-white"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAddBudget}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl font-semibold hover:from-slate-700 hover:to-slate-800 shadow-md hover:shadow-lg transition-all"
                  >
                    Create Budget
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewBudgetCategory('');
                      setNewBudgetAmount('');
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
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Edit Budget
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={editBudgetCategory}
                    onChange={(e) => setEditBudgetCategory(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none bg-white"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Budget Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editBudgetAmount}
                      onChange={(e) => setEditBudgetAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Period
                  </label>
                  <select
                    value={editBudgetPeriod}
                    onChange={(e) => setEditBudgetPeriod(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none bg-white"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleUpdateBudget}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl font-semibold hover:from-slate-700 hover:to-slate-800 shadow-md hover:shadow-lg transition-all"
                  >
                    Update Budget
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingBudget(null);
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

        {/* Create/Edit Category Modal */}
        {showCategoryModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={handleCancelCategoryModal}
          >
            <div 
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {editingCategoryId ? 'Edit Category' : 'Create Category'}
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Golf, Groceries, Gas"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Icon (Emoji)
                  </label>
                  <input
                    type="text"
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    placeholder="📌"
                    maxLength={2}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-all outline-none text-2xl text-center"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter an emoji or icon (1-2 characters)
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={editingCategoryId ? handleUpdateCategory : handleAddCategory}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl font-semibold hover:from-slate-700 hover:to-slate-800 shadow-md hover:shadow-lg transition-all"
                  >
                    {editingCategoryId ? 'Update Category' : 'Create Category'}
                  </button>
                  <button
                    onClick={handleCancelCategoryModal}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Management Section */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Manage Categories</h2>
            <button
              onClick={() => {
                setEditingCategoryId(null);
                setNewCategoryName('');
                setNewCategoryIcon('📌');
                setShowCategoryModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 font-semibold shadow-md hover:shadow-lg transition-all text-sm"
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
                  className={`p-4 rounded-xl border-2 ${
                    isUsed 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-gray-200 bg-white'
                  } transition-all`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{category.icon || '📌'}</span>
                      <span className="font-semibold text-gray-900 text-sm">{category.name}</span>
                    </div>
                    {!isDefault && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditCategory(category.id)}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="Edit category"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
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
                    <p className="text-xs text-blue-600 mt-1">Used in budget</p>
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

