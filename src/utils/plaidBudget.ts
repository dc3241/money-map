import { parseISO, startOfDay } from "date-fns";
import type { PlaidTransaction } from "../hooks/usePlaidTransactions";
import type {
  Budget,
  Category,
  Transaction,
  TransactionCategoryOverride,
  TransactionCategoryRule,
} from "../types";
import { deriveLegacyBudgetWindow, isDateInWindow } from "./budgetPeriods";
import { resolvePlaidTransactionCategoryId } from "./plaidTransactionCategorization";

const EXPENSE_CATEGORY_PLAID_PRIMARIES: Record<string, string[]> = {
  "cat-exp-housing": ["RENT_AND_UTILITIES"],
  "cat-exp-utilities": ["RENT_AND_UTILITIES"],
  "cat-exp-food": ["FOOD_AND_DRINK"],
  "cat-exp-transport": ["TRANSPORTATION"],
  "cat-exp-insurance": ["GENERAL_SERVICES"],
  "cat-exp-healthcare": ["MEDICAL", "PERSONAL_CARE"],
  "cat-exp-entertainment": ["ENTERTAINMENT"],
  "cat-exp-shopping": ["GENERAL_MERCHANDISE", "HOME_IMPROVEMENT"],
  "cat-exp-bills": ["BANK_FEES", "RENT_AND_UTILITIES", "GENERAL_SERVICES"],
  "cat-exp-other": [],
};

const INCOME_CATEGORY_PLAID_PRIMARIES: Record<string, string[]> = {
  "cat-inc-salary": ["INCOME"],
  "cat-inc-other": ["INCOME", "TRANSFER_IN"],
};

function txInBudgetPeriod(
  budget: Budget,
  dateStr: string,
  year: number,
  month?: number
): boolean {
  const window =
    budget.windowStart && budget.windowEnd
      ? { windowStart: budget.windowStart, windowEnd: budget.windowEnd }
      : deriveLegacyBudgetWindow(
          budget as Partial<Budget> & { period?: string },
          year,
          month ?? new Date().getMonth() + 1
        );
  return isDateInWindow(dateStr, window.windowStart, window.windowEnd);
}

function matchesExpenseCategory(
  tx: PlaidTransaction,
  categoryId: string,
  categoryName: string
): boolean {
  if (tx.amount <= 0) return false;
  const primary = tx.category_primary?.toUpperCase() ?? "";
  const mapped = EXPENSE_CATEGORY_PLAID_PRIMARIES[categoryId];
  if (mapped && mapped.length > 0 && primary && mapped.includes(primary)) {
    return true;
  }
  if (!mapped || mapped.length === 0) {
    const needle = categoryName.trim().toLowerCase();
    if (needle.length >= 3 && primary) {
      const compact = primary.replace(/_/g, " ").toLowerCase();
      if (compact.includes(needle.slice(0, 5))) return true;
    }
    if (
      tx.category?.some((c) => {
        const cl = c.toLowerCase();
        return (
          needle.length >= 3 &&
          (cl.includes(needle.slice(0, 4)) || needle.includes(cl.slice(0, 4)))
        );
      })
    ) {
      return true;
    }
  }
  return false;
}

function matchesIncomeCategory(tx: PlaidTransaction, categoryId: string): boolean {
  if (tx.amount >= 0) return false;
  const primary = tx.category_primary?.toUpperCase() ?? "";
  const mapped = INCOME_CATEGORY_PLAID_PRIMARIES[categoryId];
  if (
    mapped?.length &&
    primary &&
    mapped.some((p) => primary === p || primary.startsWith(p))
  ) {
    return true;
  }
  if (!mapped || mapped.length === 0) {
    return primary === "INCOME" || primary === "TRANSFER_IN" || primary.startsWith("INCOME");
  }
  return mapped.includes(primary);
}

