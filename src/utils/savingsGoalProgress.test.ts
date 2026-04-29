import type { PlaidAccount } from '../hooks/usePlaidAccounts';
import type { PlaidTransaction } from '../hooks/usePlaidTransactions';
import type { SavingsGoal } from '../types';
import { computeSavingsGoalProgress } from './savingsGoalProgress';

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertTrue(value: boolean, label: string): void {
  if (!value) {
    throw new Error(`${label}: expected true, received false`);
  }
}

const baseGoal: SavingsGoal = {
  id: 'g1',
  name: 'Goal',
  targetAmount: 1000,
  createdAt: '2026-01-15T00:00:00.000Z',
  mode: 'flow_linked',
  matchRules: [{ id: 'r1', kind: 'name_regex', value: 'save' }],
  includePending: false,
};

const baseTx: PlaidTransaction = {
  id: 'doc1',
  transaction_id: 'tx1',
  date: '2026-01-20',
  name: 'Save Transfer',
  merchant_name: null,
  amount: -200,
  category: null,
  category_primary: 'TRANSFER_OUT',
  pending: false,
  account_id: 'acct-1',
  transaction_type: null,
};

export function runSavingsGoalProgressTests(): void {
  const balanceGoal: SavingsGoal = {
    ...baseGoal,
    mode: 'balance_linked',
    plaidAccountId: 'p1',
  };
  const accounts: PlaidAccount[] = [
    {
      id: 'a1',
      account_id: 'p1',
      item_id: null,
      name: 'Savings',
      type: 'depository',
      subtype: null,
      mask: null,
      current_balance: 450,
      available_balance: 440,
    },
  ];
  const progressFromCurrent = computeSavingsGoalProgress(balanceGoal, accounts, []);
  assertEqual(progressFromCurrent.current, 450, 'balance mode current_balance');

  const progressFromAvailable = computeSavingsGoalProgress(
    balanceGoal,
    [{ ...accounts[0], current_balance: null, available_balance: 430 }],
    []
  );
  assertEqual(progressFromAvailable.current, 430, 'balance mode available_balance fallback');

  const missingLinked = computeSavingsGoalProgress(balanceGoal, [], []);
  assertEqual(missingLinked.current, 0, 'missing linked account current');
  assertTrue(missingLinked.warnings.length > 0, 'missing linked account warning');

  const flowBySource = computeSavingsGoalProgress(
    { ...baseGoal, sourcePlaidAccountId: 'acct-1' },
    [],
    [baseTx, { ...baseTx, id: 'doc2', transaction_id: 'tx2', account_id: 'acct-2' }]
  );
  assertEqual(flowBySource.current, 200, 'flow source account filter');

  const flowDefaultPending = computeSavingsGoalProgress(
    baseGoal,
    [],
    [{ ...baseTx, pending: true, transaction_id: 'tx3' }]
  );
  assertEqual(flowDefaultPending.current, 0, 'flow ignores pending by default');

  const flowIncludePending = computeSavingsGoalProgress(
    { ...baseGoal, includePending: true },
    [],
    [{ ...baseTx, pending: true, transaction_id: 'tx4' }]
  );
  assertEqual(flowIncludePending.current, 200, 'flow include pending true');

  const flowCreatedCutoff = computeSavingsGoalProgress(
    baseGoal,
    [],
    [{ ...baseTx, date: '2026-01-01', transaction_id: 'tx5' }]
  );
  assertEqual(flowCreatedCutoff.current, 0, 'flow createdAt cutoff');

  const flowCategoryRule = computeSavingsGoalProgress(
    {
      ...baseGoal,
      matchRules: [{ id: 'cat', kind: 'plaid_category_primary', value: 'TRANSFER_OUT' }],
    },
    [],
    [baseTx]
  );
  assertEqual(flowCategoryRule.current, 200, 'category primary rule');

  const flowMerchantRule = computeSavingsGoalProgress(
    {
      ...baseGoal,
      matchRules: [{ id: 'merch', kind: 'merchant_regex', value: 'ALLY' }],
    },
    [],
    [{ ...baseTx, merchant_name: 'ALLY BANK', transaction_id: 'tx6' }]
  );
  assertEqual(flowMerchantRule.current, 200, 'merchant regex rule');

  const invalidRegex = computeSavingsGoalProgress(
    {
      ...baseGoal,
      matchRules: [{ id: 'invalid', kind: 'name_regex', value: '([bad' }],
    },
    [],
    [baseTx]
  );
  assertEqual(invalidRegex.current, 0, 'invalid regex no match');
  assertTrue(invalidRegex.warnings.length > 0, 'invalid regex warning');

  const deduped = computeSavingsGoalProgress(baseGoal, [], [baseTx, { ...baseTx, id: 'doc-dup' }]);
  assertEqual(deduped.current, 200, 'dedupe by transaction_id');
}

