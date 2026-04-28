import { getBudgetWindow, isDateInWindow } from './budgetPeriods';

function assertEqual(actual: string, expected: string, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function assertTrue(value: boolean, label: string): void {
  if (!value) {
    throw new Error(`${label}: expected true, received false`);
  }
}

export function runBudgetPeriodsTests(): void {
  const weekly = getBudgetWindow({
    period: 'weekly',
    referenceDate: new Date('2026-04-29T12:00:00'),
  });
  assertEqual(weekly.windowStart, '2026-04-27', 'weekly start');
  assertEqual(weekly.windowEnd, '2026-05-03', 'weekly end');

  const biweeklyDefault = getBudgetWindow({
    period: 'biweekly',
    referenceDate: new Date('2026-04-29T12:00:00'),
  });
  assertEqual(biweeklyDefault.windowEnd, '2026-05-03', 'default biweekly end');

  const biweeklyAnchored = getBudgetWindow({
    period: 'biweekly',
    referenceDate: new Date('2026-05-10T12:00:00'),
    biweeklyAnchorDate: '2026-04-27',
  });
  assertEqual(biweeklyAnchored.windowStart, '2026-05-11', 'anchored biweekly start');
  assertEqual(biweeklyAnchored.windowEnd, '2026-05-24', 'anchored biweekly end');

  const monthly = getBudgetWindow({
    period: 'monthly',
    referenceDate: new Date('2026-02-17T12:00:00'),
  });
  assertEqual(monthly.windowStart, '2026-02-01', 'monthly start');
  assertEqual(monthly.windowEnd, '2026-02-28', 'monthly end');

  assertTrue(isDateInWindow('2026-05-12', biweeklyAnchored.windowStart, biweeklyAnchored.windowEnd), 'window inclusion');
}

