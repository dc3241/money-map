import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { formatDateKey } from '../utils/dateUtils';
import { getOccurrencesInMonth, migrateOldRecurringExpense, migrateOldRecurringIncome } from '../utils/recurrenceUtils';
import { matchesExistingTransaction, matchesRecurringPattern, type StatementTransaction, type ImportResult } from '../utils/statementParser';
import type { Transaction, DayData, RecurringExpense, RecurringIncome, Account } from '../types';

interface StoreState {
  days: Record<string, DayData>;
  recurringExpenses: RecurringExpense[];
  recurringIncome: RecurringIncome[];
  accounts: Account[];
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
}

  // Migration function for old data format
function migrateOldData(state: any): any {
  if (!state) return state;
  
  const newState = { ...state };

  // Initialize accounts array if it doesn't exist
  if (!newState.accounts) {
    newState.accounts = [];
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

