import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuthStore } from "../store/useAuthStore";

export interface PlaidTransaction {
  id: string;
  transaction_id: string;
  date: string;
  effective_date?: string | null;
  posted_date?: string | null;
  authorized_date?: string | null;
  name: string | null;
  merchant_name: string | null;
  amount: number;
  category: string[] | null;
  category_primary?: string | null;
  pending?: boolean;
  account_id?: string | null;
  transaction_type?: string | null;
  _updatedAt?: unknown;
}

/** Shared parser for Firestore transaction documents (also used by year-range queries). */
export function docToPlaidTransaction(id: string, data: DocumentData): PlaidTransaction {
  const pfc = data.personal_finance_category;
  const pfcPrimary =
    typeof pfc === "object" &&
    pfc !== null &&
    typeof (pfc as { primary?: string }).primary === "string"
      ? (pfc as { primary: string }).primary
      : null;
  const categoryPrimary =
    pfcPrimary ??
    (typeof data.category_primary === "string" ? data.category_primary : null) ??
    (Array.isArray(data.category) ? data.category[0] ?? null : null);

  const rawDate =
    (typeof data.effective_date === "string" && data.effective_date.length > 0 ?
      data.effective_date :
      null) ??
    (typeof data.date === "string" && data.date.length > 0 ? data.date : null) ??
    "";

  return {
    id,
    transaction_id: data.transaction_id ?? id,
    date: rawDate,
    effective_date:
      typeof data.effective_date === "string" ? data.effective_date : null,
    posted_date:
      typeof data.posted_date === "string" ? data.posted_date : null,
    authorized_date:
      typeof data.authorized_date === "string" ? data.authorized_date : null,
    name: data.name ?? data.merchant_name ?? null,
    merchant_name: data.merchant_name ?? null,
    amount: Number(data.amount ?? 0),
    category: Array.isArray(data.category) ? data.category : null,
    category_primary: categoryPrimary,
    pending: data.pending ?? false,
    account_id: data.account_id ?? null,
    transaction_type:
      typeof data.transaction_type === "string" ? data.transaction_type : null,
    _updatedAt: data._updatedAt,
  };
}

const RECENT_LIMIT = 100;

/** Firestore query limit for calendar, reporting, and budget rollups (most recent by date). */
export const PLAID_AGGREGATE_QUERY_LIMIT = 8000;

/**
 * Subscribes to users/{uid}/transactions (Plaid-synced), most recent first.
 * Returns empty array when not authenticated.
 */
export function usePlaidTransactions(limitCount: number = RECENT_LIMIT): {
  transactions: PlaidTransaction[];
  loading: boolean;
  error: Error | null;
} {
  const user = useAuthStore((state) => state.user);
  const uid = user?.uid ?? null;

  const [state, setState] = useState<{
    transactions: PlaidTransaction[];
    loading: boolean;
    error: Error | null;
  }>({ transactions: [], loading: true, error: null });

  useEffect(() => {
    if (!uid) {
      setState({ transactions: [], loading: false, error: null });
      return;
    }
    const transactionsRef = collection(db, "users", uid, "transactions");
    const q = query(
      transactionsRef,
      orderBy("date", "desc"),
      limit(limitCount)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap: QuerySnapshot<DocumentData>) => {
        const transactions = snap.docs.map((doc) =>
          docToPlaidTransaction(doc.id, doc.data())
        );
        setState({ transactions, loading: false, error: null });
      },
      (err) => {
        setState((prev) => ({ ...prev, loading: false, error: err }));
      }
    );
    return () => unsubscribe();
  }, [uid, limitCount]);

  return state;
}
