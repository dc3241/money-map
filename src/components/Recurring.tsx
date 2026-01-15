import React, { useState, useMemo } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import type { RecurringExpense, RecurringIncome, RecurrencePattern } from '../types';
import { formatRecurrencePattern, getNextOccurrence } from '../utils/recurrenceUtils';
import { format } from 'date-fns';

// Category options
const EXPENSE_CATEGORIES = [
  'Housing',
  'Utilities',
  'Food & Dining',
  'Transportation',
  'Insurance',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Rental',
  'Bonus',
  'Other',
];

// Category icons mapping (using emoji for simplicity, can be replaced with icon library)
const CATEGORY_ICONS: Record<string, string> = {
  'Housing': '🏠',
  'Utilities': '⚡',
  'Food & Dining': '🍽️',
  'Transportation': '🚗',
  'Insurance': '🛡️',
  'Healthcare': '🏥',
  'Entertainment': '🎬',
  'Shopping': '🛍️',
  'Bills': '📄',
  'Salary': '💼',
  'Freelance': '💻',
  'Investment': '📈',
  'Rental': '🏘️',
  'Bonus': '🎁',
  'Other': '📌',
};

type SortOption = 'amount' | 'nextOccurrence' | 'description' | 'category';

// Remove unused parameter

interface RecurringItemFormProps {
  type: 'expense' | 'income';
  initialData?: Partial<RecurringExpense | RecurringIncome>;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const RecurringItemForm: React.FC<RecurringItemFormProps> = ({ type, initialData, onSave, onCancel }) => {
  const accounts = useBudgetStore((state) => state.accounts);
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [accountId, setAccountId] = useState(initialData?.accountId || '');
  const [recurrenceType, setRecurrenceType] = useState<RecurrencePattern['type']>(
    initialData?.pattern?.type || (type === 'expense' ? 'monthly' : 'weekly')
  );
  
  // Initialize dayType based on recurrenceType, ensuring monthly items always use dayOfMonth
  const getInitialDayType = (): RecurrencePattern['dayType'] => {
    if (initialData?.pattern?.dayType) {
      return initialData.pattern.dayType;
    }
    const patternType = initialData?.pattern?.type || (type === 'expense' ? 'monthly' : 'weekly');
    if (patternType === 'weekly' || patternType === 'biweekly') {
      return 'dayOfWeek';
    } else if (patternType === 'monthly' || patternType === 'quarterly' || patternType === 'semiannual') {
      return 'dayOfMonth';
    }
    return undefined;
  };
  
  const [dayType, setDayType] = useState<RecurrencePattern['dayType']>(getInitialDayType());
  
  const [dayValue, setDayValue] = useState<number>(() => {
    if (initialData?.pattern?.dayValue !== undefined) {
      return initialData.pattern.dayValue;
    }
    // Handle lastDayOfMonth case
    if (initialData?.pattern?.dayType === 'lastDayOfMonth') {
      return -1;
    }
    return type === 'expense' ? 1 : 1;
  });
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [isActive, setIsActive] = useState(initialData?.isActive !== undefined ? initialData.isActive : true);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    
    if (numAmount > 0 && description.trim()) {
      const pattern: RecurrencePattern = {
        type: recurrenceType,
        dayType: dayValue === -1 ? 'lastDayOfMonth' : dayType,
        dayValue: dayValue === -1 ? undefined : dayValue,
      };

      onSave({
        amount: numAmount,
        description: description.trim(),
        category: category || undefined,
        accountId: accountId || undefined,
        pattern,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        isActive,
      });
    }
  };

  const borderColor = type === 'expense' ? 'border-red-300' : 'border-green-300';
  const bgColor = type === 'expense' ? 'bg-red-50' : 'bg-green-50';
  const buttonColor = type === 'expense' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600';

