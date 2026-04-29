import type { PlaidAccount } from '../hooks/usePlaidAccounts';
import type { PlaidTransaction } from '../hooks/usePlaidTransactions';
import type { SavingsGoal, SavingsMatchRule, SavingsGoalMode } from '../types';

export interface ComputedGoalProgress {
  current: number;
  target: number;
  percentage: number;
  source: 'balance' | 'transactions' | 'none';
  warnings: string[];
}

const DEFAULT_MODE: SavingsGoalMode = 'flow_linked';

function toProgress(
  current: number,
  target: number,
  source: ComputedGoalProgress['source'],
  warnings: string[]
): ComputedGoalProgress {
  const safeCurrent = Number.isFinite(current) ? Math.max(0, current) : 0;
  const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0;
  const percentage = safeTarget > 0 ? Math.min(100, (safeCurrent / safeTarget) * 100) : 0;
  return {
    current: safeCurrent,
    target: safeTarget,
    percentage,
    source,
    warnings,
  };
}

function safeRegex(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return null;
  }
}

function normalizeContributionAmount(tx: PlaidTransaction): number {
  return Math.abs(Number(tx.amount ?? 0));
}

function dedupeByTransactionId(transactions: PlaidTransaction[]): PlaidTransaction[] {
  const seen = new Set<string>();
  const unique: PlaidTransaction[] = [];
  for (const tx of transactions) {
    const id = tx.transaction_id || tx.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(tx);
  }
  return unique;
}

function matchesRule(tx: PlaidTransaction, rule: SavingsMatchRule, warnings: string[]): boolean {
  const value = (rule.value || '').trim();
  if (!value) return false;

  if (rule.kind === 'plaid_category_primary') {
    return (tx.category_primary ?? '').toUpperCase() === value.toUpperCase();
  }

  if (rule.kind === 'merchant_regex') {
    const regex = safeRegex(value);
    if (!regex) {
      warnings.push(`Invalid merchant regex: "${value}"`);
      return false;
    }
    return regex.test(tx.merchant_name ?? '');
  }

  const regex = safeRegex(value);
  if (!regex) {
    warnings.push(`Invalid name regex: "${value}"`);
    return false;
  }
  return regex.test(tx.name ?? '');
}

function computeBalanceLinkedCurrent(
  goal: SavingsGoal,
  accounts: PlaidAccount[],
  warnings: string[]
): number {
  if (!goal.plaidAccountId) {
    warnings.push('No linked Plaid account configured.');
    return 0;
  }
  const account = accounts.find((a) => a.account_id === goal.plaidAccountId);
  if (!account) {
    warnings.push('Linked Plaid account not found.');
    return 0;
  }
  const raw = account.current_balance ?? account.available_balance;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    warnings.push('Linked account balance is unavailable.');
    return 0;
  }
  return Math.max(0, value);
}

function computeFlowLinkedCurrent(
  goal: SavingsGoal,
  transactions: PlaidTransaction[],
  warnings: string[]
): number {
  const rules = goal.matchRules ?? [];
  if (rules.length === 0) {
    warnings.push('No matching rules configured.');
    return 0;
  }

  const createdAtDate = (goal.createdAt || '').slice(0, 10);
  const includePending = !!goal.includePending;
  const deduped = dedupeByTransactionId(transactions);
  let total = 0;

  for (const tx of deduped) {
    if (!includePending && tx.pending) continue;
    if (createdAtDate && tx.date && tx.date < createdAtDate) continue;
    if (goal.sourcePlaidAccountId && tx.account_id !== goal.sourcePlaidAccountId) continue;
    if (!rules.some((rule) => matchesRule(tx, rule, warnings))) continue;
    total += normalizeContributionAmount(tx);
  }

  return total;
}

export function computeSavingsGoalProgress(
  goal: SavingsGoal,
  accounts: PlaidAccount[],
  transactions: PlaidTransaction[]
): ComputedGoalProgress {
  const warnings: string[] = [];
  const mode = goal.mode ?? (goal.plaidAccountId ? 'balance_linked' : DEFAULT_MODE);

  if (mode === 'balance_linked') {
    const current = computeBalanceLinkedCurrent(goal, accounts, warnings);
    return toProgress(current, goal.targetAmount, 'balance', warnings);
  }

  if (mode === 'flow_linked') {
    const current = computeFlowLinkedCurrent(goal, transactions, warnings);
    return toProgress(current, goal.targetAmount, 'transactions', warnings);
  }

  warnings.push('Unknown goal mode.');
  return toProgress(0, goal.targetAmount, 'none', warnings);
}

