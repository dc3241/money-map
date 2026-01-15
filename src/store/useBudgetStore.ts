import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { parseISO, isBefore, startOfDay } from 'date-fns';
import { formatDateKey } from '../utils/dateUtils';
import { getOccurrencesInMonth, migrateOldRecurringExpense, migrateOldRecurringIncome } from '../utils/recurrenceUtils';
import type { Transaction, DayData, RecurringExpense, RecurringIncome, Account, Category, Budget, SavingsGoal, Debt, DebtPayment } from '../types';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from './useAuthStore';

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
  // Cleanup past recurring transactions
  cleanupPastRecurringTransactions: () => number;
  // Account management
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>, alsoTrackAsDebt?: boolean) => void;
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
  addToSavingsGoal: (goalId: string, amount: number, date?: string, sourceAccountId?: string) => void;
  getGoalProgress: (goalId: string) => { current: number; target: number; percentage: number };
  // Debt management
  addDebt: (debt: Omit<Debt, 'id' | 'createdAt'>) => void;
  removeDebt: (id: string) => void;
  updateDebt: (id: string, debt: Partial<Debt>) => void;
  addDebtPayment: (payment: Omit<DebtPayment, 'id'>) => void;
  removeDebtPayment: (paymentId: string) => void;
  getDebtBalance: (debtId: string) => number;
  getTotalDebt: () => number;
  syncDebtBalancesFromAccounts: () => void;
  // Firestore sync
  initializeBudgetData: () => Promise<void>;
  saveToFirestore: () => Promise<void>;
  isLoading: boolean;
  isInitialized: boolean;
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

  // Migrate old DayData format to include transfers array
  if (newState.days && typeof newState.days === 'object') {
    Object.keys(newState.days).forEach((dateKey) => {
      const dayData = newState.days[dateKey];
      if (dayData && !dayData.transfers) {
        // Move any transfer-type transactions from spending to transfers array
        const transfers: any[] = [];
        const spending: any[] = [];
        
        if (dayData.spending && Array.isArray(dayData.spending)) {
          dayData.spending.forEach((tx: any) => {
            if (tx.type === 'transfer') {
              transfers.push(tx);
            } else {
              spending.push(tx);
            }
          });
        } else if (!dayData.spending) {
          // If spending doesn't exist, initialize it
          dayData.spending = [];
        }
        
        newState.days[dateKey] = {
          ...dayData,
          spending,
          transfers,
        };
      }
    });
  }

  return newState;
}

