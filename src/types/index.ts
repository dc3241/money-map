export interface Transaction {
  id: string;
  type: 'income' | 'spending' | 'transfer';
  amount: number;
  description: string;
  accountId?: string; // Account the transaction affects
  transferToAccountId?: string; // For transfer transactions
  isRecurring?: boolean; // Optional flag to mark auto-generated transactions
  recurringId?: string; // Link back to the recurring item that generated this
}

export interface DayData {
  date: string; // YYYY-MM-DD format
  income: Transaction[];
  spending: Transaction[];
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

