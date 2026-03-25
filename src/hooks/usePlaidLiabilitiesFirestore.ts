import { useEffect, useState } from "react";
import { doc, onSnapshot, DocumentData } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuthStore } from "../store/useAuthStore";

export interface PlaidLiabilitiesSnapshot {
  accounts: unknown[];
  liabilities: Record<string, unknown>;
  item: unknown;
  synced_at: unknown;
  error: string | null;
}

const empty: PlaidLiabilitiesSnapshot = {
  accounts: [],
  liabilities: {},
  item: null,
  synced_at: null,
  error: null,
};

function parseDoc(data: DocumentData | undefined): PlaidLiabilitiesSnapshot {
  if (!data) return {...empty};
  return {
    accounts: Array.isArray(data.accounts) ? data.accounts : [],
    liabilities:
      data.liabilities && typeof data.liabilities === "object"
        ? (data.liabilities as Record<string, unknown>)
        : {},
    item: data.item ?? null,
    synced_at: data.synced_at,
    error: typeof data.error === "string" ? data.error : null,
  };
}

export function usePlaidLiabilitiesFirestore(): {
  data: PlaidLiabilitiesSnapshot;
  loading: boolean;
  error: Error | null;
} {
  const uid = useAuthStore((s) => s.user?.uid ?? null);
  const [state, setState] = useState<{
    data: PlaidLiabilitiesSnapshot;
    loading: boolean;
    error: Error | null;
  }>({ data: empty, loading: true, error: null });

  useEffect(() => {
    if (!uid) {
      setState({ data: empty, loading: false, error: null });
      return;
    }
    const ref = doc(db, "users", uid, "plaidData", "liabilities");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setState({
          data: parseDoc(snap.data()),
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
