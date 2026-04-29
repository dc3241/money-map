import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/useAuthStore';
import type { TransactionCategoryRule, TransactionCategoryRuleMatcher } from '../types';

type SaveRuleInput = {
  id?: string;
  active?: boolean;
  priority?: number;
  categoryId: string;
  matcher: TransactionCategoryRuleMatcher;
};

function sanitizeMatcher(matcher: TransactionCategoryRuleMatcher): TransactionCategoryRuleMatcher {
  const merchantContains = matcher.merchantContains?.trim();
  const accountId = matcher.accountId?.trim();
  const amountMin = typeof matcher.amountMin === 'number' ? matcher.amountMin : undefined;
  const amountMax = typeof matcher.amountMax === 'number' ? matcher.amountMax : undefined;
  return {
    merchantContains: merchantContains && merchantContains.length > 0 ? merchantContains : undefined,
    accountId: accountId && accountId.length > 0 ? accountId : undefined,
    amountMin,
    amountMax,
    direction: matcher.direction ?? 'any',
  };
}

export function usePlaidTransactionCategoryRules(): {
  rules: TransactionCategoryRule[];
  loading: boolean;
  error: Error | null;
  saveRule: (input: SaveRuleInput) => Promise<void>;
} {
  const uid = useAuthStore((s) => s.user?.uid ?? null);
  const [state, setState] = useState<{
    rules: TransactionCategoryRule[];
    loading: boolean;
    error: Error | null;
  }>({
    rules: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ rules: [], loading: false, error: null });
      return;
    }

    const ref = collection(db, 'users', uid, 'transactionCategoryRules');
    const q = query(ref, orderBy('priority', 'asc'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rules: TransactionCategoryRule[] = [];
        for (const row of snap.docs) {
          const data = row.data() as Partial<TransactionCategoryRule> | undefined;
          if (!data) continue;
          if (typeof data.categoryId !== 'string' || data.categoryId.length === 0) continue;
          const matcher = sanitizeMatcher({
            direction: data.matcher?.direction ?? 'any',
            merchantContains: data.matcher?.merchantContains,
            accountId: data.matcher?.accountId,
            amountMin: data.matcher?.amountMin,
            amountMax: data.matcher?.amountMax,
          });
          rules.push({
            id: typeof data.id === 'string' && data.id.length > 0 ? data.id : row.id,
            active: data.active !== false,
            priority: Number.isFinite(data.priority) ? Number(data.priority) : 100,
            categoryId: data.categoryId,
            matcher,
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
          });
        }
        rules.sort((a, b) => a.priority - b.priority);
        setState({ rules, loading: false, error: null });
      },
      (err) => {
        setState((prev) => ({ ...prev, loading: false, error: err }));
      }
    );
    return () => unsub();
  }, [uid]);

  const saveRule = useMemo(
    () => async (input: SaveRuleInput) => {
      if (!uid) return;
      const categoryId = input.categoryId.trim();
      if (!categoryId) return;
      const matcher = sanitizeMatcher(input.matcher);
      const payload = {
        id: input.id,
        active: input.active ?? true,
        priority: Number.isFinite(input.priority) ? Number(input.priority) : 100,
        categoryId,
        matcher,
        updatedAt: new Date(),
      };

      if (input.id && input.id.trim().length > 0) {
        const id = input.id.trim();
        await setDoc(
          doc(db, 'users', uid, 'transactionCategoryRules', id),
          {
            ...payload,
            id,
          },
          { merge: true }
        );
        return;
      }

      const createdAt = new Date();
      const ref = await addDoc(collection(db, 'users', uid, 'transactionCategoryRules'), {
        ...payload,
        createdAt,
      });
      await setDoc(
        doc(db, 'users', uid, 'transactionCategoryRules', ref.id),
        {
          id: ref.id,
        },
        { merge: true }
      );
    },
    [uid]
  );

  return {
    rules: state.rules,
    loading: state.loading,
    error: state.error,
    saveRule,
  };
}
