import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { format, subMonths } from 'date-fns';
import { usePlaidActuals } from '../context/PlaidActualsContext';
import { usePlaidYearTransactions } from '../hooks/usePlaidYearTransactions';
import { usePlaidTransactionsInRange } from '../hooks/usePlaidTransactionsInRange';
import { usePlaidRecurringFirestore } from '../hooks/usePlaidRecurringFirestore';
import { usePlaidRecurringReview } from '../hooks/usePlaidRecurringReview';
import { usePlaidAccounts } from '../hooks/usePlaidAccounts';
import { usePlaidTransactionCategoryOverrides } from '../hooks/usePlaidTransactionCategoryOverrides';
import { usePlaidTransactionCategoryRules } from '../hooks/usePlaidTransactionCategoryRules';
import { getPlaidBudgetStatus, getPlaidBudgetTransactionsAsStoreShape } from '../utils/plaidBudget';
import { buildWeeklySpendablePlanner, type PlannerHorizon } from '../utils/forecastPlanner';
import { deriveLegacyBudgetWindow, getBudgetWindow } from '../utils/budgetPeriods';
import type { Budget } from '../types';

const Budgets: React.FC = () => {
  const budgets = useBudgetStore((state) => state.budgets);
  const categories = useBudgetStore((state) => state.categories);
  const addBudget = useBudgetStore((state) => state.addBudget);
  const removeBudget = useBudgetStore((state) => state.removeBudget);
  const updateBudget = useBudgetStore((state) => state.updateBudget);
  const getBudgetStatus = useBudgetStore((state) => state.getBudgetStatus);
  const getBudgetTransactions = useBudgetStore((state) => state.getBudgetTransactions);
  const { usePlaidForActuals } = usePlaidActuals();
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
  const [plannerHorizon, setPlannerHorizon] = useState<PlannerHorizon>('weekly');
  const [safetyBuffer, setSafetyBuffer] = useState(100);
  const [hasUserEditedBuffer, setHasUserEditedBuffer] = useState(false);
  const [txRuleApplyById, setTxRuleApplyById] = useState<Record<string, boolean>>({});
  const [txCategorySavingById, setTxCategorySavingById] = useState<Record<string, boolean>>({});

  const { transactions: plaidTransactions } = usePlaidYearTransactions(
    usePlaidForActuals ? selectedYear : null
  );
  const { data: plaidRecurring } = usePlaidRecurringFirestore();
  const { overrides: recurringOverrides } = usePlaidRecurringReview();
  const { accounts: plaidAccounts } = usePlaidAccounts();
  const {
    overrides: txCategoryOverrides,
    saveOverride: saveTxCategoryOverride,
    error: txCategoryOverridesError,
  } = usePlaidTransactionCategoryOverrides();
  const {
    rules: txCategoryRules,
    saveRule: saveTxCategoryRule,
    error: txCategoryRulesError,
  } = usePlaidTransactionCategoryRules();
  const forecastRangeStart = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
  const forecastRangeEnd = format(new Date(), 'yyyy-MM-dd');
  const { transactions: forecastSourceTransactions } = usePlaidTransactionsInRange(
    forecastRangeStart,
    forecastRangeEnd
  );

  const resolvedBudgetStatus = useMemo(
    () => (budgetId: string) => {
      const b = budgets.find((x) => x.id === budgetId);
      if (!b) return getBudgetStatus(budgetId, selectedYear, selectedMonth);
      if (usePlaidForActuals) {
        return getPlaidBudgetStatus(
          plaidTransactions,
          b,
          categories,
          txCategoryOverrides,
          txCategoryRules,
          selectedYear,
          selectedMonth
        );
      }
      return getBudgetStatus(budgetId, selectedYear, selectedMonth);
    },
    [
      budgets,
      categories,
      getBudgetStatus,
      plaidTransactions,
      txCategoryOverrides,
      txCategoryRules,
      usePlaidForActuals,
      selectedYear,
      selectedMonth,
    ]
  );

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'weekly' | 'biweekly' | 'monthly'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'over' | 'at-risk' | 'on-track'>('all');
  
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [newBudgetPeriod, setNewBudgetPeriod] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  
  // Edit budget states
  const [editBudgetCategory, setEditBudgetCategory] = useState('');
  const [editBudgetAmount, setEditBudgetAmount] = useState('');
  const [editBudgetPeriod, setEditBudgetPeriod] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  
  // Category management states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📌');
  
  const expenseCategories = categories.filter(c => c.type === 'expense');
  
  const resolveBudgetWindow = useCallback((budget: Budget) => {
    return budget.windowStart && budget.windowEnd
      ? { windowStart: budget.windowStart, windowEnd: budget.windowEnd }
      : deriveLegacyBudgetWindow(
          budget as Partial<Budget> & { period?: string },
          selectedYear,
          selectedMonth
        );
  }, [selectedYear, selectedMonth]);

  // First filter by active month window (base filter)
  const yearMonthFilteredBudgets = useMemo(() => {
    const monthWindow = getBudgetWindow({
      period: 'monthly',
      referenceDate: new Date(selectedYear, selectedMonth - 1, 1),
    });
    return budgets.filter(b => {
      const budgetWindow = resolveBudgetWindow(b);
      return budgetWindow.windowEnd >= monthWindow.windowStart && budgetWindow.windowStart <= monthWindow.windowEnd;
    });
  }, [budgets, selectedYear, selectedMonth, resolveBudgetWindow]);
  
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
        const status = resolvedBudgetStatus(b.id);
        const isOverBudget = status.percentage > 100;
        const isAtRisk = status.percentage > 80 && status.percentage <= 100;
        const isOnTrack = status.percentage <= 80;
        
        if (selectedStatus === 'over' && !isOverBudget) return false;
        if (selectedStatus === 'at-risk' && !isAtRisk) return false;
        if (selectedStatus === 'on-track' && !isOnTrack) return false;
      }
      
      return true;
    });
  }, [yearMonthFilteredBudgets, selectedCategory, selectedPeriod, selectedStatus, resolvedBudgetStatus]);
  
  const handleAddBudget = () => {
    const amount = parseFloat(newBudgetAmount);
    if (newBudgetCategory && amount > 0) {
      const budgetWindow = getBudgetWindow({
        period: newBudgetPeriod,
        referenceDate: new Date(selectedYear, selectedMonth - 1, 1),
      });
      addBudget({
        categoryId: newBudgetCategory,
        amount,
        period: newBudgetPeriod,
        year: selectedYear, // Legacy compatibility
        month: selectedMonth, // Legacy compatibility
        windowStart: budgetWindow.windowStart,
        windowEnd: budgetWindow.windowEnd,
        version: 2,
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
        ...getBudgetWindow({
          period: editBudgetPeriod,
          referenceDate: new Date(selectedYear, selectedMonth - 1, 1),
        }),
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
    const status = resolvedBudgetStatus(budget.id);
    return sum + status.limit;
  }, 0);
  
  const totalSpent = currentBudgets.reduce((sum, budget) => {
    const status = resolvedBudgetStatus(budget.id);
    return sum + status.spent;
  }, 0);
  
  const totalRemaining = currentBudgets.reduce((sum, budget) => {
    const status = resolvedBudgetStatus(budget.id);
    return sum + status.remaining;
  }, 0);
  
  const averageUsage = currentBudgets.length > 0
    ? currentBudgets.reduce((sum, budget) => {
        const status = resolvedBudgetStatus(budget.id);
        return sum + status.percentage;
      }, 0) / currentBudgets.length
    : 0;

  const planner = useMemo(
    () =>
      buildWeeklySpendablePlanner({
        safetyBuffer,
        horizon: plannerHorizon,
        plaidAccounts,
        plaidRecurring,
        recurringOverrides,
        forecastSourceTransactions,
      }),
    [
      plannerHorizon,
      safetyBuffer,
      plaidAccounts,
      plaidRecurring,
      recurringOverrides,
      forecastSourceTransactions,
    ]
  );
  const hasPlannerEvents = planner.events.length > 0;
  const plannerWindow = {
    windowStart: planner.windowStart,
    windowEnd: planner.windowEnd,
  };
  const allocatedInPlannerWindow = budgets.reduce((sum, budget) => {
    const budgetWindow = resolveBudgetWindow(budget);
    const overlapsPlannerWindow =
      budgetWindow.windowEnd >= plannerWindow.windowStart &&
      budgetWindow.windowStart <= plannerWindow.windowEnd;
    if (!overlapsPlannerWindow) return sum;
    return sum + budget.amount;
  }, 0);
  const unallocatedInPlannerWindow = planner.safeSpendable - allocatedInPlannerWindow;
  const isPlannerOverAllocated = unallocatedInPlannerWindow < 0;
  const plannerHasShortfall = planner.grossSpendable < 0;
  const plannerConfidencePercent = Math.round(planner.confidence.score * 100);
  const plannerConfidenceClass =
    planner.confidence.label === 'High'
      ? 'bg-income-green-dim text-income-green'
      : planner.confidence.label === 'Medium'
        ? 'bg-amber/10 text-amber'
        : 'bg-spending-red-dim text-spending-red';
  const horizonLabel =
    plannerHorizon === 'weekly'
      ? 'Calendar week (Mon-Sun)'
      : plannerHorizon === 'biweekly'
        ? '2-week calendar block (Mon-Sun x2)'
        : 'Current calendar month';
  const spendableLabel =
    plannerHorizon === 'weekly'
      ? 'Spendable this week'
      : plannerHorizon === 'biweekly'
        ? 'Spendable this 2 weeks'
        : 'Spendable this month';

  useEffect(() => {
    if (hasUserEditedBuffer) return;
    const roundedStartingCash = Math.max(0, Math.round(planner.startingCash * 100) / 100);
    if (Math.abs(safetyBuffer - roundedStartingCash) < 0.005) return;
    setSafetyBuffer(roundedStartingCash);
  }, [hasUserEditedBuffer, planner.startingCash, safetyBuffer]);

  const updateSafetyBufferFromUser = (nextValue: number) => {
    setHasUserEditedBuffer(true);
    setSafetyBuffer(Math.max(0, Number.isFinite(nextValue) ? nextValue : 0));
  };

  const plaidTxById = useMemo(() => {
    const map = new Map<string, (typeof plaidTransactions)[number]>();
    plaidTransactions.forEach((tx) => map.set(tx.transaction_id, tx));
    return map;
  }, [plaidTransactions]);

  const handleSaveTransactionCategory = useCallback(
    async (transactionId: string, nextCategoryId: string) => {
      const categoryId = nextCategoryId.trim();
      if (!categoryId) return;
      setTxCategorySavingById((prev) => ({ ...prev, [transactionId]: true }));
      try {
        await saveTxCategoryOverride({ transactionId, categoryId });
        if (txRuleApplyById[transactionId]) {
          const tx = plaidTxById.get(transactionId);
          const merchantContains = (tx?.merchant_name ?? tx?.name ?? '').trim();
          if (merchantContains.length > 0) {
            const nextPriority =
              txCategoryRules.length > 0
                ? Math.max(...txCategoryRules.map((rule) => rule.priority)) + 1
                : 100;
            await saveTxCategoryRule({
              categoryId,
              priority: nextPriority,
              matcher: {
                merchantContains,
                accountId: tx?.account_id ?? undefined,
                direction: tx && tx.amount < 0 ? 'income' : 'expense',
              },
            });
          }
        }
      } catch (err) {
        console.error('Save transaction category failed', err);
        alert(
          err instanceof Error
            ? `Could not save category: ${err.message}`
            : 'Could not save category. Please try again.'
        );
      } finally {
        setTxCategorySavingById((prev) => ({ ...prev, [transactionId]: false }));
        setTxRuleApplyById((prev) => ({ ...prev, [transactionId]: false }));
      }
    },
    [
      plaidTxById,
      saveTxCategoryOverride,
      saveTxCategoryRule,
      txCategoryRules,
      txRuleApplyById,
    ]
  );
  
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-bg-app min-h-screen w-full max-w-full min-w-0">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 w-full">
        {/* Header Section */}
        <div className="mb-8">
          <div data-tour="tour-budgets-header" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
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

          {(txCategoryOverridesError || txCategoryRulesError) && usePlaidForActuals && (
            <div
              className="mb-6 rounded-xl border border-spending-red/40 bg-spending-red-dim px-4 py-3 text-sm text-text-primary"
              role="alert"
            >
              <p className="font-medium">Bank transaction categories cannot sync</p>
              <p className="mt-1 text-text-secondary">
                {txCategoryOverridesError?.message ?? txCategoryRulesError?.message}
              </p>
            </div>
          )}

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
                      {(['all', 'weekly', 'biweekly', 'monthly'] as const).map((period) => {
                        const labels = {
                          all: 'All',
                          weekly: 'Weekly',
                          biweekly: 'Bi-Weekly',
                          monthly: 'Monthly',
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

          <div data-tour="tour-budgets-planner" className="bg-surface-1 border border-border-subtle rounded-xl p-6 mb-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Spendable Planner</h3>
                <p className="text-text-muted text-sm mt-1">
                  {horizonLabel} forecast based on expected recurring items ({format(new Date(`${planner.windowStart}T00:00:00`), 'MMM d')} - {format(new Date(`${planner.windowEnd}T00:00:00`), 'MMM d')}).
                </p>
                <p className="text-text-muted text-xs mt-1">
                  Default buffer protects your current cash so spendable starts income-based.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs rounded-lg px-2 py-1 font-medium ${plannerConfidenceClass}`}>
                  {planner.confidence.label} confidence ({plannerConfidencePercent}%)
                </span>
                <span className="text-xs text-text-muted">
                  O:{planner.confidence.sourceMix.overrides} P:{planner.confidence.sourceMix.plaid}
                </span>
              </div>
            </div>

            <div className="mt-4 inline-flex rounded-lg border border-border-subtle bg-surface-2 p-1">
              {([
                { id: 'weekly', label: 'Weekly' },
                { id: 'biweekly', label: 'Bi-Weekly' },
                { id: 'monthly', label: 'Monthly' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPlannerHorizon(tab.id)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    plannerHorizon === tab.id
                      ? 'bg-surface-3 text-text-primary'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
              <div className="bg-surface-2 rounded-xl border border-border-subtle p-4">
                <div className="text-xs uppercase tracking-widest text-text-muted mb-1">{spendableLabel}</div>
                <div className={`text-2xl font-semibold tabular-nums ${planner.safeSpendable > 0 ? 'text-income-green' : 'text-text-primary'}`}>
                  {formatCurrency(planner.safeSpendable)}
                </div>
              </div>
              <div className="bg-surface-2 rounded-xl border border-border-subtle p-4">
                <div className="text-xs uppercase tracking-widest text-text-muted mb-1">Spendable per day</div>
                <div className={`text-2xl font-semibold tabular-nums ${planner.dailyAllowance > 0 ? 'text-income-green' : 'text-text-primary'}`}>
                  {formatCurrency(planner.dailyAllowance)}
                </div>
              </div>
              <div className="bg-surface-2 rounded-xl border border-border-subtle p-4">
                <div className="text-xs uppercase tracking-widest text-text-muted mb-1">Projected income</div>
                <div className="text-2xl font-semibold tabular-nums text-income-green">
                  {formatCurrency(planner.projectedIncome)}
                </div>
              </div>
              <div className="bg-surface-2 rounded-xl border border-border-subtle p-4">
                <div className="text-xs uppercase tracking-widest text-text-muted mb-1">Projected fixed expenses</div>
                <div className="text-2xl font-semibold tabular-nums text-spending-red">
                  {formatCurrency(planner.projectedFixedExpenses)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-surface-2 rounded-xl border border-border-subtle p-4">
                <div className="text-xs uppercase tracking-widest text-text-muted mb-1">Allocated (this planner window)</div>
                <div className="text-lg font-semibold tabular-nums text-text-primary">
                  {formatCurrency(allocatedInPlannerWindow)}
                </div>
              </div>
              <div className="bg-surface-2 rounded-xl border border-border-subtle p-4">
                <div className="text-xs uppercase tracking-widest text-text-muted mb-1">Unallocated</div>
                <div className={`text-lg font-semibold tabular-nums ${isPlannerOverAllocated ? 'text-spending-red' : 'text-income-green'}`}>
                  {formatCurrency(unallocatedInPlannerWindow)}
                </div>
              </div>
              <div className={`rounded-xl border p-4 ${isPlannerOverAllocated ? 'border-spending-red/40 bg-spending-red-dim' : 'border-income-green/40 bg-income-green-dim'}`}>
                <div className={`text-sm font-medium ${isPlannerOverAllocated ? 'text-spending-red' : 'text-income-green'}`}>
                  {isPlannerOverAllocated
                    ? 'Allocated budgets exceed spendable for this horizon.'
                    : 'You still have spendable room to allocate by category.'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div className="bg-surface-2 rounded-xl border border-border-subtle p-4">
                <div className="text-xs uppercase tracking-widest text-text-muted mb-1">Starting cash</div>
                <div className="text-lg font-semibold tabular-nums text-text-primary">
                  {formatCurrency(planner.startingCash)}
                </div>
              </div>
              <div className="bg-surface-2 rounded-xl border border-border-subtle p-4">
                <div className="text-xs uppercase tracking-widest text-text-muted mb-1">Gross spendable</div>
                <div className={`text-lg font-semibold tabular-nums ${planner.grossSpendable >= 0 ? 'text-text-primary' : 'text-spending-red'}`}>
                  {formatCurrency(planner.grossSpendable)}
                </div>
              </div>
              <div className="bg-surface-2 rounded-xl border border-border-subtle p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-widest text-text-muted">Safety buffer</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateSafetyBufferFromUser(safetyBuffer - 25)}
                      className="px-2 py-1 rounded-lg bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary"
                      aria-label="Decrease safety buffer"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSafetyBufferFromUser(safetyBuffer + 25)}
                      className="px-2 py-1 rounded-lg bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary"
                      aria-label="Increase safety buffer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={safetyBuffer}
                    onChange={(e) => updateSafetyBufferFromUser(Number(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 bg-surface-3 border border-border-subtle rounded-lg text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {!hasPlannerEvents && (
              <div className="mt-4 rounded-xl border border-border-subtle bg-surface-2 px-4 py-3 text-sm text-text-muted">
                No approved recurring Plaid expenses yet. Review recurring items to improve planner accuracy.
              </div>
            )}
            {plannerHasShortfall && (
              <div className="mt-4 rounded-xl border border-spending-red/40 bg-spending-red-dim px-4 py-3 text-sm text-spending-red">
                Projected shortfall detected. Expected recurring expenses exceed available cash plus recurring income for this period.
              </div>
            )}
          </div>
        </div>
        
        {/* Budgets Grid */}
        <div data-tour="tour-budgets-list">
        {currentBudgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentBudgets.map((budget) => {
              const status = resolvedBudgetStatus(budget.id);
              const category = categories.find(c => c.id === budget.categoryId);
              const isOverBudget = status.percentage > 100;
              const isWarning = status.percentage > 80 && status.percentage <= 100;
              const periodLabel = budget.period === 'monthly' ? 'Monthly' : budget.period === 'biweekly' ? 'Bi-Weekly' : 'Weekly';
              const budgetWindow = resolveBudgetWindow(budget);
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
                          <span className="bg-surface-2 text-text-muted text-xs rounded-lg px-2 py-0.5">
                            {format(new Date(`${budgetWindow.windowStart}T00:00:00`), 'MMM d')} - {format(new Date(`${budgetWindow.windowEnd}T00:00:00`), 'MMM d')}
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
        </div>
        
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
                    onChange={(e) => setNewBudgetPeriod(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <p className="text-xs text-text-muted mt-2">
                    Window: {(() => {
                      const window = getBudgetWindow({
                        period: newBudgetPeriod,
                        referenceDate: new Date(selectedYear, selectedMonth - 1, 1),
                      });
                      return `${format(new Date(`${window.windowStart}T00:00:00`), 'MMM d, yyyy')} - ${format(new Date(`${window.windowEnd}T00:00:00`), 'MMM d, yyyy')}`;
                    })()}
                  </p>
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
                    onChange={(e) => setEditBudgetPeriod(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <p className="text-xs text-text-muted mt-2">
                    Window: {(() => {
                      const window = getBudgetWindow({
                        period: editBudgetPeriod,
                        referenceDate: new Date(selectedYear, selectedMonth - 1, 1),
                      });
                      return `${format(new Date(`${window.windowStart}T00:00:00`), 'MMM d, yyyy')} - ${format(new Date(`${window.windowEnd}T00:00:00`), 'MMM d, yyyy')}`;
                    })()}
                  </p>
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
          const periodLabel = reportBudget?.period === 'monthly' ? 'Monthly' : reportBudget?.period === 'biweekly' ? 'Bi-Weekly' : 'Weekly';
          const reportWindow = reportBudget
            ? resolveBudgetWindow(reportBudget)
            : null;
          const dateLabel = reportWindow
            ? `${format(new Date(`${reportWindow.windowStart}T00:00:00`), 'MMM d, yyyy')} - ${format(new Date(`${reportWindow.windowEnd}T00:00:00`), 'MMM d, yyyy')}`
            : `${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy')}`;
          const budgetTxList = reportBudget
            ? usePlaidForActuals
              ? getPlaidBudgetTransactionsAsStoreShape(
                  plaidTransactions,
                  reportBudget,
                  categories,
                  txCategoryOverrides,
                  txCategoryRules,
                  selectedYear,
                  selectedMonth
                )
              : getBudgetTransactions(reportBudgetId, selectedYear, selectedMonth)
            : [];
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
                  {budgetTxList.length === 0 ? (
                    <p className="text-text-muted text-center py-8">No transactions in this period.</p>
                  ) : (
                    <ul className="space-y-3">
                      {budgetTxList.map(({ date, transaction }) => (
                        <li
                          key={`${date}-${transaction.id}`}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-2 border border-border-subtle"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-text-primary truncate">{transaction.description || 'No description'}</p>
                            <p className="text-xs text-text-muted">{format(new Date(date + 'T00:00:00'), 'MMM d, yyyy')}</p>
                            {usePlaidForActuals && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <select
                                  value={transaction.category ?? ''}
                                  onChange={(e) => void handleSaveTransactionCategory(transaction.id, e.target.value)}
                                  disabled={txCategorySavingById[transaction.id]}
                                  className="rounded-lg border border-border-subtle bg-surface-1 px-2 py-1 text-xs text-text-primary"
                                >
                                  <option value="">Select category</option>
                                  {categories
                                    .filter((cat) =>
                                      transaction.type === 'income'
                                        ? cat.type === 'income'
                                        : cat.type === 'expense'
                                    )
                                    .map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.icon || '📌'} {cat.name}
                                    </option>
                                  ))}
                                </select>
                                <label className="inline-flex items-center gap-1 text-xs text-text-muted">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(txRuleApplyById[transaction.id])}
                                    onChange={(e) =>
                                      setTxRuleApplyById((prev) => ({
                                        ...prev,
                                        [transaction.id]: e.target.checked,
                                      }))
                                    }
                                  />
                                  Apply to future similar transactions
                                </label>
                              </div>
                            )}
                          </div>
                          <span
                            className={`font-semibold tabular-nums ml-2 shrink-0 ${
                              transaction.type === 'income' ? 'text-income-green' : 'text-spending-red'
                            }`}
                          >
                            {transaction.type === 'income' ? '+' : ''}
                            {formatCurrency(transaction.amount)}
                          </span>
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

