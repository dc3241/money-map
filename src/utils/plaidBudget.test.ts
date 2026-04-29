import type { PlaidTransaction } from '../hooks/usePlaidTransactions';
import type { Budget, Category, TransactionCategoryOverride, TransactionCategoryRule } from '../types';
import { getPlaidBudgetSpending, getPlaidBudgetTransactionsAsStoreShape } from './plaidBudget';

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

const categories: Category[] = [
  { id: 'cat-exp-housing', name: 'Housing', type: 'expense', createdAt: new Date().toISOString() },
  { id: 'cat-exp-utilities', name: 'Utilities', type: 'expense', createdAt: new Date().toISOString() },
];

const housingBudget: Budget = {
  id: 'budget-housing',
  categoryId: 'cat-exp-housing',
  amount: 265,
  period: 'weekly',
  windowStart: '2026-04-20',
  windowEnd: '2026-04-26',
  createdAt: new Date().toISOString(),
};

const tx: PlaidTransaction = {
  id: 'doc-verizon',
  transaction_id: 'tx-verizon',
  date: '2026-04-22',
  name: 'Verizon',
  merchant_name: 'VERIZON',
  amount: 99.95,
  category: ['Service'],
  category_primary: 'RENT_AND_UTILITIES',
  pending: false,
  account_id: 'acct-1',
  transaction_type: null,
};

export function runPlaidBudgetCategorizationTests(): void {
  const baselineSpent = getPlaidBudgetSpending([tx], housingBudget, categories, {}, [], 2026, 4);
  assertEqual(baselineSpent, 99.95, 'baseline fallback mapped to housing');

  const overrides: Record<string, TransactionCategoryOverride> = {
    'tx-verizon': {
      transactionId: 'tx-verizon',
      categoryId: 'cat-exp-utilities',
      source: 'user',
      updatedAt: new Date().toISOString(),
    },
  };
  const spentWithOverride = getPlaidBudgetSpending([tx], housingBudget, categories, overrides, [], 2026, 4);
  assertEqual(spentWithOverride, 0, 'override excludes housing spend');

  const rules: TransactionCategoryRule[] = [
    {
      id: 'rule-verizon',
      active: true,
      priority: 10,
      categoryId: 'cat-exp-utilities',
      matcher: {
        merchantContains: 'verizon',
        direction: 'expense',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  const spentWithRule = getPlaidBudgetSpending([tx], housingBudget, categories, {}, rules, 2026, 4);
  assertEqual(spentWithRule, 0, 'rule excludes housing spend');

  const txList = getPlaidBudgetTransactionsAsStoreShape(
    [tx],
    { ...housingBudget, categoryId: 'cat-exp-utilities', id: 'budget-utilities' },
    categories,
    {},
    rules,
    2026,
    4
  );
  assertEqual(txList.length, 1, 'utilities budget includes transaction after rule');
  assertEqual(txList[0].transaction.category, 'cat-exp-utilities', 'resolved category in transaction payload');
}