  return (
    <form onSubmit={handleSubmit} className={`p-4 ${bgColor} rounded-lg border-2 ${borderColor} space-y-3`}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_ICONS[cat]} {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Netflix, Rent, Salary"
          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
          required
        />
      </div>

      {accounts.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account (optional)</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
          <select
            value={recurrenceType}
            onChange={(e) => {
              const newType = e.target.value as RecurrencePattern['type'];
              setRecurrenceType(newType);
              // Auto-adjust dayType based on frequency
              if (newType === 'weekly' || newType === 'biweekly') {
                setDayType('dayOfWeek');
                // Reset dayValue to a valid day of week if needed
                if (dayValue > 6) {
                  setDayValue(1);
                }
              } else if (newType === 'monthly' || newType === 'quarterly' || newType === 'semiannual') {
                setDayType('dayOfMonth');
                // Reset dayValue to a valid day of month if needed
                if (dayValue > 31 || (dayValue < 1 && dayValue !== -1)) {
                  setDayValue(1);
                }
              } else {
                setDayType(undefined);
              }
            }}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="semiannual">Semi-annually</option>
            <option value="annual">Annually</option>
          </select>
        </div>

        {/* Always show day selector when frequency requires it */}
        {(recurrenceType === 'weekly' || recurrenceType === 'biweekly') && dayType === 'dayOfWeek' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
            <select
              value={dayValue}
              onChange={(e) => setDayValue(parseInt(e.target.value))}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
            >
              {weekDays.map((day, index) => (
                <option key={index} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        )}

        {(recurrenceType === 'monthly' || recurrenceType === 'quarterly' || recurrenceType === 'semiannual') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day of Month</label>
            <select
              value={dayValue === -1 ? 'last' : dayValue}
              onChange={(e) => {
                const val = e.target.value;
                setDayValue(val === 'last' ? -1 : parseInt(val));
              }}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
              <option value="last">Last day of month</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (optional)</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
          Active (uncheck to pause)
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className={`flex-1 px-4 py-2 ${buttonColor} text-white rounded-lg font-semibold transition-colors`}
        >
          {initialData ? 'Update' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

interface RecurringItemCardProps {
  item: RecurringExpense | RecurringIncome;
  type: 'expense' | 'income';
  onEdit: () => void;
  onDelete: () => void;
}

const RecurringItemCard: React.FC<RecurringItemCardProps> = ({ item, type, onEdit, onDelete }) => {
  const accounts = useBudgetStore((state) => state.accounts);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const nextOccurrence = item.startDate
    ? getNextOccurrence(item.pattern, new Date(), item.startDate, item.endDate)
    : getNextOccurrence(item.pattern, new Date(), undefined, item.endDate);

  const bgColor = type === 'expense' ? 'bg-red-50' : 'bg-green-50';
  const borderColor = type === 'expense' ? 'border-red-200' : 'border-green-200';
  const buttonColor = type === 'expense' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600';

  const categoryIcon = item.category ? CATEGORY_ICONS[item.category] || '📌' : '📌';
  const account = item.accountId ? accounts.find(a => a.id === item.accountId) : null;

  return (
    <div className={`${bgColor} rounded-lg p-4 border-2 ${borderColor} hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{categoryIcon}</span>
            <span className="font-bold text-lg text-gray-800">{formatCurrency(item.amount)}</span>
            {!item.isActive && (
              <span className="px-2 py-0.5 bg-gray-400 text-white text-xs font-semibold rounded">Paused</span>
            )}
          </div>
          <div className="text-sm font-medium text-gray-700 mb-1">{item.description}</div>
          {item.category && (
            <div className="text-xs text-gray-500 mb-1">Category: {item.category}</div>
          )}
          {account && (
            <div className="text-xs text-gray-500 mb-1">Account: {account.name}</div>
          )}
          <div className="text-xs text-gray-500 mb-1">{formatRecurrencePattern(item.pattern)}</div>
          {nextOccurrence && (
            <div className="text-xs font-semibold text-blue-600">
              Next: {format(nextOccurrence, 'MMM d, yyyy')}
            </div>
          )}
          {item.endDate && (
            <div className="text-xs text-gray-500">
              Ends: {format(new Date(item.endDate), 'MMM d, yyyy')}
            </div>
          )}
        </div>
        <div className="flex gap-2 ml-2">
          <button
            onClick={onEdit}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-semibold transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className={`px-3 py-1 ${buttonColor} text-white rounded text-sm font-semibold transition-colors`}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

interface SummaryStatsProps {
  expenses: RecurringExpense[];
  income: RecurringIncome[];
}

const SummaryStats: React.FC<SummaryStatsProps> = ({ expenses, income }) => {
  const monthlyExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.isActive)
      .reduce((sum, expense) => {
        // Calculate monthly equivalent
        let multiplier = 1;
        switch (expense.pattern.type) {
          case 'daily':
            multiplier = 30;
            break;
          case 'weekly':
            multiplier = 4.33;
            break;
          case 'biweekly':
            multiplier = 2.17;
            break;
          case 'monthly':
            multiplier = 1;
            break;
          case 'quarterly':
            multiplier = 1 / 3;
            break;
          case 'semiannual':
            multiplier = 1 / 6;
            break;
          case 'annual':
            multiplier = 1 / 12;
            break;
        }
        return sum + expense.amount * multiplier;
      }, 0);
  }, [expenses]);

  const monthlyIncome = useMemo(() => {
    return income
      .filter((i) => i.isActive)
      .reduce((sum, inc) => {
        let multiplier = 1;
        switch (inc.pattern.type) {
          case 'daily':
            multiplier = 30;
            break;
          case 'weekly':
            multiplier = 4.33;
            break;
          case 'biweekly':
            multiplier = 2.17;
            break;
          case 'monthly':
            multiplier = 1;
            break;
          case 'quarterly':
            multiplier = 1 / 3;
            break;
          case 'semiannual':
            multiplier = 1 / 6;
            break;
          case 'annual':
            multiplier = 1 / 12;
            break;
        }
        return sum + inc.amount * multiplier;
      }, 0);
  }, [income]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const net = monthlyIncome - monthlyExpenses;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
        <div className="text-sm text-gray-600 mb-1">Monthly Expenses</div>
        <div className="text-2xl font-bold text-red-700">{formatCurrency(monthlyExpenses)}</div>
        <div className="text-xs text-gray-500 mt-1">{expenses.filter(e => e.isActive).length} active items</div>
      </div>
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
        <div className="text-sm text-gray-600 mb-1">Monthly Income</div>
        <div className="text-2xl font-bold text-green-700">{formatCurrency(monthlyIncome)}</div>
        <div className="text-xs text-gray-500 mt-1">{income.filter(i => i.isActive).length} active items</div>
      </div>
      <div className={`border-2 rounded-xl p-4 ${net >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="text-sm text-gray-600 mb-1">Net Monthly</div>
        <div className={`text-2xl font-bold ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
          {formatCurrency(net)}
        </div>
        <div className="text-xs text-gray-500 mt-1">Income - Expenses</div>
      </div>
    </div>
  );
};

interface ConfirmDeleteDialogProps {
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({ itemName, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Delete</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const Recurring: React.FC = () => {
  const recurringExpenses = useBudgetStore((state) => state.recurringExpenses);
  const recurringIncome = useBudgetStore((state) => state.recurringIncome);
  const addRecurringExpense = useBudgetStore((state) => state.addRecurringExpense);
  const removeRecurringExpense = useBudgetStore((state) => state.removeRecurringExpense);
  const updateRecurringExpense = useBudgetStore((state) => state.updateRecurringExpense);
  const addRecurringIncome = useBudgetStore((state) => state.addRecurringIncome);
  const removeRecurringIncome = useBudgetStore((state) => state.removeRecurringIncome);
  const updateRecurringIncome = useBudgetStore((state) => state.updateRecurringIncome);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const [editingIncome, setEditingIncome] = useState<RecurringIncome | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'expense' | 'income'; id: string; name: string } | null>(null);
  
  const [expenseSort, setExpenseSort] = useState<SortOption>('nextOccurrence');
  const [incomeSort, setIncomeSort] = useState<SortOption>('nextOccurrence');
  const [expenseFilter, setExpenseFilter] = useState<string>('');
  const [incomeFilter, setIncomeFilter] = useState<string>('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('');
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState<string>('');
  const [expandedExpenses, setExpandedExpenses] = useState(false);
  const [expandedIncome, setExpandedIncome] = useState(false);

  const handleAddExpense = (data: Omit<RecurringExpense, 'id' | 'createdAt'>) => {
    if (editingExpense) {
      updateRecurringExpense(editingExpense.id, data);
      setEditingExpense(null);
    } else {
      addRecurringExpense(data);
    }
    setShowExpenseForm(false);
  };

  const handleAddIncome = (data: Omit<RecurringIncome, 'id' | 'createdAt'>) => {
    if (editingIncome) {
      updateRecurringIncome(editingIncome.id, data);
      setEditingIncome(null);
    } else {
      addRecurringIncome(data);
    }
    setShowIncomeForm(false);
  };

  const handleEditExpense = (expense: RecurringExpense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleEditIncome = (income: RecurringIncome) => {
    setEditingIncome(income);
    setShowIncomeForm(true);
  };

  const handleDeleteExpense = (id: string, name: string) => {
    setDeleteConfirm({ type: 'expense', id, name });
  };

  const handleDeleteIncome = (id: string, name: string) => {
    setDeleteConfirm({ type: 'income', id, name });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      if (deleteConfirm.type === 'expense') {
        removeRecurringExpense(deleteConfirm.id);
      } else {
        removeRecurringIncome(deleteConfirm.id);
      }
      setDeleteConfirm(null);
    }
  };

  // Filter and sort expenses
  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = recurringExpenses.filter((expense) => {
      const matchesSearch = expense.description.toLowerCase().includes(expenseFilter.toLowerCase());
      const matchesCategory = !expenseCategoryFilter || expense.category === expenseCategoryFilter;
      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
      switch (expenseSort) {
        case 'amount':
          return b.amount - a.amount;
        case 'description':
          return a.description.localeCompare(b.description);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'nextOccurrence':
          const nextA = a.startDate ? getNextOccurrence(a.pattern, new Date(), a.startDate, a.endDate) : getNextOccurrence(a.pattern, new Date(), undefined, a.endDate);
          const nextB = b.startDate ? getNextOccurrence(b.pattern, new Date(), b.startDate, b.endDate) : getNextOccurrence(b.pattern, new Date(), undefined, b.endDate);
          if (!nextA && !nextB) return 0;
          if (!nextA) return 1;
          if (!nextB) return -1;
          return nextA.getTime() - nextB.getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [recurringExpenses, expenseFilter, expenseCategoryFilter, expenseSort]);

  // Filter and sort income
  const filteredAndSortedIncome = useMemo(() => {
    let filtered = recurringIncome.filter((income) => {
      const matchesSearch = income.description.toLowerCase().includes(incomeFilter.toLowerCase());
      const matchesCategory = !incomeCategoryFilter || income.category === incomeCategoryFilter;
      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
      switch (incomeSort) {
        case 'amount':
          return b.amount - a.amount;
        case 'description':
          return a.description.localeCompare(b.description);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'nextOccurrence':
          const nextA = a.startDate ? getNextOccurrence(a.pattern, new Date(), a.startDate, a.endDate) : getNextOccurrence(a.pattern, new Date(), undefined, a.endDate);
          const nextB = b.startDate ? getNextOccurrence(b.pattern, new Date(), b.startDate, b.endDate) : getNextOccurrence(b.pattern, new Date(), undefined, b.endDate);
          if (!nextA && !nextB) return 0;
          if (!nextA) return 1;
          if (!nextB) return -1;
          return nextA.getTime() - nextB.getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [recurringIncome, incomeFilter, incomeCategoryFilter, incomeSort]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 via-white to-slate-50">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Recurring Expenses & Income</h1>
      
      <SummaryStats expenses={recurringExpenses} income={recurringIncome} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recurring Expenses Section */}
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-red-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-red-700">Recurring Expenses</h2>
            <button
              onClick={() => {
                setEditingExpense(null);
                setShowExpenseForm(!showExpenseForm);
              }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
            >
              {showExpenseForm && !editingExpense ? 'Cancel' : '+ Add Expense'}
            </button>
          </div>

          {/* Filters */}
          <div className="mb-4 space-y-2">
            <input
              type="text"
              placeholder="Search expenses..."
              value={expenseFilter}
              onChange={(e) => setExpenseFilter(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-400 text-sm"
            />
            <div className="flex gap-2">
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-400 text-sm"
              >
                <option value="">All Categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={expenseSort}
                onChange={(e) => setExpenseSort(e.target.value as SortOption)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-400 text-sm"
              >
                <option value="nextOccurrence">Next Occurrence</option>
                <option value="amount">Amount</option>
                <option value="description">Description</option>
                <option value="category">Category</option>
              </select>
            </div>
          </div>

          {showExpenseForm && (
            <div className="mb-4">
              <RecurringItemForm
                type="expense"
                initialData={editingExpense || undefined}
                onSave={handleAddExpense}
                onCancel={() => {
                  setShowExpenseForm(false);
                  setEditingExpense(null);
                }}
              />
            </div>
          )}

          <div className="space-y-2">
            {(expandedExpenses ? filteredAndSortedExpenses : filteredAndSortedExpenses.slice(0, 3)).map((expense) => (
              <RecurringItemCard
                key={expense.id}
                item={expense}
                type="expense"
                onEdit={() => handleEditExpense(expense)}
                onDelete={() => handleDeleteExpense(expense.id, expense.description)}
              />
            ))}
            {filteredAndSortedExpenses.length === 0 && (
              <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-4xl mb-2">📋</div>
                <div className="font-medium">No recurring expenses found</div>
                <div className="text-sm mt-1">Add your first recurring expense to get started</div>
              </div>
            )}
            {filteredAndSortedExpenses.length > 3 && (
              <button
                onClick={() => setExpandedExpenses(!expandedExpenses)}
                className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {expandedExpenses ? (
                  <>
                    <span>Show Less</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>Show All</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Recurring Income Section */}
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-green-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-green-700">Recurring Income</h2>
            <button
              onClick={() => {
                setEditingIncome(null);
                setShowIncomeForm(!showIncomeForm);
              }}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
            >
              {showIncomeForm && !editingIncome ? 'Cancel' : '+ Add Income'}
            </button>
          </div>

          {/* Filters */}
          <div className="mb-4 space-y-2">
            <input
              type="text"
              placeholder="Search income..."
              value={incomeFilter}
              onChange={(e) => setIncomeFilter(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-400 text-sm"
            />
            <div className="flex gap-2">
              <select
                value={incomeCategoryFilter}
                onChange={(e) => setIncomeCategoryFilter(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-400 text-sm"
              >
                <option value="">All Categories</option>
                {INCOME_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={incomeSort}
                onChange={(e) => setIncomeSort(e.target.value as SortOption)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-400 text-sm"
              >
                <option value="nextOccurrence">Next Occurrence</option>
                <option value="amount">Amount</option>
                <option value="description">Description</option>
                <option value="category">Category</option>
              </select>
            </div>
          </div>

          {showIncomeForm && (
            <div className="mb-4">
              <RecurringItemForm
                type="income"
                initialData={editingIncome || undefined}
                onSave={handleAddIncome}
                onCancel={() => {
                  setShowIncomeForm(false);
                  setEditingIncome(null);
                }}
              />
            </div>
          )}

          <div className="space-y-2">
            {(expandedIncome ? filteredAndSortedIncome : filteredAndSortedIncome.slice(0, 3)).map((income) => (
              <RecurringItemCard
                key={income.id}
                item={income}
                type="income"
                onEdit={() => handleEditIncome(income)}
                onDelete={() => handleDeleteIncome(income.id, income.description)}
              />
            ))}
            {filteredAndSortedIncome.length === 0 && (
              <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-4xl mb-2">💰</div>
                <div className="font-medium">No recurring income found</div>
                <div className="text-sm mt-1">Add your first recurring income to get started</div>
              </div>
            )}
            {filteredAndSortedIncome.length > 3 && (
              <button
                onClick={() => setExpandedIncome(!expandedIncome)}
                className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {expandedIncome ? (
                  <>
                    <span>Show Less</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>Show All</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {deleteConfirm && (
        <ConfirmDeleteDialog
          itemName={deleteConfirm.name}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default Recurring;
