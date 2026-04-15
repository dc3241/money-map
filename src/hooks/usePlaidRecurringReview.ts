import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuthStore } from "../store/useAuthStore";

export type RecurringReviewDecision = "recurring" | "not_recurring";
export type RecurringReviewKind = "income" | "expense";

export interface RecurringReviewOverride {
  transactionId: string;
  decision: RecurringReviewDecision;
  kind: RecurringReviewKind | null;
  cadence: string | null;
  category: string | null;
  incomeType: string | null;
  source: "user_confirmed";
  updatedAt: unknown;
}

type SaveOverrideInput = {
  transactionId: string;
  decision: RecurringReviewDecision;
  kind?: RecurringReviewKind | null;
  cadence?: string | null;
  category?: string | null;
  incomeType?: string | null;
};

export function usePlaidRecurringReview(): {
  overrides: Record<string, RecurringReviewOverride>;
  loading: boolean;
  error: Error | null;
  saveOverride: (input: SaveOverrideInput) => Promise<void>;
} {
  const uid = useAuthStore((s) => s.user?.uid ?? null);
  const [state, setState] = useState<{
    overrides: Record<string, RecurringReviewOverride>;
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
    const ref = collection(db, "users", uid, "recurringReview");
    const q = query(ref, orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const overrides: Record<string, RecurringReviewOverride> = {};
        for (const row of snap.docs) {
          const data = row.data() as Partial<RecurringReviewOverride> | undefined;
          const transactionId =
            typeof data?.transactionId === "string" && data.transactionId.length > 0
              ? data.transactionId
              : row.id;
          overrides[transactionId] = {
            transactionId,
            decision:
              data?.decision === "not_recurring" ? "not_recurring" : "recurring",
            kind:
              data?.kind === "income" || data?.kind === "expense"
                ? data.kind
                : null,
            cadence: typeof data?.cadence === "string" ? data.cadence : null,
            category: typeof data?.category === "string" ? data.category : null,
            incomeType:
              typeof data?.incomeType === "string" ? data.incomeType : null,
            source: "user_confirmed",
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
      if (!transactionId) return;
      const ref = doc(db, "users", uid, "recurringReview", transactionId);
      await setDoc(
        ref,
        {
          transactionId,
          decision: input.decision,
          kind: input.kind ?? null,
          cadence: input.cadence ?? null,
          category: input.category ?? null,
          incomeType: input.incomeType ?? null,
          source: "user_confirmed",
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
