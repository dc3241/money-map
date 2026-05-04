import { useEffect, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import {
  db,
  syncBalances,
  syncPlaidInsights,
  syncTransactions,
} from "../config/firebase";

/** Min time between automatic Plaid syncs for one user in this tab (rate limits + UX). */
const COOLDOWN_MS = 4 * 60 * 60 * 1000;

const storageKey = (uid: string) => `mm_plaid_bg_sync_${uid}`;

/**
 * Pulls latest Plaid transactions/balances when the user opens the dashboard,
 * without visiting Accounts → Refresh. Uses sessionStorage so the same tab
 * does not hammer callables; cooldown skips redundant runs after a recent sync.
 * Clears cooldown on auth uid change (e.g. after logout → login) so each session
 * gets a fresh pull.
 */
export function usePlaidBackgroundSync(uid: string | null | undefined): void {
  const prevUidRef = useRef<string | null>(null);
  const effectGenRef = useRef(0);

  useEffect(() => {
    const prev = prevUidRef.current;
    prevUidRef.current = uid ?? null;

    if (!uid) {
      if (prev) {
        sessionStorage.removeItem(storageKey(prev));
      }
      return;
    }

    if (prev !== uid) {
      sessionStorage.removeItem(storageKey(uid));
    }

    const key = storageKey(uid);
    const lastRaw = sessionStorage.getItem(key);
    const last = lastRaw ? Number(lastRaw) : 0;
    if (Number.isFinite(last) && Date.now() - last < COOLDOWN_MS) {
      return;
    }

    effectGenRef.current += 1;
    const gen = effectGenRef.current;
    let cancelled = false;

    void (async () => {
      try {
        const itemSnap = await getDoc(doc(db, "users", uid, "plaidData", "item"));
        if (cancelled || gen !== effectGenRef.current) return;
        if (!itemSnap.exists()) {
          sessionStorage.setItem(key, String(Date.now()));
          return;
        }
        const data = itemSnap.data() as { item_id?: string };
        if (typeof data?.item_id !== "string" || data.item_id.length === 0) {
          sessionStorage.setItem(key, String(Date.now()));
          return;
        }

        await syncTransactions({});
        if (cancelled || gen !== effectGenRef.current) return;
        await syncBalances({});
        if (cancelled || gen !== effectGenRef.current) return;
        try {
          await syncPlaidInsights({});
        } catch {
          /* recurring/liabilities may be unavailable for some items */
        }
      } catch (err) {
        console.warn("[Plaid] Background sync failed", err);
      } finally {
        if (!cancelled && gen === effectGenRef.current) {
          sessionStorage.setItem(key, String(Date.now()));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);
}
