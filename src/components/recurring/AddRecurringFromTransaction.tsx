import React, { useEffect, useMemo, useState } from "react";
import type { PlaidTransaction } from "../../hooks/usePlaidTransactions";
import type {
  RecurringReviewOverride,
  SaveRecurringReviewOverrideInput,
} from "../../hooks/usePlaidRecurringReview";
import {
  RECURRING_REVIEW_CADENCE_OPTIONS,
  RECURRING_REVIEW_EXPENSE_CATEGORIES,
  RECURRING_REVIEW_INCOME_TYPES,
} from "../../constants/recurringReviewFormOptions";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

interface Props {
  transactions: PlaidTransaction[];
  loading: boolean;
  overrides: Record<string, RecurringReviewOverride>;
  saveOverride: (input: SaveRecurringReviewOverrideInput) => Promise<void>;
}

const LIST_CAP = 100;
const INITIAL_VISIBLE_ROWS = 10;

/**
 * Lets users attach a recurring rule to an existing Plaid transaction (same storage as the review queue).
 */
const AddRecurringFromTransaction: React.FC<Props> = ({
  transactions,
  loading,
  overrides,
  saveOverride,
}) => {
  const [query, setQuery] = useState("");
  const [hidePending, setHidePending] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);

  useEffect(() => {
    setShowAllRows(false);
  }, [query, hidePending]);

  const filteredAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = transactions.filter((tx) => {
      if (hidePending && tx.pending) return false;
      if (!q) return true;
      const label = (tx.merchant_name || tx.name || "").toLowerCase();
      const cat = (tx.category_primary || "").toLowerCase();
      return (
        label.includes(q) ||
        cat.includes(q) ||
        tx.date.includes(q) ||
        String(Math.abs(tx.amount)).includes(q)
      );
    });
    rows = [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return rows;
  }, [transactions, query, hidePending]);

  const capped = useMemo(
    () => filteredAll.slice(0, LIST_CAP),
    [filteredAll]
  );

  const visibleRows = useMemo(
    () =>
      showAllRows || capped.length <= INITIAL_VISIBLE_ROWS
        ? capped
        : capped.slice(0, INITIAL_VISIBLE_ROWS),
    [capped, showAllRows]
  );

  const selectedTx = useMemo(
    () => transactions.find((t) => t.transaction_id === selectedId) ?? null,
    [transactions, selectedId]
  );

  const totalBeyondCap = filteredAll.length > LIST_CAP;
  const canExpandList = capped.length > INITIAL_VISIBLE_ROWS;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-6">
      <h2 className="text-lg font-semibold text-text-primary">
        Add recurring from a transaction
      </h2>
      <p className="mt-1 text-sm text-text-muted max-w-3xl">
        Choose a real bank transaction and how often it repeats. This only saves a rule for
        forecasting—it does not create new transactions. Pick a recent posted payment for the
        best match (e.g. weekly rent).
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, category, date, or amount…"
          className="w-full min-w-[200px] flex-1 rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Search transactions"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={hidePending}
            onChange={(e) => setHidePending(e.target.checked)}
            className="rounded border-border-subtle text-accent focus:ring-accent"
          />
          Hide pending
        </label>
      </div>

      {loading && (
        <p className="mt-4 text-sm text-text-muted">Loading transactions…</p>
      )}

      {!loading && capped.length === 0 && (
        <p className="mt-4 text-sm text-text-muted">
          No transactions match. Try clearing the search or including pending items.
        </p>
      )}

      {!loading && capped.length > 0 && (
        <>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface-2 text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {visibleRows.map((tx) => {
                  const title = tx.merchant_name || tx.name || "Transaction";
                  const isOutflow = tx.amount >= 0;
                  const existing = overrides[tx.transaction_id];
                  const isSavedRecurring = existing?.decision === "recurring";
                  const isSavedNot = existing?.decision === "not_recurring";
                  return (
                    <tr
                      key={tx.transaction_id}
                      className={
                        selectedId === tx.transaction_id ? "bg-accent/5" : "bg-surface-1"
                      }
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-text-secondary tabular-nums">
                        {tx.date}
                      </td>
                      <td className="max-w-[280px] px-3 py-2">
                        <div className="truncate font-medium text-text-primary">{title}</div>
                        {tx.category_primary && (
                          <div className="truncate text-xs text-text-muted">{tx.category_primary}</div>
                        )}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums ${
                          isOutflow ? "text-spending-red" : "text-income-green"
                        }`}
                      >
                        {isOutflow ? "-" : "+"}
                        {formatCurrency(Math.abs(tx.amount))}
                      </td>
                      <td className="px-3 py-2 text-xs text-text-muted">
                        {tx.pending ? "Pending" : "Posted"}
                        {isSavedRecurring && (
                          <span className="ml-1 rounded bg-income-green-dim px-1.5 py-0.5 text-income-green">
                            Recurring rule
                          </span>
                        )}
                        {isSavedNot && (
                          <span className="ml-1 rounded bg-surface-3 px-1.5 py-0.5">
                            Marked not recurring
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedId(
                              selectedId === tx.transaction_id ? null : tx.transaction_id
                            )
                          }
                          className="w-full rounded-lg border border-border-subtle bg-surface-2 px-2 py-1.5 text-xs font-medium text-accent hover:bg-surface-3"
                        >
                          {selectedId === tx.transaction_id ? "Close" : "Set rule"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            {canExpandList && (
              <button
                type="button"
                onClick={() => setShowAllRows((v) => !v)}
                className="text-sm font-medium text-accent hover:opacity-80"
              >
                {showAllRows
                  ? "Show fewer"
                  : `Show more (${capped.length - INITIAL_VISIBLE_ROWS} more)`}
              </button>
            )}
            {totalBeyondCap && (
              <p className="text-xs text-text-muted sm:ml-auto">
                Showing the {LIST_CAP} most recent matches. Refine your search to narrow results.
              </p>
            )}
          </div>
        </>
      )}

      {selectedTx && (
        <ConfirmRulePanel
          key={selectedTx.transaction_id}
          tx={selectedTx}
          existing={overrides[selectedTx.transaction_id] ?? null}
          onCancel={() => setSelectedId(null)}
          saveOverride={saveOverride}
        />
      )}
    </div>
  );
};

type ConfirmPanelProps = {
  tx: PlaidTransaction;
  existing: RecurringReviewOverride | null;
  onCancel: () => void;
  saveOverride: (input: SaveRecurringReviewOverrideInput) => Promise<void>;
};

const ConfirmRulePanel: React.FC<ConfirmPanelProps> = ({
  tx,
  existing,
  onCancel,
  saveOverride,
}) => {
  const defaultKind: "income" | "expense" = tx.amount < 0 ? "income" : "expense";
  const [kind, setKind] = useState<"income" | "expense">(
    existing?.kind === "income" || existing?.kind === "expense" ? existing.kind : defaultKind
  );
  const [cadence, setCadence] = useState<string>(
    existing?.cadence && existing.cadence.length > 0
      ? existing.cadence
      : defaultKind === "expense"
        ? "weekly"
        : "monthly"
  );
  const [category, setCategory] = useState<string>(existing?.category ?? "");
  const [incomeType, setIncomeType] = useState<string>(existing?.incomeType ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const title = tx.merchant_name || tx.name || "Transaction";

  return (
    <div className="mt-6 rounded-xl border border-accent/40 bg-surface-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Recurring rule</h3>
          <p className="mt-1 text-xs text-text-muted">
            {title} · {tx.date} ·{" "}
            {defaultKind === "income" ? "+" : "-"}
            {formatCurrency(Math.abs(tx.amount))}
          </p>
          {tx.pending && (
            <p className="mt-2 text-xs text-amber">
              This transaction is still pending. Posted amounts and dates can change.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-text-muted hover:text-text-primary"
        >
          Close
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "income" | "expense")}
          className="rounded-lg border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary"
          disabled={saving}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <select
          value={cadence}
          onChange={(e) => setCadence(e.target.value)}
          className="rounded-lg border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary"
          disabled={saving}
        >
          {RECURRING_REVIEW_CADENCE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {kind === "expense" ? (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary"
            disabled={saving}
          >
            <option value="">Category (optional)</option>
            {RECURRING_REVIEW_EXPENSE_CATEGORIES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={incomeType}
            onChange={(e) => setIncomeType(e.target.value)}
            className="rounded-lg border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary"
            disabled={saving}
          >
            <option value="">Income type (optional)</option>
            {RECURRING_REVIEW_INCOME_TYPES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
        <div className="flex flex-wrap gap-2 md:col-span-4">
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setSaveError(null);
              try {
                await saveOverride({
                  transactionId: tx.transaction_id,
                  decision: "recurring",
                  kind,
                  cadence,
                  category: kind === "expense" ? category || null : null,
                  incomeType: kind === "income" ? incomeType || null : null,
                });
                onCancel();
              } catch (err) {
                setSaveError(err instanceof Error ? err.message : "Could not save.");
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {existing?.decision === "recurring" ? "Update rule" : "Save as recurring"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setSaveError(null);
              try {
                await saveOverride({
                  transactionId: tx.transaction_id,
                  decision: "not_recurring",
                  kind: null,
                  cadence: null,
                  category: null,
                  incomeType: null,
                });
                onCancel();
              } catch (err) {
                setSaveError(err instanceof Error ? err.message : "Could not save.");
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-lg border border-border-subtle bg-surface-1 px-4 py-2 text-sm font-medium text-text-secondary hover:border-border-hover hover:text-text-primary disabled:opacity-70"
          >
            Not recurring
          </button>
        </div>
      </div>
      {saveError && <p className="mt-2 text-sm text-spending-red">{saveError}</p>}
    </div>
  );
};

export default AddRecurringFromTransaction;
