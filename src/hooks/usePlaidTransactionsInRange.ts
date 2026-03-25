import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuthStore } from "../store/useAuthStore";
import {
  type PlaidTransaction,
  docToPlaidTransaction,
} from "./usePlaidTransactions";

/**
 * Subscribes to Plaid transactions with date in [start, end] (inclusive YYYY-MM-DD).
 * No row cap — suitable for dashboard windows and full-year reports.
 */
export function usePlaidTransactionsInRange(
  start: string | null,
  end: string | null
): {
  transactions: PlaidTransaction[];
  loading: boolean;
  error: Error | null;
} {
  const uid = useAuthStore((s) => s.user?.uid ?? null);
  const [state, setState] = useState<{
    transactions: PlaidTransaction[];
    loading: boolean;
    error: Error | null;
  }>({ transactions: [], loading: true, error: null });

  useEffect(() => {
    if (!uid || !start || !end || start > end) {
      setState({ transactions: [], loading: false, error: null });
      return;
    }
    const transactionsRef = collection(db, "users", uid, "transactions");
    const q = query(
      transactionsRef,
      where("date", ">=", start),
      where("date", "<=", end)
    );

    setState((prev) => ({ ...prev, loading: true }));
    const unsub = onSnapshot(
      q,
      (snap: QuerySnapshot<DocumentData>) => {
        const transactions = snap.docs.map((d) =>
          docToPlaidTransaction(d.id, d.data())
        );
        transactions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        setState({ transactions, loading: false, error: null });
      },
      (err) => {
        setState({ transactions: [], loading: false, error: err });
      }
    );
    return () => unsub();
  }, [uid, start, end]);

  return state;
}
