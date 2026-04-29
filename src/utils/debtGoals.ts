import { differenceInCalendarDays } from 'date-fns';
import type { DebtGoal } from '../types';

export type DebtGoalStatus = 'on_track' | 'at_risk' | 'off_track' | 'complete';

export interface DebtGoalProgress {
  targetBalance: number;
  paidDown: number;
  totalNeeded: number;
  progressPercent: number;
  remainingToTarget: number;
  expectedProgressPercent: number | null;
  daysRemaining: number | null;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function normalizeTargetBalance(goal: DebtGoal): number {
  if (goal.goalType === 'payoff_by_date') return 0;
  if (goal.goalType === 'target_balance_by_date') {
    return Math.max(0, Number(goal.targetBalance ?? 0));
  }
  return 0;
}

export function calculateDebtGoalProgress(
  goal: DebtGoal,
  currentBalance: number,
  now: Date = new Date()
): DebtGoalProgress {
  const normalizedCurrent = Math.max(0, Number(currentBalance || 0));
  const targetBalance = normalizeTargetBalance(goal);
  const startingBalance = Math.max(0, Number(goal.startingBalance || 0));
  const paidDown = Math.max(0, startingBalance - normalizedCurrent);
  const totalNeeded = Math.max(0, startingBalance - targetBalance);
  const remainingToTarget = Math.max(0, normalizedCurrent - targetBalance);
  const progressPercent = totalNeeded > 0 ? clampPercent((paidDown / totalNeeded) * 100) : 100;

  let expectedProgressPercent: number | null = null;
  let daysRemaining: number | null = null;

  if (goal.targetDate) {
    const start = new Date(goal.createdAt);
    const target = new Date(goal.targetDate);
    const totalDays = Math.max(1, differenceInCalendarDays(target, start));
    const elapsedDays = differenceInCalendarDays(now, start);
    expectedProgressPercent = clampPercent((elapsedDays / totalDays) * 100);
    daysRemaining = differenceInCalendarDays(target, now);
  }

  return {
    targetBalance,
    paidDown,
    totalNeeded,
    progressPercent,
    remainingToTarget,
    expectedProgressPercent,
    daysRemaining,
  };
}

export function getDebtGoalStatus(
  goal: DebtGoal,
  currentBalance: number,
  now: Date = new Date()
): DebtGoalStatus {
  const progress = calculateDebtGoalProgress(goal, currentBalance, now);

  if (progress.remainingToTarget <= 0 || progress.progressPercent >= 100) {
    return 'complete';
  }

  if (progress.expectedProgressPercent == null) {
    return 'on_track';
  }

  const delta = progress.progressPercent - progress.expectedProgressPercent;
  if (delta >= -5) return 'on_track';
  if (delta >= -15) return 'at_risk';
  return 'off_track';
}
