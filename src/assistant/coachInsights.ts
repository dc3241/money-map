import type { MoneyMapContextSnapshot } from './moneyMapSnapshot';

export type CoachInsightTone = 'tip' | 'warning' | 'positive';

export type CoachInsight = {
  id: string;
  title: string;
  body: string;
  tone: CoachInsightTone;
  askPrompt: string;
};

export function buildCoachInsights(s: MoneyMapContextSnapshot): CoachInsight[] {
  const out: CoachInsight[] = [];

  if (s.monthTotals.profit < -0.01) {
    out.push({
      id: 'month-negative-net',
      title: 'Spending exceeded income this month',
      body: `So far in ${s.calendarMonth.year}-${String(s.calendarMonth.month).padStart(2, '0')}, your tracked net is negative (about ${formatUsd(s.monthTotals.profit)}). Small course corrections now often beat big cuts later.`,
      tone: 'warning',
      askPrompt:
        'My month-to-date net is negative in Money Map. What are 3–5 concrete habits or review steps I should try this week, without judging me?',
    });
  } else if (s.monthTotals.profit > 0 && s.monthTotals.income > 0) {
    out.push({
      id: 'month-positive-net',
      title: 'You are net positive this month',
      body: `Your tracked net for the month is about ${formatUsd(s.monthTotals.profit)}. Consider steering part of that toward goals or buffer savings.`,
      tone: 'positive',
      askPrompt:
        'I have a positive net this month in my tracker. How should I think about splitting extra between savings goals, debt, and a small fun bucket?',
    });
  }

  const tight = s.budgets.filter((b) => b.limit > 0 && b.percentage >= 90);
  tight.slice(0, 2).forEach((b, idx) => {
    out.push({
      id: `budget-tight-${idx}-${b.categoryName}`,
      title: `${b.categoryName} budget is nearly used`,
      body: `You have used about ${b.percentage.toFixed(0)}% of the ${b.categoryName} budget (${formatUsd(b.spent)} of ${formatUsd(b.limit)}).`,
      tone: 'warning',
      askPrompt: `My "${b.categoryName}" category is at about ${b.percentage.toFixed(0)}% of budget. What are gentle ways to slow spending there for the rest of the month?`,
    });
  });

  if (s.budgetRowCount === 0 && s.monthTotals.spending > 0) {
    out.push({
      id: 'no-budgets',
      title: 'Try category budgets',
      body: 'You have spending recorded but no budgets yet. Budgets make it easier to spot drift early.',
      tone: 'tip',
      askPrompt:
        'I track spending but have not set budgets in Money Map yet. How do I pick 3 starter budgets and realistic limits?',
    });
  }

  if (s.savingsGoals.length === 0) {
    out.push({
      id: 'no-goals',
      title: 'Add a savings goal',
      body: 'Goals turn spare cash into progress you can see—start with one small target.',
      tone: 'tip',
      askPrompt:
        'I do not have savings goals set up yet. What is a good first goal (amount and timeline) for an emergency buffer?',
    });
  }

  const stalled = s.savingsGoals.filter((g) => g.target > 0 && g.progressPct < 5);
  if (stalled.length > 0 && s.savingsGoals.length > 0) {
    const g = stalled[0];
    out.push({
      id: 'goal-stalled',
      title: `${g.name} is barely started`,
      body: `${g.name} is only about ${g.progressPct.toFixed(0)}% funded toward ${formatUsd(g.target)}. Even small automatic transfers help.`,
      tone: 'tip',
      askPrompt: `My "${g.name}" goal is barely funded. Suggest a simple weekly rhythm to build momentum.`,
    });
  }

  if (s.totalDebt > 0 && s.debts.length > 0) {
    out.push({
      id: 'debt-awareness',
      title: 'Debt on your map',
      body: `Total tracked debt is about ${formatUsd(s.totalDebt)}. Pair minimum payments with one focused extra payment when you can.`,
      tone: 'tip',
      askPrompt:
        'I have debt balances in Money Map. Explain avalanche vs snowball in plain language and how to pick without shame.',
    });
  }

  if (s.recurringExpenseCount > 0 && s.weekTotals.spending > s.weekTotals.income && s.weekTotals.income > 0) {
    out.push({
      id: 'week-burn',
      title: 'This week is spending-heavy',
      body: 'This week, tracked spending is higher than income in your snapshot. Worth a quick pass on discretionary categories.',
      tone: 'warning',
      askPrompt:
        'This week my snapshot shows spending above income. What should I review first in a budgeting app?',
    });
  }

  if (out.length === 0) {
    out.push({
      id: 'all-clear',
      title: 'Nice and steady',
      body: 'No urgent flags in this snapshot. Check back after more activity or try asking the coach a money question.',
      tone: 'positive',
      askPrompt: 'What is one good weekly money habit I could adopt based on typical personal finance guidance?',
    });
  }

  return out.slice(0, 5);
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}
