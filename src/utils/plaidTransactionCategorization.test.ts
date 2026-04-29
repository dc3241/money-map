import type { PlaidTransaction } from '../hooks/usePlaidTransactions';
import type { TransactionCategoryOverride, TransactionCategoryRule } from '../types';
import {
  matchesTransactionCategoryRule,
  resolvePlaidTransactionCategoryId,
} from './plaidTransactionCategorization';

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertTrue(value: boolean, label: string): void {
  if (!value) throw new Error(`${label}: expected true, received false`);
}

const baseTx: PlaidTransaction = {
  id: 'doc-1',
  transaction_id: 'tx-1',
  date: '2026-04-20',
  name: 'Verizon Wireless',
  merchant_name: 'VERIZON',
  amount: 99.95,
  category: ['Service'],
  category_primary: 'RENT_AND_UTILITIES',
  pending: false,
  account_id: 'acct-checking',
  transaction_type: null,
};

export function runPlaidTransactionCategorizationTests(): void {
  const rule: TransactionCategoryRule = {
    id: 'rule-1',
    active: true,
    priority: 10,
    categoryId: 'cat-exp-utilities',
    matcher: {
      merchantContains: 'verizon',
      accountId: 'acct-checking',
      amountMin: 90,
      amountMax: 120,
      direction: 'expense',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  assertTrue(matchesTransactionCategoryRule(baseTx, rule), 'rule matcher basics');

  const badDirection = { ...rule, matcher: { ...rule.matcher, direction: 'income' as const } };
  assertEqual(matchesTransactionCategoryRule(baseTx, badDirection), false, 'direction mismatch');

  const badAmount = { ...rule, matcher: { ...rule.matcher, amountMax: 90 } };
  assertEqual(matchesTransactionCategoryRule(baseTx, badAmount), false, 'amount mismatch');

  const overrides: Record<string, TransactionCategoryOverride> = {
    'tx-1': {
      transactionId: 'tx-1',
      categoryId: 'cat-exp-bills',
      source: 'user',
      updatedAt: new Date().toISOString(),
    },
  };
  const resolvedWithOverride = resolvePlaidTransactionCategoryId(
    baseTx,
    overrides,
    [rule],
    'cat-exp-housing'
  );
  assertEqual(resolvedWithOverride, 'cat-exp-bills', 'override precedence');

  const lowPriorityRule = { ...rule, id: 'rule-2', priority: 5, categoryId: 'cat-exp-phone' };
  const resolvedByRulePriority = resolvePlaidTransactionCategoryId(
    baseTx,
    {},
    [rule, lowPriorityRule],
    'cat-exp-housing'
  );
  assertEqual(resolvedByRulePriority, 'cat-exp-phone', 'rule priority precedence');

  const resolvedFallback = resolvePlaidTransactionCategoryId(
    { ...baseTx, merchant_name: 'Unknown Merchant' },
    {},
    [rule],
    'cat-exp-housing'
  );
  assertEqual(resolvedFallback, 'cat-exp-housing', 'fallback when no matches');
}