// Debounce helper for saveToFirestore
let saveTimeout: NodeJS.Timeout | null = null;

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
          const dayData = state.days[date] || { date, income: [], spending: [], transfers: [] };
          const updatedDayData = { ...dayData };
          
          if (transaction.type === 'income') {
            updatedDayData.income = [...updatedDayData.income, transaction];
          } else if (transaction.type === 'transfer') {
            // Store transfers separately, but they'll be counted in spending totals for cash flow
            updatedDayData.transfers = [...(updatedDayData.transfers || []), transaction];
          } else {
            updatedDayData.spending = [...updatedDayData.spending, transaction];
          }

          // Sync debt balance if transaction affects a credit card account
          let updatedDebts = state.debts;
          const creditCardAccountIds = new Set<string>();
          
          // Check if transaction affects a credit card account
          if (transaction.accountId) {
            const account = state.accounts.find(a => a.id === transaction.accountId);
            if (account && account.type === 'credit_card') {
              creditCardAccountIds.add(transaction.accountId);
            }
          }
          // Also check transfer destination
          if (transaction.type === 'transfer' && transaction.transferToAccountId) {
            const toAccount = state.accounts.find(a => a.id === transaction.transferToAccountId);
            if (toAccount && toAccount.type === 'credit_card') {
              creditCardAccountIds.add(transaction.transferToAccountId);
            }
          }
          
          // Update debt balances for affected credit cards
          // Create a temporary state with the new transaction to calculate accurate balance
          const tempDays = {
            ...state.days,
            [date]: updatedDayData,
          };
          
          creditCardAccountIds.forEach(accountId => {
            const linkedDebt = state.debts.find(d => d.accountId === accountId);
            if (linkedDebt) {
              // Recalculate balance from scratch including the new transaction
              const account = state.accounts.find(a => a.id === accountId);
              if (!account) return;
              
              let balance = account.initialBalance;
              const cutoffDate = new Date();
              // Normalize cutoff date to start of day in local timezone, then set to end of day
              cutoffDate.setHours(0, 0, 0, 0);
              cutoffDate.setHours(23, 59, 59, 999);
              
              // Get the account creation date - only transactions on or after this date should affect the balance
              const accountCreatedAt = account.createdAt ? parseISO(account.createdAt) : new Date(0);
              const accountCreatedAtStartOfDay = startOfDay(accountCreatedAt);
              
              // Get all date keys and sort them chronologically
              const dateKeys = Object.keys(tempDays).sort((a, b) => {
                // Parse as local time for proper comparison
                const dateA = new Date(a + 'T00:00:00');
                const dateB = new Date(b + 'T00:00:00');
                return dateA.getTime() - dateB.getTime();
              });
              
              // Iterate through all days in chronological order including the new transaction
              dateKeys.forEach((dateKey) => {
                // Parse date as local time at start of day for proper comparison
                const dayDate = new Date(dateKey + 'T00:00:00');
                dayDate.setHours(0, 0, 0, 0);
                
                // Only process transactions up to and including the cutoff date
                if (dayDate.getTime() > cutoffDate.getTime()) return;
                
                // CRITICAL FIX: Only process transactions on or after the account was created
                // This prevents past transactions from affecting a newly created account's balance
                if (dayDate.getTime() < accountCreatedAtStartOfDay.getTime()) return;
                
                const dayData = tempDays[dateKey];
                if (!dayData) return;
                
                const allTransactions = [
                  ...dayData.income,
                  ...(dayData.spending || []),
                  ...(dayData.transfers || []),
                ];
                
                allTransactions.forEach((t) => {
                  // Regular income/spending affecting this account
                  if (t.accountId === accountId) {
                    if (account.type === 'credit_card') {
                      if (t.type === 'income') {
                        balance -= t.amount; // Payment reduces debt
                      } else if (t.type === 'spending') {
                        balance += t.amount; // Spending increases debt
                      }
                    }
                  }
                  
                  // Transfer out from this account
                  if (t.type === 'transfer' && t.accountId === accountId && t.transferToAccountId) {
                    if (account.type === 'credit_card') {
                      balance += t.amount; // Transfer out from credit card increases debt (cash advance)
                    }
                  }
                  
                  // Transfer in to this account
                  if (t.type === 'transfer' && t.transferToAccountId === accountId) {
                    if (account.type === 'credit_card') {
                      balance -= t.amount; // Transfer to credit card decreases debt (payment)
                    }
                  }
                });
              });
              
              // Update debt balance with the calculated balance
              updatedDebts = updatedDebts.map(d =>
                d.id === linkedDebt.id
                  ? { ...d, currentBalance: Math.abs(balance) }
                  : d
              );
            }
          });

          return {
            days: {
              ...state.days,
              [date]: updatedDayData,
            },
            debts: updatedDebts,
          };
        });
        // Save to Firestore asynchronously
        setTimeout(() => get().saveToFirestore(), 0);
      },

      removeTransaction: (date: string, transactionId: string) => {
        set((state) => {
          const dayData = state.days[date];
          if (!dayData) return state;

          // Find the transaction being removed to check if it affects a credit card and if it's recurring
          const transaction = [...dayData.income, ...(dayData.spending || []), ...(dayData.transfers || [])].find(t => t.id === transactionId);
          
          // If this is a recurring transaction, we need to remove all future instances
          const isRecurringTransaction = transaction?.isRecurring && transaction?.recurringId;
          const recurringId = transaction?.recurringId;
          const deletionDate = date; // Store the deletion date for comparison
          
          const updatedDayData = {
            ...dayData,
            income: dayData.income.filter((t) => t.id !== transactionId),
            spending: (dayData.spending || []).filter((t) => t.id !== transactionId),
            transfers: (dayData.transfers || []).filter((t) => t.id !== transactionId),
          };

          // If this is a recurring transaction, remove all future instances with the same recurringId
          const updatedDays: Record<string, DayData> = { ...state.days };
          updatedDays[date] = updatedDayData;
          
          if (isRecurringTransaction && recurringId) {
            // Iterate through all dates and remove future recurring transactions with the same recurringId
            Object.keys(updatedDays).forEach((dateKey) => {
              // Only process future dates (dates after the deletion date)
              // Since dates are in YYYY-MM-DD format, we can compare them lexicographically
              if (dateKey > deletionDate) {
                const futureDayData = updatedDays[dateKey];
                if (futureDayData) {
                  updatedDays[dateKey] = {
                    ...futureDayData,
                    income: futureDayData.income.filter((t) => !(t.recurringId === recurringId && t.isRecurring)),
                    spending: (futureDayData.spending || []).filter((t) => !(t.recurringId === recurringId && t.isRecurring)),
                    transfers: (futureDayData.transfers || []).filter((t) => !(t.recurringId === recurringId && t.isRecurring)),
                  };
                }
              }
            });
          }

          // Sync debt balance if transaction affected a credit card account
          let updatedDebts = state.debts;
          if (transaction?.accountId) {
            const account = state.accounts.find(a => a.id === transaction.accountId);
            if (account && account.type === 'credit_card') {
              const linkedDebt = state.debts.find(d => d.accountId === transaction.accountId);
              if (linkedDebt) {
                // Calculate balance using the UPDATED state (with transactions removed)
                // Use updatedDays which includes all the future recurring transaction removals
                let balance = account.initialBalance;
                const cutoffDate = new Date();
                // Normalize cutoff date to start of day in local timezone, then set to end of day
                cutoffDate.setHours(0, 0, 0, 0);
                cutoffDate.setHours(23, 59, 59, 999); // End of day
                
                // Get the account creation date - only transactions on or after this date should affect the balance
                const accountCreatedAt = account.createdAt ? parseISO(account.createdAt) : new Date(0);
                const accountCreatedAtStartOfDay = startOfDay(accountCreatedAt);
                
                // Get all date keys and sort them chronologically
                const dateKeys = Object.keys(updatedDays).sort((a, b) => {
                  // Parse as local time for proper comparison
                  const dateA = new Date(a + 'T00:00:00');
                  const dateB = new Date(b + 'T00:00:00');
                  return dateA.getTime() - dateB.getTime();
                });
                
                // Iterate through all days in chronological order
                dateKeys.forEach((dateKey) => {
                  // Parse date as local time at start of day for proper comparison
                  const dayDate = new Date(dateKey + 'T00:00:00');
                  dayDate.setHours(0, 0, 0, 0);
                  
                  // Only process transactions up to and including the cutoff date
                  if (dayDate.getTime() > cutoffDate.getTime()) return;
                  
                  // CRITICAL FIX: Only process transactions on or after the account was created
                  // This prevents past transactions from affecting a newly created account's balance
                  if (dayDate.getTime() < accountCreatedAtStartOfDay.getTime()) return;
                  
                  const dayData = updatedDays[dateKey];
                  if (!dayData) return;
                  
                  // Process all transactions (income, spending, transfers)
                  const allTransactions = [
                    ...dayData.income,
                    ...(dayData.spending || []),
                    ...(dayData.transfers || []),
                  ];
                  
                  allTransactions.forEach((t) => {
                    // Regular income/spending affecting this account
                    if (t.accountId === account.id) {
                      if (account.type === 'credit_card') {
                        if (t.type === 'income') {
                          balance -= t.amount; // Payment reduces debt
                        } else if (t.type === 'spending') {
                          balance += t.amount; // Spending increases debt
                        }
                      }
                    }
                    
                    // Transfer out from this account
                    if (t.type === 'transfer' && t.accountId === account.id && t.transferToAccountId) {
                      if (account.type === 'credit_card') {
                        balance += t.amount; // Transfer out from credit card increases debt (cash advance)
                      }
                    }
                    
                    // Transfer in to this account
                    if (t.type === 'transfer' && t.transferToAccountId === account.id) {
                      if (account.type === 'credit_card') {
                        balance -= t.amount; // Transfer to credit card decreases debt (payment)
                      }
                    }
                  });
                });
                
                updatedDebts = state.debts.map(d =>
                  d.id === linkedDebt.id
                    ? { ...d, currentBalance: Math.abs(balance) }
                    : d
                );
              }
            }
          }

          const newState = {
            days: updatedDays,
            debts: updatedDebts,
          };
          
          // Save to Firestore asynchronously
          setTimeout(() => get().saveToFirestore(), 0);
          
          return newState;
        });
      },

      updateTransaction: (date: string, transactionId: string, transaction: Partial<Transaction>) => {
        set((state) => {
          const dayData = state.days[date];
          if (!dayData) return state;

          const updatedDayData = { ...dayData };
          
          // Find the original transaction to check account
          const originalTransaction = [...dayData.income, ...(dayData.spending || []), ...(dayData.transfers || [])].find(t => t.id === transactionId);
          const accountId = transaction.accountId ?? originalTransaction?.accountId;
          
          // Find and update in income, spending, or transfers array
          const updateInArray = (arr: Transaction[]) => {
            return arr.map((t) => (t.id === transactionId ? { ...t, ...transaction } : t));
          };

          updatedDayData.income = updateInArray(dayData.income);
          updatedDayData.spending = updateInArray(dayData.spending || []);
          updatedDayData.transfers = updateInArray(dayData.transfers || []);

          // Sync debt balance if transaction affects a credit card account
          let updatedDebts = state.debts;
          if (accountId) {
            const account = state.accounts.find(a => a.id === accountId);
            if (account && account.type === 'credit_card') {
              const linkedDebt = state.debts.find(d => d.accountId === accountId);
              if (linkedDebt) {
                const accountBalance = get().getAccountBalance(accountId);
                updatedDebts = state.debts.map(d =>
                  d.id === linkedDebt.id
                    ? { ...d, currentBalance: Math.abs(accountBalance) }
                    : d
                );
              }
            }
          }

          const newState = {
            days: {
              ...state.days,
              [date]: updatedDayData,
            },
            debts: updatedDebts,
          };
          
          // Save to Firestore asynchronously
          setTimeout(() => get().saveToFirestore(), 0);
          
          return newState;
        });
      },

      getDayData: (date: string) => {
        const state = get();
        return state.days[date] || { date, income: [], spending: [], transfers: [] };
      },

      getDailyTotal: (date: string) => {
        const state = get();
        const dayData = state.days[date] || { date, income: [], spending: [], transfers: [] };
        const income = dayData.income.reduce((sum, t) => sum + t.amount, 0);
        const regularSpending = (dayData.spending || []).reduce((sum, t) => sum + t.amount, 0);
        const transfers = (dayData.transfers || []).reduce((sum, t) => sum + t.amount, 0);
        const spending = regularSpending + transfers; // Include transfers in spending for cash flow
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
        
        const today = startOfDay(new Date());
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          const dateKey = formatDateKey(currentDate);
          const dayDate = startOfDay(currentDate);
          
          // Only include transactions on or before today
          if (dayDate.getTime() <= today.getTime()) {
            const dayData = state.days[dateKey];
            if (dayData) {
              income += dayData.income.reduce((sum, t) => sum + t.amount, 0);
              const regularSpending = (dayData.spending || []).reduce((sum, t) => sum + t.amount, 0);
              const transfers = (dayData.transfers || []).reduce((sum, t) => sum + t.amount, 0);
              spending += regularSpending + transfers; // Include transfers in spending for cash flow
            }
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
        
        const today = startOfDay(new Date());

        Object.keys(state.days).forEach((dateKey) => {
          const [y, m] = dateKey.split('-').map(Number);
          if (y === year && m === month) {
            // Parse the date and compare to today
            const dayDate = startOfDay(parseISO(dateKey));
            
            // Only include transactions on or before today
            if (dayDate.getTime() <= today.getTime()) {
              const dayData = state.days[dateKey];
              if (dayData) {
                income += dayData.income.reduce((sum, t) => sum + t.amount, 0);
                const regularSpending = (dayData.spending || []).reduce((sum, t) => sum + t.amount, 0);
                const transfers = (dayData.transfers || []).reduce((sum, t) => sum + t.amount, 0);
                spending += regularSpending + transfers; // Include transfers in spending for cash flow
              }
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
        // Save to Firestore
        setTimeout(() => get().saveToFirestore(), 0);
      },

      removeRecurringExpense: (id: string) => {
        set((state) => {
          // Remove the recurring expense
          const updatedRecurringExpenses = state.recurringExpenses.filter((e) => e.id !== id);
          
          // Remove all future transactions (from today forward) created from this recurring expense
          // Keep all past transactions as they represent historical events
          const today = formatDateKey(startOfDay(new Date()));
          const updatedDays: Record<string, DayData> = { ...state.days };
          let hasChanges = false;
          
          Object.keys(updatedDays).forEach((dateKey) => {
            // Only remove transactions from today forward (dateKey >= today)
            // Since dates are in YYYY-MM-DD format, we can compare them lexicographically
            if (dateKey >= today) {
              const dayData = updatedDays[dateKey];
              const updatedSpending = dayData.spending.filter(
                (t) => !(t.recurringId === id && t.isRecurring)
              );
              
              if (updatedSpending.length !== dayData.spending.length) {
                updatedDays[dateKey] = {
                  ...dayData,
                  spending: updatedSpending,
                };
                hasChanges = true;
              }
            }
          });
          
          if (hasChanges) {
            return {
              recurringExpenses: updatedRecurringExpenses,
              days: updatedDays,
            };
          }
          
          return {
            recurringExpenses: updatedRecurringExpenses,
          };
        });
        setTimeout(() => get().saveToFirestore(), 0);
      },

      updateRecurringExpense: (id: string, expense: Partial<RecurringExpense>) => {
        set((state) => {
          const updatedRecurringExpenses = state.recurringExpenses.map((e) =>
            e.id === id ? { ...e, ...expense } : e
          );
          
          // If accountId, amount, or description was updated, update all existing transactions from this recurring expense
          if (expense.accountId !== undefined || expense.amount !== undefined || expense.description !== undefined) {
            const updatedDays: Record<string, DayData> = { ...state.days };
            let hasChanges = false;
            
            // If accountId is being updated, get the account's creation date
            let accountCreatedAt: Date | null = null;
            if (expense.accountId !== undefined) {
              const account = state.accounts.find(a => a.id === expense.accountId);
              if (account && account.createdAt) {
                accountCreatedAt = startOfDay(parseISO(account.createdAt));
              }
            }
            
            Object.keys(updatedDays).forEach((dateKey) => {
              const dayData = updatedDays[dateKey];
              let dayHasChanges = false;
              
              // Parse the transaction date
              const transactionDate = new Date(dateKey + 'T00:00:00');
              const transactionDateStartOfDay = startOfDay(transactionDate);
              
              // If accountId is being updated, only update transactions on or after the account was created
              if (expense.accountId !== undefined && accountCreatedAt) {
                if (transactionDateStartOfDay.getTime() < accountCreatedAt.getTime()) {
                  return; // Skip past transactions - don't update them to use the new account
                }
              }
              
              const updatedSpending = dayData.spending.map((t) => {
                if (t.recurringId === id && t.isRecurring) {
                  const updated: Transaction = { ...t };
                  let transactionChanged = false;
                  if (expense.accountId !== undefined && updated.accountId !== expense.accountId) {
                    updated.accountId = expense.accountId;
                    transactionChanged = true;
                  }
                  if (expense.amount !== undefined && updated.amount !== expense.amount) {
                    updated.amount = expense.amount;
                    transactionChanged = true;
                  }
                  if (expense.description !== undefined && updated.description !== expense.description) {
                    updated.description = expense.description;
                    transactionChanged = true;
                  }
                  if (transactionChanged) {
                    dayHasChanges = true;
                  }
                  return updated;
                }
                return t;
              });
              
              if (dayHasChanges) {
                updatedDays[dateKey] = {
                  ...dayData,
                  spending: updatedSpending,
                };
                hasChanges = true;
              }
            });
            
            if (hasChanges) {
              return {
                recurringExpenses: updatedRecurringExpenses,
                days: updatedDays,
              };
            }
          }
          
          return {
            recurringExpenses: updatedRecurringExpenses,
          };
        });
        setTimeout(() => get().saveToFirestore(), 0);
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
        // Save to Firestore
        setTimeout(() => get().saveToFirestore(), 0);
      },

      removeRecurringIncome: (id: string) => {
        set((state) => {
          // Remove the recurring income
          const updatedRecurringIncome = state.recurringIncome.filter((i) => i.id !== id);
          
          // Remove all future transactions (from today forward) created from this recurring income
          // Keep all past transactions as they represent historical events
          const today = formatDateKey(startOfDay(new Date()));
          const updatedDays: Record<string, DayData> = { ...state.days };
          let hasChanges = false;
          
          Object.keys(updatedDays).forEach((dateKey) => {
            // Only remove transactions from today forward (dateKey >= today)
            // Since dates are in YYYY-MM-DD format, we can compare them lexicographically
            if (dateKey >= today) {
              const dayData = updatedDays[dateKey];
              const updatedIncome = dayData.income.filter(
                (t) => !(t.recurringId === id && t.isRecurring)
              );
              
              if (updatedIncome.length !== dayData.income.length) {
                updatedDays[dateKey] = {
                  ...dayData,
                  income: updatedIncome,
                };
                hasChanges = true;
              }
            }
          });
          
          if (hasChanges) {
            return {
              recurringIncome: updatedRecurringIncome,
              days: updatedDays,
            };
          }
          
          return {
            recurringIncome: updatedRecurringIncome,
          };
        });
        setTimeout(() => get().saveToFirestore(), 0);
      },

      updateRecurringIncome: (id: string, income: Partial<RecurringIncome>) => {
        set((state) => {
          const updatedRecurringIncome = state.recurringIncome.map((i) =>
            i.id === id ? { ...i, ...income } : i
          );
          
          // If accountId, amount, or description was updated, update all existing transactions from this recurring income
          if (income.accountId !== undefined || income.amount !== undefined || income.description !== undefined) {
            const updatedDays: Record<string, DayData> = { ...state.days };
            let hasChanges = false;
            
            // If accountId is being updated, get the account's creation date
            let accountCreatedAt: Date | null = null;
            if (income.accountId !== undefined) {
              const account = state.accounts.find(a => a.id === income.accountId);
              if (account && account.createdAt) {
                accountCreatedAt = startOfDay(parseISO(account.createdAt));
              }
            }
            
            Object.keys(updatedDays).forEach((dateKey) => {
              const dayData = updatedDays[dateKey];
              let dayHasChanges = false;
              
              // Parse the transaction date
              const transactionDate = new Date(dateKey + 'T00:00:00');
              const transactionDateStartOfDay = startOfDay(transactionDate);
              
              // If accountId is being updated, only update transactions on or after the account was created
              if (income.accountId !== undefined && accountCreatedAt) {
                if (transactionDateStartOfDay.getTime() < accountCreatedAt.getTime()) {
                  return; // Skip past transactions - don't update them to use the new account
                }
              }
              
              const updatedIncome = dayData.income.map((t) => {
                if (t.recurringId === id && t.isRecurring) {
                  const updated: Transaction = { ...t };
                  let transactionChanged = false;
                  if (income.accountId !== undefined && updated.accountId !== income.accountId) {
                    updated.accountId = income.accountId;
                    transactionChanged = true;
                  }
                  if (income.amount !== undefined && updated.amount !== income.amount) {
                    updated.amount = income.amount;
                    transactionChanged = true;
                  }
                  if (income.description !== undefined && updated.description !== income.description) {
                    updated.description = income.description;
                    transactionChanged = true;
                  }
                  if (transactionChanged) {
                    dayHasChanges = true;
                  }
                  return updated;
                }
                return t;
              });
              
              if (dayHasChanges) {
                updatedDays[dateKey] = {
                  ...dayData,
                  income: updatedIncome,
                };
                hasChanges = true;
              }
            });
            
            if (hasChanges) {
              return {
                recurringIncome: updatedRecurringIncome,
                days: updatedDays,
              };
            }
          }
          
          return {
            recurringIncome: updatedRecurringIncome,
          };
        });
        setTimeout(() => get().saveToFirestore(), 0);
      },

      // Auto-populate recurring items for a given month
      populateRecurringForMonth: (year: number, month: number) => {
        const state = get();
        const today = startOfDay(new Date());

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

            // Get the creation date or use today, whichever is later
            // This ensures we only create transactions from when the expense was added forward
            const createdAt = expense.createdAt ? parseISO(expense.createdAt) : today;
            const createdAtStartOfDay = startOfDay(createdAt);
            // Use the later of createdAt or today as the minimum date
            // This ensures transactions are created for today and future dates, but respects createdAt for future items
            const minDateStartOfDay = createdAtStartOfDay.getTime() < today.getTime() ? today : createdAtStartOfDay;

            occurrences.forEach((occurrenceDate) => {
              // Only create transactions for dates on or after the minimum date (allow today's date)
              const occurrenceStartOfDay = startOfDay(occurrenceDate);
              // Use getTime() comparison to explicitly allow today's date (>= comparison)
              if (occurrenceStartOfDay.getTime() < minDateStartOfDay.getTime()) {
                return; // Skip past dates only (today and future dates pass through)
              }

              const dateKey = formatDateKey(occurrenceDate);
              const dayData = state.days[dateKey] || { date: dateKey, income: [], spending: [], transfers: [] };

              // Check if this recurring expense already exists for this date
              // Check both by recurringId/isRecurring flags AND by the expected ID format
              const expectedId = `${expense.id}-${dateKey}`;
              const alreadyExists = dayData.spending.some(
                (t) => (t.recurringId === expense.id && t.isRecurring) || t.id === expectedId
              );

              if (!alreadyExists) {
                const transaction: Transaction = {
                  id: expectedId,
                  type: 'spending',
                  amount: expense.amount,
                  description: expense.description,
                  isRecurring: true,
                  recurringId: expense.id,
                  accountId: expense.accountId,
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

            // Get the creation date or use today, whichever is later
            // This ensures we only create transactions from when the income was added forward
            const createdAt = income.createdAt ? parseISO(income.createdAt) : today;
            const createdAtStartOfDay = startOfDay(createdAt);
            // Use the later of createdAt or today as the minimum date
            // This ensures transactions are created for today and future dates, but respects createdAt for future items
            const minDateStartOfDay = createdAtStartOfDay.getTime() < today.getTime() ? today : createdAtStartOfDay;

            occurrences.forEach((occurrenceDate) => {
              // Only create transactions for dates on or after the minimum date (allow today's date)
              const occurrenceStartOfDay = startOfDay(occurrenceDate);
              // Use getTime() comparison to explicitly allow today's date (>= comparison)
              if (occurrenceStartOfDay.getTime() < minDateStartOfDay.getTime()) {
                return; // Skip past dates only (today and future dates pass through)
              }

              const dateKey = formatDateKey(occurrenceDate);
              const dayData = state.days[dateKey] || { date: dateKey, income: [], spending: [], transfers: [] };

              // Check if this recurring income already exists for this date
              // Check both by recurringId/isRecurring flags AND by the expected ID format
              const expectedId = `${income.id}-${dateKey}`;
              const alreadyExists = dayData.income.some(
                (t) => (t.recurringId === income.id && t.isRecurring) || t.id === expectedId
              );

              if (!alreadyExists) {
                const transaction: Transaction = {
                  id: expectedId,
                  type: 'income',
                  amount: income.amount,
                  description: income.description,
                  isRecurring: true,
                  recurringId: income.id,
                  accountId: income.accountId,
                };
                get().addTransaction(dateKey, transaction);
              }
            });
          });
      },

      // Cleanup past recurring transactions that were created before the recurring item was added
      cleanupPastRecurringTransactions: () => {
        const state = get();
        const today = startOfDay(new Date());
        const updatedDays: Record<string, DayData> = { ...state.days };
        let removedCount = 0;

        // Process all days
        Object.keys(updatedDays).forEach((dateKey) => {
          const dayData = updatedDays[dateKey];
          const date = parseISO(dateKey);
          const dateStartOfDay = startOfDay(date);

          // Check spending transactions
          const validSpending = dayData.spending.filter((transaction) => {
            if (!transaction.isRecurring || !transaction.recurringId) {
              return true; // Keep non-recurring transactions
            }

            // Find the recurring expense
            const expense = state.recurringExpenses.find((e) => e.id === transaction.recurringId);
            if (!expense) {
              return true; // Keep if expense not found (might have been deleted)
            }

            // Get the creation date
            const createdAt = expense.createdAt ? parseISO(expense.createdAt) : today;
            const minDateStartOfDay = startOfDay(createdAt);

            // Remove if transaction date is before the creation date (only remove transactions created before the recurring item existed)
            if (isBefore(dateStartOfDay, minDateStartOfDay)) {
              removedCount++;
              return false;
            }

            return true;
          });

          // Check income transactions
          const validIncome = dayData.income.filter((transaction) => {
            if (!transaction.isRecurring || !transaction.recurringId) {
              return true; // Keep non-recurring transactions
            }

            // Find the recurring income
            const income = state.recurringIncome.find((i) => i.id === transaction.recurringId);
            if (!income) {
              return true; // Keep if income not found (might have been deleted)
            }

            // Get the creation date
            const createdAt = income.createdAt ? parseISO(income.createdAt) : today;
            const minDateStartOfDay = startOfDay(createdAt);

            // Remove if transaction date is before the creation date (only remove transactions created before the recurring item existed)
            if (isBefore(dateStartOfDay, minDateStartOfDay)) {
              removedCount++;
              return false;
            }

            return true;
          });

          // Update the day data if transactions were removed
          if (validSpending.length !== dayData.spending.length || validIncome.length !== dayData.income.length) {
            updatedDays[dateKey] = {
              ...dayData,
              spending: validSpending,
              income: validIncome,
            };
          }
        });

        // Update the store if any changes were made
        if (removedCount > 0) {
          set({ days: updatedDays });
          setTimeout(() => get().saveToFirestore(), 0);
        }

        return removedCount;
      },

      // Account management
      addAccount: (account, alsoTrackAsDebt = true) => {
        const newAccount: Account = {
          ...account,
          id: `account-${Date.now()}-${Math.random()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => {
          const updatedAccounts = [...state.accounts, newAccount];
          let updatedDebts = state.debts;
          
          // Auto-create debt entry for credit cards if alsoTrackAsDebt is true
          if (account.type === 'credit_card' && alsoTrackAsDebt) {
            const newDebt: Debt = {
              id: `debt-${Date.now()}-${Math.random()}`,
              name: account.name,
              type: 'credit_card',
              principalAmount: account.initialBalance,
              currentBalance: account.initialBalance,
              accountId: newAccount.id,
              createdAt: new Date().toISOString(),
            };
            updatedDebts = [...state.debts, newDebt];
          }
          
          const newState = {
            accounts: updatedAccounts,
            debts: updatedDebts,
          };
          
          setTimeout(() => get().saveToFirestore(), 0);
          
          return newState;
        });
      },

      removeAccount: (id) => {
        set((state) => {
          // Remove the account
          const updatedAccounts = state.accounts.filter((a) => a.id !== id);
          
          // Remove debt entries linked to this account
          const updatedDebts = state.debts.filter((d) => d.accountId !== id);
          
          // Clear accountId from recurring expenses that reference this account
          const updatedRecurringExpenses = state.recurringExpenses.map((expense) =>
            expense.accountId === id ? { ...expense, accountId: undefined } : expense
          );
          
          // Clear accountId from recurring income that references this account
          const updatedRecurringIncome = state.recurringIncome.map((income) =>
            income.accountId === id ? { ...income, accountId: undefined } : income
          );
          
          return {
            accounts: updatedAccounts,
            debts: updatedDebts,
            recurringExpenses: updatedRecurringExpenses,
            recurringIncome: updatedRecurringIncome,
          };
        });
        setTimeout(() => get().saveToFirestore(), 0);
      },

      updateAccount: (id, account) => {
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === id ? { ...a, ...account } : a
          ),
        }));
        setTimeout(() => get().saveToFirestore(), 0);
      },

      // Calculate account balance by summing all transactions
      getAccountBalance: (accountId, asOfDate) => {
        const state = get();
        const account = state.accounts.find((a) => a.id === accountId);
        if (!account) return 0;

        let balance = account.initialBalance;
        const cutoffDate = asOfDate ? new Date(asOfDate) : new Date();
        // Normalize cutoff date to start of day in local timezone, then set to end of day
        cutoffDate.setHours(0, 0, 0, 0);
        cutoffDate.setHours(23, 59, 59, 999); // End of day

        // Get the account creation date - only transactions on or after this date should affect the balance
        const accountCreatedAt = account.createdAt ? parseISO(account.createdAt) : new Date(0);
        const accountCreatedAtStartOfDay = startOfDay(accountCreatedAt);

        // Get all date keys and sort them chronologically
        // This is critical - transactions must be processed in date order
        const dateKeys = Object.keys(state.days).sort((a, b) => {
          // Parse as local time for proper comparison
          const dateA = new Date(a + 'T00:00:00');
          const dateB = new Date(b + 'T00:00:00');
          return dateA.getTime() - dateB.getTime();
        });

        // Iterate through all days in chronological order
        dateKeys.forEach((dateKey) => {
          // Parse date as local time at start of day for proper comparison
          const dayDate = new Date(dateKey + 'T00:00:00');
          dayDate.setHours(0, 0, 0, 0);
          
          // Only process transactions up to and including the cutoff date
          if (dayDate.getTime() > cutoffDate.getTime()) return;
          
          // CRITICAL FIX: Only process transactions on or after the account was created
          // This prevents past transactions from affecting a newly created account's balance
          if (dayDate.getTime() < accountCreatedAtStartOfDay.getTime()) return;

          const dayData = state.days[dateKey];
          if (!dayData) return;

          // Process all transactions (income, spending, transfers)
          const allTransactions = [
            ...dayData.income,
            ...(dayData.spending || []),
            ...(dayData.transfers || []),
          ];

          allTransactions.forEach((transaction) => {
            // Regular income/spending affecting this account
            if (transaction.accountId === accountId) {
              // For credit cards, spending increases balance (more debt), payments decrease it (less debt)
              if (account.type === 'credit_card') {
                if (transaction.type === 'income') {
                  balance -= transaction.amount; // Payment reduces debt
                } else if (transaction.type === 'spending') {
                  balance += transaction.amount; // Spending increases debt
                }
              } else {
                // For other accounts, normal logic
                if (transaction.type === 'income') {
                  balance += transaction.amount;
                } else if (transaction.type === 'spending') {
                  balance -= transaction.amount;
                }
              }
            }

            // Transfer out from this account
            if (
              transaction.type === 'transfer' &&
              transaction.accountId === accountId &&
              transaction.transferToAccountId
            ) {
              if (account.type === 'credit_card') {
                balance += transaction.amount; // Transfer out from credit card increases debt (cash advance)
              } else {
                balance -= transaction.amount; // Transfer out from other accounts decreases balance
              }
            }

            // Transfer in to this account
            if (
              transaction.type === 'transfer' &&
              transaction.transferToAccountId === accountId
            ) {
              if (account.type === 'credit_card') {
                balance -= transaction.amount; // Transfer to credit card decreases debt (payment)
              } else {
                balance += transaction.amount; // Transfer to other accounts increases balance
              }
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
        setTimeout(() => get().saveToFirestore(), 0);
      },

      removeCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
        setTimeout(() => get().saveToFirestore(), 0);
      },

      updateCategory: (id, category) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...category } : c
          ),
        }));
        setTimeout(() => get().saveToFirestore(), 0);
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
        setTimeout(() => get().saveToFirestore(), 0);
      },

      removeBudget: (id) => {
        set((state) => ({
          budgets: state.budgets.filter((b) => b.id !== id),
        }));
        setTimeout(() => get().saveToFirestore(), 0);
      },

      updateBudget: (id, budget) => {
        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === id ? { ...b, ...budget } : b
          ),
        }));
        setTimeout(() => get().saveToFirestore(), 0);
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
        setTimeout(() => get().saveToFirestore(), 0);
      },

      removeSavingsGoal: (id) => {
        set((state) => ({
          savingsGoals: state.savingsGoals.filter((g) => g.id !== id),
        }));
        setTimeout(() => get().saveToFirestore(), 0);
      },

      updateSavingsGoal: (id, goal) => {
        set((state) => ({
          savingsGoals: state.savingsGoals.map((g) =>
            g.id === id ? { ...g, ...goal } : g
          ),
        }));
        setTimeout(() => get().saveToFirestore(), 0);
      },

      addToSavingsGoal: (goalId, amount, date, sourceAccountId) => {
        const state = get();
        const goal = state.savingsGoals.find((g) => g.id === goalId);
        if (!goal) return;
        
        const contributionDate = date || new Date().toISOString().split('T')[0];
        
        // Create transaction if source account is provided
        if (sourceAccountId) {
          if (goal.accountId) {
            // Goal has a target account: create a transfer from source to target
            get().transferBetweenAccounts(
              contributionDate,
              sourceAccountId,
              goal.accountId,
              amount,
              `Savings goal: ${goal.name}`
            );
          } else {
            // Goal doesn't have a target account: create a spending transaction
            const transaction: Transaction = {
              id: `savings-goal-${goalId}-${Date.now()}-${Math.random()}`,
              type: 'spending',
              amount,
              description: `Savings goal: ${goal.name}`,
              accountId: sourceAccountId,
            };
            get().addTransaction(contributionDate, transaction);
          }
        }
        
        // Update goal amount
        set((state) => ({
          savingsGoals: state.savingsGoals.map((g) =>
            g.id === goalId
              ? { ...g, currentAmount: g.currentAmount + amount }
              : g
          ),
        }));
        setTimeout(() => get().saveToFirestore(), 0);
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
        setTimeout(() => get().saveToFirestore(), 0);
      },

      removeDebt: (id) => {
        set((state) => ({
          debts: state.debts.filter((d) => d.id !== id),
          debtPayments: state.debtPayments.filter((p) => p.debtId !== id),
        }));
        setTimeout(() => get().saveToFirestore(), 0);
      },

      updateDebt: (id, debt) => {
        set((state) => ({
          debts: state.debts.map((d) =>
            d.id === id ? { ...d, ...debt } : d
          ),
        }));
        setTimeout(() => get().saveToFirestore(), 0);
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
          
          // If accountId is provided, create a transaction
          let transactionId: string | undefined;
          if (payment.accountId) {
            const debt = state.debts.find((d) => d.id === payment.debtId);
            
            // If debt is linked to a credit card account, create a transfer transaction
            // This ensures both the payment account and credit card account balances are updated
            if (debt?.accountId) {
              const transaction: Transaction = {
                id: `debt-payment-transfer-${newPayment.id}`,
                type: 'transfer',
                amount: payment.amount,
                description: payment.description || `Debt payment: ${debt.name}`,
                accountId: payment.accountId, // Account payment is made from
                transferToAccountId: debt.accountId, // Credit card account being paid
              };
              transactionId = transaction.id;
              get().addTransaction(payment.date, transaction);
            } else {
              // Debt not linked to an account, create a spending transaction
              const transaction: Transaction = {
                id: `debt-payment-tx-${newPayment.id}`,
                type: 'spending',
                amount: payment.amount,
                description: payment.description || `Debt payment: ${debt?.name || 'Debt'}`,
                accountId: payment.accountId,
              };
              transactionId = transaction.id;
              get().addTransaction(payment.date, transaction);
            }
          }
          
          const newState = {
            debts: updatedDebts,
            debtPayments: [...state.debtPayments, { ...newPayment, transactionId }],
          };
          
          setTimeout(() => get().saveToFirestore(), 0);
          
          return newState;
        });
      },

      removeDebtPayment: (paymentId) => {
        set((state) => {
          const payment = state.debtPayments.find((p) => p.id === paymentId);
          if (!payment) return state;
          
          // Remove associated transaction if it exists
          if (payment.transactionId) {
            get().removeTransaction(payment.date, payment.transactionId);
          }
          
          // Restore debt balance
          const updatedDebts = state.debts.map((d) =>
            d.id === payment.debtId
              ? { ...d, currentBalance: d.currentBalance + payment.amount }
              : d
          );
          
          const newState = {
            debts: updatedDebts,
            debtPayments: state.debtPayments.filter((p) => p.id !== paymentId),
          };
          
          setTimeout(() => get().saveToFirestore(), 0);
          
          return newState;
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

      syncDebtBalancesFromAccounts: () => {
        const state = get();
        const updatedDebts = state.debts.map((debt) => {
          if (debt.accountId) {
            const account = state.accounts.find((a) => a.id === debt.accountId);
            if (account && account.type === 'credit_card') {
              const accountBalance = get().getAccountBalance(debt.accountId);
              return {
                ...debt,
                currentBalance: Math.abs(accountBalance),
              };
            }
          }
          return debt;
        });
        
        // Only update if there are changes
        if (JSON.stringify(updatedDebts) !== JSON.stringify(state.debts)) {
          set({ debts: updatedDebts });
          setTimeout(() => get().saveToFirestore(), 0);
        }
      },

      // Firestore sync state
      isLoading: false,
      isInitialized: false,

      // Initialize budget data from Firestore or migrate from localStorage
      initializeBudgetData: async () => {
        const { user } = useAuthStore.getState();
        if (!user) {
          set({ isLoading: false, isInitialized: true });
          return;
        }

        // Only skip if currently loading (to prevent concurrent calls)
        // Don't skip based on isInitialized - we need to check Firestore every time on new devices
        const currentState = get();
        if (currentState.isLoading) {
          return;
        }

        set({ isLoading: true });

        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          let firestoreData = null;
          let hasFirestoreData = false;
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            const budgetData = data.budgetData;
            
            if (budgetData) {
              // Check if budgetData actually has any data
              hasFirestoreData = (budgetData.days && Object.keys(budgetData.days).length > 0) ||
                                (budgetData.accounts && budgetData.accounts.length > 0) ||
                                (budgetData.recurringExpenses && budgetData.recurringExpenses.length > 0) ||
                                (budgetData.recurringIncome && budgetData.recurringIncome.length > 0) ||
                                (budgetData.budgets && budgetData.budgets.length > 0) ||
                                (budgetData.savingsGoals && budgetData.savingsGoals.length > 0) ||
                                (budgetData.debts && budgetData.debts.length > 0);
              
              if (hasFirestoreData) {
                firestoreData = budgetData;
              }
            }
          }
          
          // Firestore is the source of truth - if it has data, use it
          if (hasFirestoreData && firestoreData) {
            const migratedData = migrateOldData(firestoreData);
            set({
              days: migratedData.days || {},
              recurringExpenses: migratedData.recurringExpenses || [],
              recurringIncome: migratedData.recurringIncome || [],
              accounts: migratedData.accounts || [],
              categories: migratedData.categories || get().categories,
              budgets: migratedData.budgets || [],
              savingsGoals: migratedData.savingsGoals || [],
              debts: migratedData.debts || [],
              debtPayments: migratedData.debtPayments || [],
              isLoading: false,
              isInitialized: true,
            });
            // Sync debt balances after loading data to repair any discrepancies
            setTimeout(() => get().syncDebtBalancesFromAccounts(), 100);
          } else {
            // No Firestore data - check if localStorage has data to migrate
            const currentState = get();
            const currentStateHasData = (currentState.days && Object.keys(currentState.days).length > 0) ||
                                       (currentState.accounts && currentState.accounts.length > 0) ||
                                       (currentState.recurringExpenses && currentState.recurringExpenses.length > 0) ||
                                       (currentState.recurringIncome && currentState.recurringIncome.length > 0) ||
                                       (currentState.budgets && currentState.budgets.length > 0) ||
                                       (currentState.savingsGoals && currentState.savingsGoals.length > 0) ||
                                       (currentState.debts && currentState.debts.length > 0);
            
            if (currentStateHasData) {
              try {
                // Migrate current state (from localStorage rehydration) to Firestore
                const migratedState = migrateOldData(currentState);
                
                // Add timeout to detect hanging operations
                const saveStartTime = Date.now();
                // Use updateDoc instead of setDoc with merge - more reliable for updating specific fields
                const budgetDataToSave = {
                  days: migratedState.days || {},
                  recurringExpenses: migratedState.recurringExpenses || [],
                  recurringIncome: migratedState.recurringIncome || [],
                  accounts: migratedState.accounts || [],
                  categories: migratedState.categories || [],
                  budgets: migratedState.budgets || [],
                  savingsGoals: migratedState.savingsGoals || [],
                  debts: migratedState.debts || [],
                  debtPayments: migratedState.debtPayments || [],
                };
                
                // Try updateDoc first (if doc exists), fallback to setDoc with merge
                const savePromise = (async () => {
                  try {
                    // Try updateDoc first - faster and more reliable
                    await updateDoc(userDocRef, {
                      budgetData: budgetDataToSave,
                      budgetDataMigratedAt: new Date().toISOString(),
                    });
                  } catch (updateError: any) {
                    // If update fails (doc doesn't exist), use setDoc with merge
                    if (updateError?.code === 'not-found' || updateError?.code === 'permission-denied') {
                      await setDoc(userDocRef, {
                        budgetData: budgetDataToSave,
                        budgetDataMigratedAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                      }, { merge: true });
                    } else {
                      throw updateError;
                    }
                  }
                })();
                
                const timeoutPromise = new Promise((_, reject) => {
                  setTimeout(() => {
                    const timeoutError = new Error('setDoc timeout after 30 seconds');
                    console.error('Firestore save timeout:', timeoutError);
                    reject(timeoutError);
                  }, 30000);
                });
                
                try {
                  await Promise.race([savePromise, timeoutPromise]);
                  const saveDuration = Date.now() - saveStartTime;
                  console.log('Firestore save completed in', saveDuration, 'ms');
                } catch (saveError) {
                  const saveDuration = Date.now() - saveStartTime;
                  console.error('Firestore save failed:', saveError, 'Duration:', saveDuration, 'ms');
                  throw saveError; // Re-throw to be caught by outer catch
                }
                
                // State already has the data, just mark as initialized
                set({
                  isLoading: false,
                  isInitialized: true,
                });
                // Sync debt balances after loading data to repair any discrepancies
                setTimeout(() => get().syncDebtBalancesFromAccounts(), 100);
              } catch (migrationError) {
                console.error('Error migrating localStorage data to Firestore:', migrationError);
                // Still mark as initialized so the app can continue
                set({
                  isLoading: false,
                  isInitialized: true,
                });
                // Sync debt balances even on error to repair any discrepancies
                setTimeout(() => get().syncDebtBalancesFromAccounts(), 100);
              }
            } else {
              // Check localStorage as fallback (in case rehydration didn't work)
              const localStorageData = localStorage.getItem('budget-storage');
              if (localStorageData) {
                try {
                  const parsed = JSON.parse(localStorageData);
                  const state = parsed.state;
                  if (state && (state.days || state.accounts || state.recurringExpenses || state.recurringIncome)) {
                    const migratedState = migrateOldData(state);
                    await setDoc(userDocRef, {
                      budgetData: {
                        days: migratedState.days || {},
                        recurringExpenses: migratedState.recurringExpenses || [],
                        recurringIncome: migratedState.recurringIncome || [],
                        accounts: migratedState.accounts || [],
                        categories: migratedState.categories || [],
                        budgets: migratedState.budgets || [],
                        savingsGoals: migratedState.savingsGoals || [],
                        debts: migratedState.debts || [],
                        debtPayments: migratedState.debtPayments || [],
                      },
                      budgetDataMigratedAt: new Date().toISOString(),
                      createdAt: new Date().toISOString(),
                    }, { merge: true });
                    
                    set({
                      days: migratedState.days || {},
                      recurringExpenses: migratedState.recurringExpenses || [],
                      recurringIncome: migratedState.recurringIncome || [],
                      accounts: migratedState.accounts || [],
                      categories: migratedState.categories || get().categories,
                      budgets: migratedState.budgets || [],
                      savingsGoals: migratedState.savingsGoals || [],
                      debts: migratedState.debts || [],
                      debtPayments: migratedState.debtPayments || [],
                      isLoading: false,
                      isInitialized: true,
                    });
                    // Sync debt balances after loading data to repair any discrepancies
                    setTimeout(() => get().syncDebtBalancesFromAccounts(), 100);
                  } else {
                    // No valid data, initialize empty
                    await setDoc(userDocRef, {
                      budgetData: {
                        days: {},
                        recurringExpenses: [],
                        recurringIncome: [],
                        accounts: [],
                        categories: [],
                        budgets: [],
                        savingsGoals: [],
                        debts: [],
                        debtPayments: [],
                      },
                      createdAt: new Date().toISOString(),
                    }, { merge: true });
                    set({ isLoading: false, isInitialized: true });
                  }
                } catch (error) {
                  console.error('Error parsing localStorage data:', error);
                  // Initialize empty on error
                  await setDoc(userDocRef, {
                    budgetData: {
                      days: {},
                      recurringExpenses: [],
                      recurringIncome: [],
                      accounts: [],
                      categories: [],
                      budgets: [],
                      savingsGoals: [],
                      debts: [],
                      debtPayments: [],
                    },
                    createdAt: new Date().toISOString(),
                  }, { merge: true });
                  set({ isLoading: false, isInitialized: true });
                }
              } else {
                // No data anywhere, initialize empty
                await setDoc(userDocRef, {
                  budgetData: {
                    days: {},
                    recurringExpenses: [],
                    recurringIncome: [],
                    accounts: [],
                    categories: [],
                    budgets: [],
                    savingsGoals: [],
                    debts: [],
                    debtPayments: [],
                  },
                  createdAt: new Date().toISOString(),
                }, { merge: true });
                set({ isLoading: false, isInitialized: true });
              }
            }
          }
        } catch (error) {
          console.error('Error initializing budget data:', error);
          // On error, still mark as initialized so saves can work
          set({ isLoading: false, isInitialized: true });
        }
      },

      // Save current state to Firestore (debounced)
      saveToFirestore: async () => {
        const { user } = useAuthStore.getState();
        if (!user) {
          return;
        }

        // Don't save if not initialized yet - wait for initialization to complete
        if (!get().isInitialized) {
          return;
        }

        // Clear existing timeout to debounce saves
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }

        // Debounce: wait 500ms after last change before saving
        saveTimeout = setTimeout(async () => {
          try {
            const state = get();
            const userDocRef = doc(db, 'users', user.uid);
            
            await setDoc(userDocRef, {
              budgetData: {
                days: state.days,
                recurringExpenses: state.recurringExpenses,
                recurringIncome: state.recurringIncome,
                accounts: state.accounts,
                categories: state.categories,
                budgets: state.budgets,
                savingsGoals: state.savingsGoals,
                debts: state.debts,
                debtPayments: state.debtPayments,
              },
              budgetDataUpdatedAt: new Date().toISOString(),
            }, { merge: true });
          } catch (error) {
            console.error('Error saving to Firestore:', error);
            // Log error but don't throw - app should continue working
          }
        }, 500); // 500ms debounce
      },
    }),
    {
      name: 'budget-storage',
      partialize: (state) => ({
        // Only persist data, not initialization flags
        // This ensures each device checks Firestore on login
        days: state.days,
        recurringExpenses: state.recurringExpenses,
        recurringIncome: state.recurringIncome,
        accounts: state.accounts,
        categories: state.categories,
        budgets: state.budgets,
        savingsGoals: state.savingsGoals,
        debts: state.debts,
        debtPayments: state.debtPayments,
        // Don't persist isInitialized or isLoading - these should be reset per device
      }),
      onRehydrateStorage: () => (state) => {
        // Always allow rehydration for offline support
        // But initializeBudgetData will check Firestore first and use that if available
        // Note: isInitialized and isLoading are not persisted (via partialize), so they default to false
        // This ensures initializeBudgetData will run and check Firestore on each device
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

// Temporary debug export - remove after fixing balance issue
if (typeof window !== 'undefined') {
  (window as any).debugBudgetStore = useBudgetStore;
}

