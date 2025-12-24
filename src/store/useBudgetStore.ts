import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { formatDateKey } from '../utils/dateUtils';
import { getOccurrencesInMonth, migrateOldRecurringExpense, migrateOldRecurringIncome } from '../utils/recurrenceUtils';
import { matchesExistingTransaction, matchesRecurringPattern, type StatementTransaction, type ImportResult } from '../utils/statementParser';
import type { Transaction, DayData, RecurringExpense, RecurringIncome, Account, Category, Budget, SavingsGoal, Debt, DebtPayment } from '../types';

interface StoreState {
  days: Record<string, DayData>;
  recurringExpenses: RecurringExpense[];
  recurringIncome: RecurringIncome[];
  accounts: Account[];
  categories: Category[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  debts: Debt[];
  debtPayments: DebtPayment[];
}

interface StoreActions {
  addTransaction: (date: string, transaction: Transaction) => void;
  removeTransaction: (date: string, transactionId: string) => void;
  updateTransaction: (date: string, transactionId: string, transaction: Partial<Transaction>) => void;
  getDayData: (date: string) => DayData;
  getDailyTotal: (date: string) => { income: number; spending: number; profit: number };
  getWeeklyTotal: (startDate: Date, endDate: Date) => { income: number; spending: number; profit: number };
  getMonthlyTotal: (year: number, month: number) => { income: number; spending: number; profit: number };
  // Recurring items management
  addRecurringExpense: (expense: Omit<RecurringExpense, 'id' | 'createdAt'>) => void;
  removeRecurringExpense: (id: string) => void;
  updateRecurringExpense: (id: string, expense: Partial<RecurringExpense>) => void;
  addRecurringIncome: (income: Omit<RecurringIncome, 'id' | 'createdAt'>) => void;
  removeRecurringIncome: (id: string) => void;
  updateRecurringIncome: (id: string, income: Partial<RecurringIncome>) => void;
  // Auto-population
  populateRecurringForMonth: (year: number, month: number) => void;
  // Statement import
  importStatements: (transactions: StatementTransaction[]) => ImportResult;
  // Account management
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void;
  removeAccount: (id: string) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  getAccountBalance: (accountId: string, asOfDate?: Date) => number;
  transferBetweenAccounts: (
    date: string,
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description?: string
  ) => void;
  // Category management
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void;
  removeCategory: (id: string) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  // Budget management
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => void;
  removeBudget: (id: string) => void;
  updateBudget: (id: string, budget: Partial<Budget>) => void;
  getBudgetSpending: (budgetId: string, year: number, month?: number) => number;
  getBudgetStatus: (budgetId: string, year: number, month?: number) => {
    limit: number;
    spent: number;
    remaining: number;
    percentage: number;
  };
  // Savings goals management
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'currentAmount'>) => void;
  removeSavingsGoal: (id: string) => void;
  updateSavingsGoal: (id: string, goal: Partial<SavingsGoal>) => void;
  addToSavingsGoal: (goalId: string, amount: number) => void;
  getGoalProgress: (goalId: string) => { current: number; target: number; percentage: number };
  // Debt management
  addDebt: (debt: Omit<Debt, 'id' | 'createdAt'>) => void;
  removeDebt: (id: string) => void;
  updateDebt: (id: string, debt: Partial<Debt>) => void;
  addDebtPayment: (payment: Omit<DebtPayment, 'id'>) => void;
  removeDebtPayment: (paymentId: string) => void;
  getDebtBalance: (debtId: string) => number;
  getTotalDebt: () => number;
}

  // Migration function for old data format
