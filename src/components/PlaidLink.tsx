import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import {
  createLinkToken,
  exchangePublicToken,
  syncTransactions,
} from "../config/firebase";

type Status = "loading" | "ready" | "exchanging" | "success" | "error";

export default function PlaidLink() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await createLinkToken({});
        if (!cancelled && data.linkToken) {
          setLinkToken(data.linkToken);
          setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load Plaid");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSuccess = useCallback(async (publicToken: string) => {
    setStatus("exchanging");
    setError(null);
    try {
      await exchangePublicToken({ publicToken });
      await syncTransactions({});
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect bank");
      setStatus("ready");
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        <p className="text-sm text-slate-600">Preparing to connect your bank…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <p className="font-medium text-green-800">Bank connected</p>
        <p className="mt-1 text-sm text-green-700">
          Your account is linked and transactions have been synced.
        </p>
      </div>
    );
  }

  if (status === "exchanging") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        <p className="text-sm text-slate-600">
          Connecting your bank and syncing transactions…
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-800">Something went wrong</p>
        <p className="mt-1 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => open()}
        disabled={!ready}
        className="rounded-lg bg-slate-800 px-4 py-2.5 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Connect your bank
      </button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
