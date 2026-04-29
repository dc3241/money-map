import type { DebtGoal } from '../types';
import { calculateDebtGoalProgress, getDebtGoalStatus, normalizeTargetBalance } from './debtGoals';

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

const baseGoal: DebtGoal = {
  id: 'goal-1',
  plaidAccountId: 'plaid-1',
  goalType: 'payoff_by_date',
  targetDate: '2026-12-31',
  startingBalance: 1000,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export function runDebtGoalTests(): void {
  const targetBalanceGoal: DebtGoal = {
    ...baseGoal,
    goalType: 'target_balance_by_date',
    targetBalance: 500,
  };
  assertEqual(normalizeTargetBalance(targetBalanceGoal), 500, 'target balance normalization');
  assertEqual(normalizeTargetBalance(baseGoal), 0, 'payoff target balance normalization');

  const noWorkNeeded: DebtGoal = {
    ...baseGoal,
    startingBalance: 400,
    goalType: 'target_balance_by_date',
    targetBalance: 500,
  };
  const noWorkProgress = calculateDebtGoalProgress(noWorkNeeded, 450, new Date('2026-06-01'));
  assertEqual(noWorkProgress.totalNeeded, 0, 'starting below target total needed');
  assertEqual(noWorkProgress.progressPercent, 100, 'starting below target progress');

  const higherCurrent = calculateDebtGoalProgress(baseGoal, 1200, new Date('2026-06-01'));
  assertEqual(higherCurrent.paidDown, 0, 'current above starting paid down floor');
  assertEqual(higherCurrent.progressPercent, 0, 'current above starting progress floor');

  const noDateGoal: DebtGoal = {
    ...baseGoal,
    goalType: 'extra_monthly_payment',
    targetDate: undefined,
    extraMonthlyPayment: 200,
  };
  const noDateProgress = calculateDebtGoalProgress(noDateGoal, 900, new Date('2026-06-01'));
  assertEqual(noDateProgress.expectedProgressPercent, null, 'missing targetDate expected progress');
  assertEqual(noDateProgress.daysRemaining, null, 'missing targetDate days remaining');
  assertEqual(getDebtGoalStatus(noDateGoal, 900, new Date('2026-06-01')), 'on_track', 'missing targetDate status');

  const completeGoal = calculateDebtGoalProgress(baseGoal, 0, new Date('2026-11-01'));
  assertEqual(completeGoal.remainingToTarget, 0, 'complete remaining');
  assertEqual(getDebtGoalStatus(baseGoal, 0, new Date('2026-11-01')), 'complete', 'complete status');

  const midDate = new Date('2026-07-02T00:00:00.000Z');
  const dateProgress = calculateDebtGoalProgress(baseGoal, 500, midDate);
  assertTrue((dateProgress.expectedProgressPercent ?? 0) > 45, 'expected progress midpoint lower bound');
  assertTrue((dateProgress.expectedProgressPercent ?? 0) < 55, 'expected progress midpoint upper bound');
}