export function getPlaidBudgetSpending(
  transactions: PlaidTransaction[],
  budget: Budget,
  categories: Category[],
  overrides: Record<string, TransactionCategoryOverride> = {},
  rules: TransactionCategoryRule[] = [],
  year: number,
  month?: number
): number {
  const cat = categories.find((c) => c.id === budget.categoryId);
  if (!cat) return 0;

  const today = startOfDay(new Date());
  let total = 0;

  for (const tx of transactions) {
    if (!txInBudgetPeriod(budget, tx.date, year, month)) continue;
    if (startOfDay(parseISO(tx.date)) > today) continue;
    if (tx.pending) continue;

    const fallbackCategoryId = inferFallbackCategoryId(tx, categories);
    const resolvedCategoryId = resolvePlaidTransactionCategoryId(
      tx,
      overrides,
      rules,
      fallbackCategoryId
    );

    if (cat.type === "income") {
      if (resolvedCategoryId === budget.categoryId) {
        total += Math.abs(tx.amount);
      }
    } else if (resolvedCategoryId === budget.categoryId && tx.amount > 0) {
      total += tx.amount;
    }
  }

  return total;
}

export function getPlaidBudgetStatus(
  transactions: PlaidTransaction[],
  budget: Budget,
  categories: Category[],
  overrides: Record<string, TransactionCategoryOverride> = {},
  rules: TransactionCategoryRule[] = [],
  year: number,
  month?: number
): { limit: number; spent: number; remaining: number; percentage: number } {
  const spent = getPlaidBudgetSpending(
    transactions,
    budget,
    categories,
    overrides,
    rules,
    year,
    month
  );
  const limit = budget.amount;
  const remaining = limit - spent;
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  return { limit, spent, remaining, percentage };
}

export function getPlaidBudgetTransactionsAsStoreShape(
  transactions: PlaidTransaction[],
  budget: Budget,
  categories: Category[],
  overrides: Record<string, TransactionCategoryOverride> = {},
  rules: TransactionCategoryRule[] = [],
  year: number,
  month?: number
): { date: string; transaction: Transaction }[] {
  const cat = categories.find((c) => c.id === budget.categoryId);
  if (!cat) return [];

  const today = startOfDay(new Date());
  const result: { date: string; transaction: Transaction }[] = [];

  for (const tx of transactions) {
    if (!txInBudgetPeriod(budget, tx.date, year, month)) continue;
    if (startOfDay(parseISO(tx.date)) > today) continue;
    if (tx.pending) continue;

    const fallbackCategoryId = inferFallbackCategoryId(tx, categories);
    const resolvedCategoryId = resolvePlaidTransactionCategoryId(
      tx,
      overrides,
      rules,
      fallbackCategoryId
    );
    if (resolvedCategoryId !== budget.categoryId) continue;

    if (cat.type === "income") {
      if (tx.amount >= 0) continue;
      result.push({
        date: tx.date,
        transaction: {
          id: tx.transaction_id,
          type: "income",
          amount: Math.abs(tx.amount),
          description: tx.merchant_name ?? tx.name ?? "Income",
          category: resolvedCategoryId,
        },
      });
    } else if (tx.amount > 0) {
      result.push({
        date: tx.date,
        transaction: {
          id: tx.transaction_id,
          type: "spending",
          amount: tx.amount,
          description: tx.merchant_name ?? tx.name ?? "Purchase",
          category: resolvedCategoryId,
        },
      });
    }
  }

  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

export function inferFallbackCategoryId(
  tx: PlaidTransaction,
  categories: Category[]
): string | undefined {
  const candidates = categories.filter((category) =>
    category.type === "income" ? tx.amount < 0 : tx.amount > 0
  );
  for (const category of candidates) {
    if (category.type === "income") {
      if (matchesIncomeCategory(tx, category.id)) return category.id;
    } else if (matchesExpenseCategory(tx, category.id, category.name)) {
      return category.id;
    }
  }
  return undefined;
}
