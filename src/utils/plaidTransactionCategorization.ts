import type { PlaidTransaction } from '../hooks/usePlaidTransactions';
import type { TransactionCategoryOverride, TransactionCategoryRule } from '../types';

function normalized(text: string | null | undefined): string {
  return (text ?? '').trim().toLowerCase();
}

export function matchesTransactionCategoryRule(
  tx: PlaidTransaction,
  rule: TransactionCategoryRule
): boolean {
  if (!rule.active) return false;
  const { matcher } = rule;

  if (matcher.direction === 'expense' && tx.amount <= 0) return false;
  if (matcher.direction === 'income' && tx.amount >= 0) return false;

  if (typeof matcher.accountId === 'string' && matcher.accountId.length > 0) {
    if ((tx.account_id ?? '') !== matcher.accountId) return false;
  }

  if (typeof matcher.amountMin === 'number' && Math.abs(tx.amount) < matcher.amountMin) {
    return false;
  }
  if (typeof matcher.amountMax === 'number' && Math.abs(tx.amount) > matcher.amountMax) {
    return false;
  }

  if (typeof matcher.merchantContains === 'string' && matcher.merchantContains.length > 0) {
    const needle = normalized(matcher.merchantContains);
    const haystack = normalized(tx.merchant_name ?? tx.name ?? '');
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

export function resolvePlaidTransactionCategoryId(
  tx: PlaidTransaction,
  overrides: Record<string, TransactionCategoryOverride> | undefined,
  rules: TransactionCategoryRule[] | undefined,
  fallbackCategoryId?: string
): string | undefined {
  const override = overrides?.[tx.transaction_id];
  if (override?.categoryId) return override.categoryId;

  const sortedRules = (rules ?? []).slice().sort((a, b) => a.priority - b.priority);
  for (const rule of sortedRules) {
    if (matchesTransactionCategoryRule(tx, rule)) {
      return rule.categoryId;
    }
  }

  return fallbackCategoryId;
}
