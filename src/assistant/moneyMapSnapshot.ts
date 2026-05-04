import type { Category, Budget, SavingsGoal, Debt, Account, RecurringExpense, RecurringIncome } from '../types';
import { formatDateKey, getWeekRange } from '../utils/dateUtils';

export type MoneyMapTotals = {
  income: number;
  spending: number;
  profit: number;
};

export type MoneyMapBudgetRow = {
  categoryName: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
};

export type MoneyMapGoalRow = {
  name: string;
  target: number;
  current: number;
  progressPct: number;
};

export type MoneyMapDebtRow = {
  name: string;
  balance: number;
};

export type MoneyMapContextSnapshot = {
  generatedAt: string;
  referenceDate: string;
  calendarMonth: { year: number; month: number };
  monthTotals: MoneyMapTotals;
  weekTotals: MoneyMapTotals & { weekStart: string; weekEnd: string };
  usePlaidLinkedActuals: boolean;
  manualAccountCount: number;
  budgets: MoneyMapBudgetRow[];
  savingsGoals: MoneyMapGoalRow[];
  debts: MoneyMapDebtRow[];
  totalDebt: number;
  recurringExpenseCount: number;
  recurringIncomeCount: number;
  categoryCount: number;
  budgetRowCount: number;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export type BuildSnapshotStoreSlice = {
  categories: Category[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  debts: Debt[];
  accounts: Account[];
  recurringExpenses: RecurringExpense[];
  recurringIncome: RecurringIncome[];
  getBudgetStatus: (budgetId: string, year: number, month?: number) => {
    limit: number;
    spent: number;
    remaining: number;
    percentage: number;
  };
  getMonthlyTotal: (year: number, month: number) => MoneyMapTotals;
  getWeeklyTotal: (start: Date, end: Date) => MoneyMapTotals;
  getTotalDebt: () => number;
  getDebtBalance: (debtId: string) => number;
};

export function buildMoneyMapContextSnapshot(
  store: BuildSnapshotStoreSlice,
  referenceDate: Date,
  options: {
    usePlaidLinkedActuals: boolean;
    /** When set and matches reference month/week, these override manual calendar totals. */
    plaidOverlay?: {
      year: number;
      month: number;
      weekStartKey: string;
      monthly: MoneyMapTotals;
      weekly: MoneyMapTotals;
    } | null;
  }
): MoneyMapContextSnapshot {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;
  const { start: wStart, end: wEnd } = getWeekRange(referenceDate);
  const weekStartKey = formatDateKey(wStart);

  let monthTotals = store.getMonthlyTotal(year, month);
  let weekTotals = store.getWeeklyTotal(wStart, wEnd);

  const po = options.plaidOverlay;
  if (
    po &&
    po.year === year &&
    po.month === month &&
    po.weekStartKey === weekStartKey
  ) {
    monthTotals = { ...po.monthly };
    weekTotals = { ...po.weekly };
  }

  const catById = new Map(store.categories.map((c) => [c.id, c]));
  const budgets: MoneyMapBudgetRow[] = store.budgets.map((b) => {
    const st = store.getBudgetStatus(b.id, year, month);
    const categoryName = catById.get(b.categoryId)?.name ?? 'Category';
    return {
      categoryName,
      limit: roundMoney(st.limit),
      spent: roundMoney(st.spent),
      remaining: roundMoney(st.remaining),
      percentage: roundMoney(st.percentage),
    };
  });

  const savingsGoals: MoneyMapGoalRow[] = store.savingsGoals.map((g) => {
    const target = g.targetAmount;
    const current = g.currentAmount ?? 0;
    const progressPct = target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0;
    return {
      name: g.name,
      target: roundMoney(target),
      current: roundMoney(current),
      progressPct,
    };
  });

  const debts: MoneyMapDebtRow[] = store.debts.map((d) => ({
    name: d.name,
    balance: roundMoney(store.getDebtBalance(d.id)),
  }));

  const activeExp = store.recurringExpenses.filter((e) => e.isActive !== false);
  const activeInc = store.recurringIncome.filter((i) => i.isActive !== false);

  return {
    generatedAt: new Date().toISOString(),
    referenceDate: formatDateKey(referenceDate),
    calendarMonth: { year, month },
    monthTotals: {
      income: roundMoney(monthTotals.income),
      spending: roundMoney(monthTotals.spending),
      profit: roundMoney(monthTotals.profit),
    },
    weekTotals: {
      income: roundMoney(weekTotals.income),
      spending: roundMoney(weekTotals.spending),
      profit: roundMoney(weekTotals.profit),
      weekStart: formatDateKey(wStart),
      weekEnd: formatDateKey(wEnd),
    },
    usePlaidLinkedActuals: options.usePlaidLinkedActuals,
    manualAccountCount: store.accounts.length,
    budgets,
    savingsGoals,
    debts,
    totalDebt: roundMoney(store.getTotalDebt()),
    recurringExpenseCount: activeExp.length,
    recurringIncomeCount: activeInc.length,
    categoryCount: store.categories.length,
    budgetRowCount: budgets.length,
  };
}
