export interface Transaction {
  id: string;
  type: 'income' | 'spending' | 'transfer';
  amount: number;
  description: string;
  category?: string; // Category ID
  accountId?: string; // Account the transaction affects
  transferToAccountId?: string; // For transfer transactions
  isRecurring?: boolean; // Optional flag to mark auto-generated transactions
  recurringId?: string; // Link back to the recurring item that generated this
}

export interface DayData {
  date: string; // YYYY-MM-DD format
  income: Transaction[];
  spending: Transaction[];
  transfers: Transaction[]; // Transfers between accounts (counted in spending for cash flow)
}

export type RecurrenceType = 
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual';

export type RecurrenceDayType = 
  | 'dayOfMonth' // 1-31
  | 'dayOfWeek' // 0-6, Sunday = 0
  | 'lastDayOfMonth'; // Special case for last day

export interface RecurrencePattern {
  type: RecurrenceType;
  dayType?: RecurrenceDayType;
  dayValue?: number; // day of month (1-31) or day of week (0-6)
  interval?: number; // for custom intervals (e.g., every N days/weeks/months)
}

export interface RecurringExpense {
  id: string;
  amount: number;
  description: string;
  category?: string;
  accountId?: string; // Account the recurring expense affects
  pattern: RecurrencePattern;
  startDate?: string; // YYYY-MM-DD format, optional
  endDate?: string; // YYYY-MM-DD format, optional
  isActive: boolean;
  createdAt: string; // ISO date string
}

export interface RecurringIncome {
  id: string;
  amount: number;
  description: string;
  category?: string;
  accountId?: string; // Account the recurring income affects
  pattern: RecurrencePattern;
  startDate?: string; // YYYY-MM-DD format, optional
  endDate?: string; // YYYY-MM-DD format, optional
  isActive: boolean;
  createdAt: string; // ISO date string
}

export type AccountType = 
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'ira'
  | '401k'
  | 'investment'
  | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number; // Starting balance when account was added
  createdAt: string; // ISO date string
}

export interface BudgetState {
  days: Record<string, DayData>;
  addTransaction: (date: string, transaction: Transaction) => void;
  removeTransaction: (date: string, transactionId: string) => void;
  updateTransaction: (date: string, transactionId: string, transaction: Partial<Transaction>) => void;
  getDayData: (date: string) => DayData;
  getDailyTotal: (date: string) => { income: number; spending: number; profit: number };
  getWeeklyTotal: (startDate: Date, endDate: Date) => { income: number; spending: number; profit: number };
  getMonthlyTotal: (year: number, month: number) => { income: number; spending: number; profit: number };
}

// Category types
export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string; // For UI display
  icon?: string; // For UI display
  createdAt: string;
}

// Budget types
export interface Budget {
  id: string;
  categoryId: string; // Category ID
  amount: number; // Budget limit
  period: 'weekly' | 'monthly' | 'yearly';
  year: number;
  month?: number; // For monthly budgets
  week?: number; // For weekly budgets
  createdAt: string;
}

// Savings goal types
export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string; // Optional target date
  accountId?: string; // Link to specific account
  createdAt: string;
}

// Debt types
export interface Debt {
  id: string;
  name: string;
  type: 'credit_card' | 'loan' | 'mortgage' | 'other';
  principalAmount: number; // Original debt amount
  currentBalance: number; // Current remaining balance
  interestRate?: number; // Annual interest rate
  minimumPayment?: number; // Minimum monthly payment
  dueDate?: number; // Day of month payment is due
  accountId?: string; // Link to account if applicable
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description?: string;
  accountId?: string; // Account the payment was made from
  transactionId?: string; // ID of the associated spending transaction
}

