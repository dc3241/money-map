import { useEffect, useState } from "react";
import { doc, onSnapshot, DocumentData } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuthStore } from "../store/useAuthStore";

/** Shape persisted from Cloud Function `syncPlaidInsights` (Plaid TransactionStream JSON). */
export interface PlaidTransactionStreamDoc {
  account_id: string;
  stream_id: string;
  description: string;
  merchant_name: string | null;
  first_date: string;
  last_date: string;
  predicted_next_date?: string | null;
  frequency: string;
  average_amount?: { amount?: number } | null;
  last_amount?: { amount?: number } | null;
  category?: string[] | null;
  status?: string;
  is_active?: boolean;
  transaction_ids?: string[];
}

export interface PlaidRecurringSnapshot {
  inflow_streams: PlaidTransactionStreamDoc[];
  outflow_streams: PlaidTransactionStreamDoc[];
  updated_datetime: string | null;
  synced_at: unknown;
  error: string | null;
}

const empty: PlaidRecurringSnapshot = {
  inflow_streams: [],
  outflow_streams: [],
  updated_datetime: null,
  synced_at: null,
  error: null,
};

function parseSnapshot(data: DocumentData | undefined): PlaidRecurringSnapshot {
  if (!data) return {...empty};
  return {
    inflow_streams: Array.isArray(data.inflow_streams) ? data.inflow_streams : [],
    outflow_streams: Array.isArray(data.outflow_streams) ? data.outflow_streams : [],
    updated_datetime:
      typeof data.updated_datetime === "string" ? data.updated_datetime : null,
    synced_at: data.synced_at,
    error: typeof data.error === "string" ? data.error : null,
  };
}

export function usePlaidRecurringFirestore(): {
  data: PlaidRecurringSnapshot;
  loading: boolean;
  error: Error | null;
} {
  const uid = useAuthStore((s) => s.user?.uid ?? null);
  const [state, setState] = useState<{
    data: PlaidRecurringSnapshot;
    loading: boolean;
    error: Error | null;
  }>({ data: empty, loading: true, error: null });

  useEffect(() => {
    if (!uid) {
      setState({ data: empty, loading: false, error: null });
      return;
    }
    const ref = doc(db, "users", uid, "plaidData", "recurring");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setState({
          data: parseSnapshot(snap.data()),
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState((prev) => ({ ...prev, loading: false, error: err }));
      }
    );
    return () => unsub();
  }, [uid]);

  return state;
}