function migrateOldData(state: any): any {
  if (!state) return state;
  
  const newState = { ...state };

  // Initialize accounts array if it doesn't exist
  if (!newState.accounts) {
    newState.accounts = [];
  }

  // Initialize new arrays
  if (!newState.categories) {
    newState.categories = [
      { id: 'cat-exp-housing', name: 'Housing', type: 'expense', icon: '🏠', createdAt: new Date().toISOString() },
      { id: 'cat-exp-utilities', name: 'Utilities', type: 'expense', icon: '⚡', createdAt: new Date().toISOString() },
      { id: 'cat-exp-food', name: 'Food & Dining', type: 'expense', icon: '🍽️', createdAt: new Date().toISOString() },
      { id: 'cat-exp-transport', name: 'Transportation', type: 'expense', icon: '🚗', createdAt: new Date().toISOString() },
      { id: 'cat-exp-insurance', name: 'Insurance', type: 'expense', icon: '🛡️', createdAt: new Date().toISOString() },
      { id: 'cat-exp-healthcare', name: 'Healthcare', type: 'expense', icon: '🏥', createdAt: new Date().toISOString() },
      { id: 'cat-exp-entertainment', name: 'Entertainment', type: 'expense', icon: '🎬', createdAt: new Date().toISOString() },
      { id: 'cat-exp-shopping', name: 'Shopping', type: 'expense', icon: '🛍️', createdAt: new Date().toISOString() },
      { id: 'cat-exp-bills', name: 'Bills', type: 'expense', icon: '📄', createdAt: new Date().toISOString() },
      { id: 'cat-exp-other', name: 'Other', type: 'expense', icon: '📌', createdAt: new Date().toISOString() },
      { id: 'cat-inc-salary', name: 'Salary', type: 'income', icon: '💼', createdAt: new Date().toISOString() },
      { id: 'cat-inc-freelance', name: 'Freelance', type: 'income', icon: '💻', createdAt: new Date().toISOString() },
      { id: 'cat-inc-investment', name: 'Investment', type: 'income', icon: '📈', createdAt: new Date().toISOString() },
      { id: 'cat-inc-rental', name: 'Rental', type: 'income', icon: '🏘️', createdAt: new Date().toISOString() },
      { id: 'cat-inc-bonus', name: 'Bonus', type: 'income', icon: '🎁', createdAt: new Date().toISOString() },
      { id: 'cat-inc-other', name: 'Other', type: 'income', icon: '📌', createdAt: new Date().toISOString() },
    ];
  }
  
  if (!newState.budgets) {
    newState.budgets = [];
  }
  
  if (!newState.savingsGoals) {
    newState.savingsGoals = [];
  }
  
  if (!newState.debts) {
    newState.debts = [];
  }
  
  if (!newState.debtPayments) {
    newState.debtPayments = [];
  }

  // Migrate old recurring expenses format
  if (newState.recurringExpenses && Array.isArray(newState.recurringExpenses) && newState.recurringExpenses.length > 0) {
    const firstExpense = newState.recurringExpenses[0];
    if (firstExpense && 'dayOfMonth' in firstExpense && !('pattern' in firstExpense)) {
      newState.recurringExpenses = newState.recurringExpenses.map((e: any) => migrateOldRecurringExpense(e));
    }
  }

  // Migrate old recurring income format
  if (newState.recurringIncome && Array.isArray(newState.recurringIncome) && newState.recurringIncome.length > 0) {
    const firstIncome = newState.recurringIncome[0];
    if (firstIncome && 'dayOfWeek' in firstIncome && !('pattern' in firstIncome)) {
      newState.recurringIncome = newState.recurringIncome.map((i: any) => migrateOldRecurringIncome(i));
    }
  }

  return newState;
}

