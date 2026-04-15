import { useEffect, useMemo, useState } from "react";
import type { PlaidAccountTypeMap } from "../utils/plaidAggregates";
import {
  collection,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuthStore } from "../store/useAuthStore";

export interface PlaidAccount {
  id: string;
  account_id: string;
  item_id: string | null;
  name: string;
  type: string;
  subtype: string | null;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  updated_at?: unknown;
}

function docToPlaidAccount(id: string, data: DocumentData): PlaidAccount {
  return {
    id,
    account_id: data.account_id ?? id,
    item_id: data.item_id ?? null,
    name: data.name ?? "Account",
    type: data.type ?? "other",
    subtype: data.subtype ?? null,
    mask: data.mask ?? null,
    current_balance: data.current_balance != null ? Number(data.current_balance) : null,
    available_balance: data.available_balance != null ? Number(data.available_balance) : null,
    updated_at: data.updated_at,
  };
}

/**
 * Subscribes to users/{uid}/accounts (Plaid-synced accounts).
 * Returns empty array when not authenticated.
 */
export function usePlaidAccounts(): {
  accounts: PlaidAccount[];
  loading: boolean;
  error: Error | null;
} {
  const user = useAuthStore((state) => state.user);
  const { accounts, loading, error } = usePlaidAccountsInternal(user?.uid ?? null);
  return { accounts, loading, error };
}

// Internal hook that takes uid so we can use subscription
function usePlaidAccountsInternal(uid: string | null): {
  accounts: PlaidAccount[];
  loading: boolean;
  error: Error | null;
} {
  const [state, setState] = useState<{
    accounts: PlaidAccount[];
    loading: boolean;
    error: Error | null;
  }>({ accounts: [], loading: true, error: null });

  useEffect(() => {
    if (!uid) {
      setState({ accounts: [], loading: false, error: null });
      return;
    }
    const accountsRef = collection(db, "users", uid, "accounts");
    const unsubscribe = onSnapshot(
      accountsRef,
      (snap: QuerySnapshot<DocumentData>) => {
        const accounts = snap.docs
          .map((doc) => docToPlaidAccount(doc.id, doc.data()))
          .sort((a, b) => a.name.localeCompare(b.name));
        setState({ accounts, loading: false, error: null });
      },
      (err) => {
        setState((prev) => ({ ...prev, loading: false, error: err }));
      }
    );
    return () => unsubscribe();
  }, [uid]);

  return state;
}

/** Plaid `account_id` → account `type` for cash-flow classification. */
export function usePlaidAccountTypeMap(): PlaidAccountTypeMap {
  const { accounts } = usePlaidAccounts();
  return useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) {
      if (a.account_id) m.set(a.account_id, a.type);
    }
    return m;
  }, [accounts]);
}
