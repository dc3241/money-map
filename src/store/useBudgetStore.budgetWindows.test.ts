import { useBudgetStore } from './useBudgetStore';
import type { Budget, DayData } from '../types';

function assertNumber(actual: number, expected: number, label: string): void {
  if (Math.abs(actual - expected) > 0.0001) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function makeDay(date: string, spending: DayData['spending']): DayData {
  return {
    date,
    income: [],
    spending,
    transfers: [],
  };
}

export function runBudgetStoreWindowTests(): void {
  const weeklyBudget: Budget = {
    id: 'test-weekly',
    categoryId: 'cat-exp-food',
    amount: 100,
    period: 'weekly',
    windowStart: '2026-04-27',
    windowEnd: '2026-05-03',
    createdAt: new Date().toISOString(),
    version: 2,
  };

  const biweeklyBudget: Budget = {
    id: 'test-biweekly',
    categoryId: 'cat-exp-shopping',
    amount: 250,
    period: 'biweekly',
    windowStart: '2026-04-27',
    windowEnd: '2026-05-10',
    createdAt: new Date().toISOString(),
    version: 2,
  };

  useBudgetStore.setState({
    days: {
      '2026-04-28': makeDay('2026-04-28', [{ id: 'a', type: 'spending', amount: 25, description: 'Dining', category: 'cat-exp-food' }]),
      '2026-05-02': makeDay('2026-05-02', [{ id: 'b', type: 'spending', amount: 15, description: 'Dining', category: 'cat-exp-food' }]),
      '2026-05-05': makeDay('2026-05-05', [{ id: 'c', type: 'spending', amount: 80, description: 'Shopping', category: 'cat-exp-shopping' }]),
    },
    budgets: [weeklyBudget, biweeklyBudget],
  });

  const weeklySpent = useBudgetStore.getState().getBudgetSpending('test-weekly', 2026, 5);
  assertNumber(weeklySpent, 40, 'weekly window sum');

  const biweeklySpent = useBudgetStore.getState().getBudgetSpending('test-biweekly', 2026, 5);
  assertNumber(biweeklySpent, 80, 'biweekly window sum');
}