export const useBudgetStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      days: {},
      recurringExpenses: [],
      recurringIncome: [],
      accounts: [],
      categories: [
        { id: 'cat-exp-housing', name: 'Housing', type: 'expense', icon: '🏠', createdAt: new Date().toISOString() },
        { id: 'cat-exp-utilities', name: 'Utilities', type: 'expense', icon: '⚡', createdAt: new Date().toISOString() },
        { id: 'cat-exp-food', name: 'Food & Dining', type: 'expense', icon: '🍽️', createdAt: new Date().toISOString() },
        { id: 'cat-exp-transport', name: 'Transportation', type: 'expense', icon: '🚗', createdAt: new Date().toISOString() },
        { id: 'cat-exp-insurance', name: 'Insurance', type: 'expense', icon: '🛡️', createdAt: new Date().toISOString() },
        { id: 'cat-exp-healthcare', name: 'Healthcare', type: 'expense', icon: '🏥', createdAt: new Date().toISOString() },
        { id: 'cat-exp-entertainment', name: 'Entertainment', type: 'expense', icon: '🎬', createdAt: new Date().toISOString() },
        { id: 'cat-exp-shopping', name: 'Shopping', type: 'expense', icon: '🛍️', createdAt: new Date().toISOString() },
        { id: 'cat-exp-bills', name: 'Bills', type: 'expense', icon: '📄', createdAt: new Date().toISOString() },
        { id: 'cat-exp-other', name: 'Other', type: 'expense', icon: '📌', createdAt: new Date().toISOString() },
        { id: 'cat-inc-salary', name: 'Salary', type: 'income', icon: '💼', createdAt: new Date().toISOString() },
        { id: 'cat-inc-freelance', name: 'Freelance', type: 'income', icon: '💻', createdAt: new Date().toISOString() },
        { id: 'cat-inc-investment', name: 'Investment', type: 'income', icon: '📈', createdAt: new Date().toISOString() },
        { id: 'cat-inc-rental', name: 'Rental', type: 'income', icon: '🏘️', createdAt: new Date().toISOString() },
        { id: 'cat-inc-bonus', name: 'Bonus', type: 'income', icon: '🎁', createdAt: new Date().toISOString() },
        { id: 'cat-inc-other', name: 'Other', type: 'income', icon: '📌', createdAt: new Date().toISOString() },
      ],
      budgets: [],
      savingsGoals: [],
      debts: [],
      debtPayments: [],

      addTransaction: (date: string, transaction: Transaction) => {
        set((state) => {
          const dayData = state.days[date] || { date, income: [], spending: [] };
          const updatedDayData = { ...dayData };
          
          if (transaction.type === 'income') {
            updatedDayData.income = [...updatedDayData.income, transaction];
          } else {
            updatedDayData.spending = [...updatedDayData.spending, transaction];
          }

          return {
            days: {
              ...state.days,
              [date]: updatedDayData,
            },
          };
        });
      },

      removeTransaction: (date: string, transactionId: string) => {
        set((state) => {
          const dayData = state.days[date];
          if (!dayData) return state;

          const updatedDayData = {
            ...dayData,
            income: dayData.income.filter((t) => t.id !== transactionId),
            spending: dayData.spending.filter((t) => t.id !== transactionId),
          };

          return {
            days: {
              ...state.days,
              [date]: updatedDayData,
            },
          };
        });
      },

      updateTransaction: (date: string, transactionId: string, transaction: Partial<Transaction>) => {
        set((state) => {
          const dayData = state.days[date];
          if (!dayData) return state;

          const updatedDayData = { ...dayData };
          
          // Find and update in income or spending array
          const updateInArray = (arr: Transaction[]) => {
            return arr.map((t) => (t.id === transactionId ? { ...t, ...transaction } : t));
          };

          updatedDayData.income = updateInArray(dayData.income);
          updatedDayData.spending = updateInArray(dayData.spending);

          return {
            days: {
              ...state.days,
              [date]: updatedDayData,
            },
          };
        });
      },

      getDayData: (date: string) => {
        const state = get();
        return state.days[date] || { date, income: [], spending: [] };
      },

      getDailyTotal: (date: string) => {
        const state = get();
        const dayData = state.days[date] || { date, income: [], spending: [] };
        const income = dayData.income.reduce((sum, t) => sum + t.amount, 0);
        const spending = dayData.spending.reduce((sum, t) => sum + t.amount, 0);
        return {
          income,
          spending,
          profit: income - spending,
        };
      },

      getWeeklyTotal: (startDate: Date, endDate: Date) => {
        const state = get();
        let income = 0;
        let spending = 0;

        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateKey = formatDateKey(currentDate);
          const dayData = state.days[dateKey];
          if (dayData) {
            income += dayData.income.reduce((sum, t) => sum + t.amount, 0);
            spending += dayData.spending.reduce((sum, t) => sum + t.amount, 0);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        return {
          income,
          spending,
          profit: income - spending,
        };
      },

      getMonthlyTotal: (year: number, month: number) => {
        const state = get();
        let income = 0;
        let spending = 0;

        Object.keys(state.days).forEach((dateKey) => {
          const [y, m] = dateKey.split('-').map(Number);
          if (y === year && m === month) {
            const dayData = state.days[dateKey];
            if (dayData) {
              income += dayData.income.reduce((sum, t) => sum + t.amount, 0);
              spending += dayData.spending.reduce((sum, t) => sum + t.amount, 0);
            }
          }
        });

        return {
          income,
          spending,
          profit: income - spending,
        };
      },

      // Recurring Expenses Management
      addRecurringExpense: (expense: Omit<RecurringExpense, 'id' | 'createdAt'>) => {
        const newExpense: RecurringExpense = {
          ...expense,
          id: `recurring-expense-${Date.now()}-${Math.random()}`,
          createdAt: new Date().toISOString(),
          isActive: expense.isActive !== undefined ? expense.isActive : true,
        };
        set((state) => ({
          recurringExpenses: [...state.recurringExpenses, newExpense],
        }));
        // Auto-populate for current month
        const now = new Date();
        get().populateRecurringForMonth(now.getFullYear(), now.getMonth() + 1);
      },

      removeRecurringExpense: (id: string) => {
        set((state) => ({
          recurringExpenses: state.recurringExpenses.filter((e) => e.id !== id),
        }));
      },

      updateRecurringExpense: (id: string, expense: Partial<RecurringExpense>) => {
        set((state) => ({
          recurringExpenses: state.recurringExpenses.map((e) =>
            e.id === id ? { ...e, ...expense } : e
          ),
        }));
      },

      // Recurring Income Management
      addRecurringIncome: (income: Omit<RecurringIncome, 'id' | 'createdAt'>) => {
        const newIncome: RecurringIncome = {
          ...income,
          id: `recurring-income-${Date.now()}-${Math.random()}`,
          createdAt: new Date().toISOString(),
          isActive: income.isActive !== undefined ? income.isActive : true,
        };
        set((state) => ({
          recurringIncome: [...state.recurringIncome, newIncome],
        }));
        // Auto-populate for current month
        const now = new Date();
        get().populateRecurringForMonth(now.getFullYear(), now.getMonth() + 1);
      },

      removeRecurringIncome: (id: string) => {
        set((state) => ({
          recurringIncome: state.recurringIncome.filter((i) => i.id !== id),
        }));
      },

      updateRecurringIncome: (id: string, income: Partial<RecurringIncome>) => {
        set((state) => ({
          recurringIncome: state.recurringIncome.map((i) =>
            i.id === id ? { ...i, ...income } : i
          ),
        }));
      },

      // Auto-populate recurring items for a given month
      populateRecurringForMonth: (year: number, month: number) => {
        const state = get();

        // Handle recurring expenses
        state.recurringExpenses
          .filter((expense) => expense.isActive)
          .forEach((expense) => {
            const occurrences = getOccurrencesInMonth(
              expense.pattern,
              year,
              month,
              expense.startDate,
              expense.endDate
            );

            occurrences.forEach((occurrenceDate) => {
              const dateKey = formatDateKey(occurrenceDate);
              const dayData = state.days[dateKey] || { date: dateKey, income: [], spending: [] };

              // Check if this recurring expense already exists for this date
              const alreadyExists = dayData.spending.some(
                (t) => t.recurringId === expense.id && t.isRecurring
              );

              if (!alreadyExists) {
                const transaction: Transaction = {
                  id: `${expense.id}-${dateKey}`,
                  type: 'spending',
                  amount: expense.amount,
                  description: expense.description,
                  isRecurring: true,
                  recurringId: expense.id,
                };
                get().addTransaction(dateKey, transaction);
              }
            });
          });

        // Handle recurring income
        state.recurringIncome
          .filter((income) => income.isActive)
          .forEach((income) => {
            const occurrences = getOccurrencesInMonth(
              income.pattern,
              year,
              month,
              income.startDate,
              income.endDate
            );

            occurrences.forEach((occurrenceDate) => {
              const dateKey = formatDateKey(occurrenceDate);
              const dayData = state.days[dateKey] || { date: dateKey, income: [], spending: [] };

              // Check if this recurring income already exists for this date
              const alreadyExists = dayData.income.some(
                (t) => t.recurringId === income.id && t.isRecurring
              );

              if (!alreadyExists) {
                const transaction: Transaction = {
                  id: `${income.id}-${dateKey}`,
                  type: 'income',
                  amount: income.amount,
                  description: income.description,
                  isRecurring: true,
                  recurringId: income.id,
                };
                get().addTransaction(dateKey, transaction);
              }
            });
          });
      },

      // Import bank statements with duplicate detection
      importStatements: (transactions: StatementTransaction[]) => {
        const state = get();
        const result: ImportResult = {
          added: 0,
          skipped: 0,
          errors: [],
          skippedTransactions: [],
        };
        
        for (const statementTx of transactions) {
          try {
            // Get existing transactions for this date
            const dayData = state.days[statementTx.date] || { 
              date: statementTx.date, 
              income: [], 
              spending: [] 
            };
            
            // Determine transaction type
            const txType = statementTx.type || (statementTx.amount >= 0 ? 'income' : 'spending');
            
            // Get existing transactions of the same type for this date
            const existingTransactions = txType === 'income' 
              ? dayData.income 
              : dayData.spending;
            
            // Check for exact duplicate (same date, amount, type, and description)
            const exactMatch = existingTransactions.some(existing => {
              const amountDiff = Math.abs(statementTx.amount - existing.amount);
              const descMatch = existing.description.toLowerCase().trim() === statementTx.description.toLowerCase().trim();
              return amountDiff < 0.01 && descMatch;
            });
            
            if (exactMatch) {
              result.skipped++;
              result.skippedTransactions.push(statementTx);
              continue;
            }
            
            // Check if it matches a recurring pattern
            const recurringItems = statementTx.type === 'income' 
              ? state.recurringIncome 
              : state.recurringExpenses;
            
            const recurringMatch = matchesRecurringPattern(
              statementTx,
              recurringItems
            );
            
            if (recurringMatch.matched) {
              // Check if recurring transaction already exists for this date
              const transactionsForType = statementTx.type === 'income' 
                ? dayData.income 
                : dayData.spending;
              
              const recurringTxExists = transactionsForType.some(t => 
                t.recurringId === recurringMatch.recurringId && 
                t.isRecurring
              );
              
              if (recurringTxExists) {
                result.skipped++;
                result.skippedTransactions.push(statementTx);
                continue;
              }
            }
            
            // Check for fuzzy match with existing transactions (within date window)
            // We'll check transactions from nearby dates too, but only of the same type
            const nearbyDates: string[] = [statementTx.date];
            const statementDate = new Date(statementTx.date);
            for (let i = 1; i <= 2; i++) {
              const prevDate = new Date(statementDate);
              prevDate.setDate(prevDate.getDate() - i);
              nearbyDates.push(formatDateKey(prevDate));
              
              const nextDate = new Date(statementDate);
              nextDate.setDate(nextDate.getDate() + i);
              nearbyDates.push(formatDateKey(nextDate));
            }
            
            const nearbyTransactionsWithDates: Array<{ transaction: Transaction; date: string }> = [];
            nearbyDates.forEach(date => {
              const nearbyDayData = state.days[date];
              if (nearbyDayData) {
                // Only check transactions of the same type
                const transactionsToCheck = txType === 'income' 
                  ? nearbyDayData.income 
                  : nearbyDayData.spending;
                transactionsToCheck.forEach(tx => {
                  nearbyTransactionsWithDates.push({ transaction: tx, date });
                });
              }
            });
            
            // Check for fuzzy match
            if (matchesExistingTransaction(statementTx, nearbyTransactionsWithDates, 2)) {
              result.skipped++;
              result.skippedTransactions.push(statementTx);
              continue;
            }
            
            // Add the transaction
            const transaction: Transaction = {
              id: `imported-${Date.now()}-${Math.random()}`,
              type: statementTx.type || (statementTx.amount >= 0 ? 'income' : 'spending'),
              amount: statementTx.amount,
              description: statementTx.description,
              isRecurring: recurringMatch.matched,
              recurringId: recurringMatch.recurringId,
            };
            
            get().addTransaction(statementTx.date, transaction);
            result.added++;
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(
              `Error importing transaction on ${statementTx.date}: ${errorMessage}`
            );
          }
        }
        
        return result;
      },

      // Account management
      addAccount: (account) => {
        const newAccount: Account = {
          ...account,
          id: `account-${Date.now()}-${Math.random()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          accounts: [...state.accounts, newAccount],
        }));
      },

      removeAccount: (id) => {
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== id),
        }));
      },

      updateAccount: (id, account) => {
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === id ? { ...a, ...account } : a
          ),
        }));
      },

      // Calculate account balance by summing all transactions
      getAccountBalance: (accountId, asOfDate) => {
        const state = get();
        const account = state.accounts.find((a) => a.id === accountId);
        if (!account) return 0;

        let balance = account.initialBalance;
        const cutoffDate = asOfDate ? new Date(asOfDate) : new Date();
        cutoffDate.setHours(23, 59, 59, 999); // End of day

        // Iterate through all days
        Object.keys(state.days).forEach((dateKey) => {
          const dayDate = new Date(dateKey);
          if (dayDate > cutoffDate) return;

          const dayData = state.days[dateKey];
          if (!dayData) return;

          // Process all transactions (income, spending, transfers)
          const allTransactions = [
            ...dayData.income,
            ...dayData.spending,
          ];

          allTransactions.forEach((transaction) => {
            // Regular income/spending affecting this account
            if (transaction.accountId === accountId) {
              if (transaction.type === 'income') {
                balance += transaction.amount;
              } else if (transaction.type === 'spending') {
                balance -= transaction.amount;
              }
            }

            // Transfer out from this account
            if (
              transaction.type === 'transfer' &&
              transaction.accountId === accountId &&
              transaction.transferToAccountId
            ) {
              balance -= transaction.amount;
            }

            // Transfer in to this account
            if (
              transaction.type === 'transfer' &&
              transaction.transferToAccountId === accountId
            ) {
              balance += transaction.amount;
            }
          });
        });

        return balance;
      },

      transferBetweenAccounts: (date, fromAccountId, toAccountId, amount, description) => {
        if (fromAccountId === toAccountId) return;
        if (amount <= 0) return;

        const state = get();
        const toAccount = state.accounts.find((a) => a.id === toAccountId);
        const transaction: Transaction = {
          id: `transfer-${Date.now()}-${Math.random()}`,
          type: 'transfer',
          amount,
          description: description || `Transfer to ${toAccount?.name || 'account'}`,
          accountId: fromAccountId,
          transferToAccountId: toAccountId,
        };

        get().addTransaction(date, transaction);
      },

      // Category management
      addCategory: (category) => {
        const newCategory: Category = {
          ...category,
          id: `category-${Date.now()}-${Math.random()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          categories: [...state.categories, newCategory],
        }));
      },

      removeCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
      },

      updateCategory: (id, category) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...category } : c
          ),
        }));
      },

      // Budget management
      addBudget: (budget) => {
        const newBudget: Budget = {
          ...budget,
          id: `budget-${Date.now()}-${Math.random()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          budgets: [...state.budgets, newBudget],
        }));
      },

      removeBudget: (id) => {
        set((state) => ({
          budgets: state.budgets.filter((b) => b.id !== id),
        }));
      },

      updateBudget: (id, budget) => {
        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === id ? { ...b, ...budget } : b
          ),
        }));
      },

      getBudgetSpending: (budgetId, year, month) => {
        const state = get();
        const budget = state.budgets.find((b) => b.id === budgetId);
        if (!budget) return 0;
        
        let total = 0;
        Object.keys(state.days).forEach((dateKey) => {
          const [y, m] = dateKey.split('-').map(Number);
          const dayData = state.days[dateKey];
          
          if (budget.period === 'monthly' && month !== undefined) {
            if (y === year && m === month) {
              dayData?.spending.forEach((tx) => {
                if (tx.category === budget.categoryId) {
                  total += tx.amount;
                }
              });
            }
          } else if (budget.period === 'yearly') {
            if (y === year) {
              dayData?.spending.forEach((tx) => {
                if (tx.category === budget.categoryId) {
                  total += tx.amount;
                }
              });
            }
          } else if (budget.period === 'weekly') {
            // For weekly, we'd need to calculate which week of the year
            // For simplicity, we'll check if it's in the same month for now
            if (y === year && month !== undefined && m === month) {
              dayData?.spending.forEach((tx) => {
                if (tx.category === budget.categoryId) {
                  total += tx.amount;
                }
              });
            }
          }
        });
        
        return total;
      },

      getBudgetStatus: (budgetId, year, month) => {
        const state = get();
        const budget = state.budgets.find((b) => b.id === budgetId);
        if (!budget) {
          return { limit: 0, spent: 0, remaining: 0, percentage: 0 };
        }
        
        const spent = get().getBudgetSpending(budgetId, year, month);
        const remaining = budget.amount - spent;
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
        
        return { limit: budget.amount, spent, remaining, percentage };
      },

      // Savings goals management
      addSavingsGoal: (goal) => {
        const newGoal: SavingsGoal = {
          ...goal,
          id: `goal-${Date.now()}-${Math.random()}`,
          currentAmount: 0,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          savingsGoals: [...state.savingsGoals, newGoal],
        }));
      },

      removeSavingsGoal: (id) => {
        set((state) => ({
          savingsGoals: state.savingsGoals.filter((g) => g.id !== id),
        }));
      },

      updateSavingsGoal: (id, goal) => {
        set((state) => ({
          savingsGoals: state.savingsGoals.map((g) =>
            g.id === id ? { ...g, ...goal } : g
          ),
        }));
      },

      addToSavingsGoal: (goalId, amount) => {
        set((state) => ({
          savingsGoals: state.savingsGoals.map((g) =>
            g.id === goalId
              ? { ...g, currentAmount: g.currentAmount + amount }
              : g
          ),
        }));
      },

      getGoalProgress: (goalId) => {
        const state = get();
        const goal = state.savingsGoals.find((g) => g.id === goalId);
        if (!goal) {
          return { current: 0, target: 0, percentage: 0 };
        }
        return {
          current: goal.currentAmount,
          target: goal.targetAmount,
          percentage: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
        };
      },

      // Debt management
      addDebt: (debt) => {
        const newDebt: Debt = {
          ...debt,
          id: `debt-${Date.now()}-${Math.random()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          debts: [...state.debts, newDebt],
        }));
      },

      removeDebt: (id) => {
        set((state) => ({
          debts: state.debts.filter((d) => d.id !== id),
          debtPayments: state.debtPayments.filter((p) => p.debtId !== id),
        }));
      },

      updateDebt: (id, debt) => {
        set((state) => ({
          debts: state.debts.map((d) =>
            d.id === id ? { ...d, ...debt } : d
          ),
        }));
      },

      addDebtPayment: (payment) => {
        const newPayment: DebtPayment = {
          ...payment,
          id: `debt-payment-${Date.now()}-${Math.random()}`,
        };
        set((state) => {
          // Update debt balance
          const updatedDebts = state.debts.map((d) =>
            d.id === payment.debtId
              ? { ...d, currentBalance: Math.max(0, d.currentBalance - payment.amount) }
              : d
          );
          
          return {
            debts: updatedDebts,
            debtPayments: [...state.debtPayments, newPayment],
          };
        });
      },

      removeDebtPayment: (paymentId) => {
        set((state) => {
          const payment = state.debtPayments.find((p) => p.id === paymentId);
          if (!payment) return state;
          
          // Restore debt balance
          const updatedDebts = state.debts.map((d) =>
            d.id === payment.debtId
              ? { ...d, currentBalance: d.currentBalance + payment.amount }
              : d
          );
          
          return {
            debts: updatedDebts,
            debtPayments: state.debtPayments.filter((p) => p.id !== paymentId),
          };
        });
      },

      getDebtBalance: (debtId) => {
        const state = get();
        const debt = state.debts.find((d) => d.id === debtId);
        return debt?.currentBalance || 0;
      },

      getTotalDebt: () => {
        const state = get();
        return state.debts.reduce((sum, debt) => sum + debt.currentBalance, 0);
      },
    }),
    {
      name: 'budget-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const migratedState = migrateOldData(state);
          // Update state if migration occurred
          if (migratedState !== state) {
            useBudgetStore.setState(migratedState);
          }
        }
      },
    }
  )
);

