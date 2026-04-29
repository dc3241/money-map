import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/useAuthStore';
import type { TransactionCategoryOverride } from '../types';

type SaveOverrideInput = {
  transactionId: string;
  categoryId: string;
};

export function usePlaidTransactionCategoryOverrides(): {
  overrides: Record<string, TransactionCategoryOverride>;
  loading: boolean;
  error: Error | null;
  saveOverride: (input: SaveOverrideInput) => Promise<void>;
} {
  const uid = useAuthStore((s) => s.user?.uid ?? null);
  const [state, setState] = useState<{
    overrides: Record<string, TransactionCategoryOverride>;
    loading: boolean;
    error: Error | null;
  }>({
    overrides: {},
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!uid) {
      setState({ overrides: {}, loading: false, error: null });
      return;
    }

    const ref = collection(db, 'users', uid, 'transactionCategoryOverrides');
    const q = query(ref, orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const overrides: Record<string, TransactionCategoryOverride> = {};
        for (const row of snap.docs) {
          const data = row.data() as Partial<TransactionCategoryOverride> | undefined;
          const transactionId =
            typeof data?.transactionId === 'string' && data.transactionId.length > 0
              ? data.transactionId
              : row.id;
          if (typeof data?.categoryId !== 'string' || data.categoryId.length === 0) continue;

          overrides[transactionId] = {
            transactionId,
            categoryId: data.categoryId,
            source: 'user',
            updatedAt: data?.updatedAt ?? null,
          };
        }
        setState({ overrides, loading: false, error: null });
      },
      (err) => {
        setState((prev) => ({ ...prev, loading: false, error: err }));
      }
    );
    return () => unsub();
  }, [uid]);

  const saveOverride = useMemo(
    () => async (input: SaveOverrideInput) => {
      if (!uid) return;
      const transactionId = input.transactionId.trim();
      const categoryId = input.categoryId.trim();
      if (!transactionId || !categoryId) return;

      const ref = doc(db, 'users', uid, 'transactionCategoryOverrides', transactionId);
      await setDoc(
        ref,
        {
          transactionId,
          categoryId,
          source: 'user',
          updatedAt: new Date(),
        },
        { merge: true }
      );
    },
    [uid]
  );

  return {
    overrides: state.overrides,
    loading: state.loading,
    error: state.error,
    saveOverride,
  };
}
