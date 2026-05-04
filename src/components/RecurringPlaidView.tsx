import React, { useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import { usePlaidActuals } from "../context/PlaidActualsContext";
import { usePlaidTransactionsInRange } from "../hooks/usePlaidTransactionsInRange";
import { calendarMonthPlaidRange } from "../utils/plaidVisibleRange";
import { usePlaidRecurringFirestore } from "../hooks/usePlaidRecurringFirestore";
import { usePlaidAccountTypeMap } from "../hooks/usePlaidAccounts";
import { plaidMonthlyTotal } from "../utils/plaidAggregates";
import {
  buildStreamTransactionIdSet,
  estimateMonthlyFromStreams,
} from "../utils/plaidStreamUtils";
import { usePlaidRecurringReview } from "../hooks/usePlaidRecurringReview";
import type { PlaidTransactionStreamDoc } from "../hooks/usePlaidRecurringFirestore";
import {
  recurringReviewCandidates,
  type RecurringReviewCandidate,
} from "../utils/recurringReviewCandidates";

const REVIEW_CADENCE_OPTIONS = [
  "weekly",
  "biweekly",
  "semimonthly",
  "monthly",
  "quarterly",
  "annually",
];

const REVIEW_EXPENSE_CATEGORIES = [
  "Housing",
  "Utilities",
  "Food & Dining",
  "Transportation",
  "Insurance",
  "Healthcare",
  "Shopping",
  "Entertainment",
  "Debt Payment",
  "Subscription",
  "Other",
];

const REVIEW_INCOME_TYPES = [
  "Salary",
  "Freelance",
  "Side hustle",
  "Bonus",
  "Investment",
  "Transfer",
  "Other",
];

function streamAmt(s: PlaidTransactionStreamDoc): number {
  return Math.abs(
    Number(s.last_amount?.amount ?? s.average_amount?.amount ?? 0) || 0
  );
}

/** Soonest `predicted_next_date` first; missing dates use `last_date`, then sort last. */
function sortOutflowsByNextDate(
  streams: PlaidTransactionStreamDoc[]
): PlaidTransactionStreamDoc[] {
  return [...streams].sort((a, b) => {
    const aKey = a.predicted_next_date || a.last_date || "";
    const bKey = b.predicted_next_date || b.last_date || "";
    if (!aKey && !bKey) return 0;
    if (!aKey) return 1;
    if (!bKey) return -1;
    return aKey.localeCompare(bKey);
  });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

type ReviewCardProps = {
  candidate: RecurringReviewCandidate;
  onConfirm: (input: {
    transactionId: string;
    kind: "income" | "expense";
    cadence: string | null;
    category: string | null;
    incomeType: string | null;
  }) => Promise<void>;
  onNotRecurring: (transactionId: string) => Promise<void>;
};

const ReviewCandidateCard: React.FC<ReviewCardProps> = ({
  candidate,
  onConfirm,
  onNotRecurring,
}) => {
  const tx = candidate.tx;
  const defaultKind: "income" | "expense" = tx.amount < 0 ? "income" : "expense";
  const [kind, setKind] = useState<"income" | "expense">(defaultKind);
  const [cadence, setCadence] = useState<string>("monthly");
  const [category, setCategory] = useState<string>("");
  const [incomeType, setIncomeType] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const title = tx.merchant_name || tx.name || "Transaction";
  const confidenceClass =
    candidate.confidenceLabel === "High"
      ? "bg-income-green-dim text-income-green"
      : candidate.confidenceLabel === "Medium"
      ? "bg-amber/10 text-amber"
      : "bg-spending-red-dim text-spending-red";

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-text-primary">{title}</div>
          <div className="text-xs text-text-muted mt-1">
            {tx.date} · {tx.category_primary ?? "Uncategorized"}
          </div>
        </div>
        <div
          className={`text-sm font-semibold tabular-nums ${
            defaultKind === "income" ? "text-income-green" : "text-spending-red"
          }`}
        >
          {defaultKind === "income" ? "+" : "-"}
          {formatCurrency(Math.abs(tx.amount))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${confidenceClass}`}>
          {candidate.confidenceLabel} confidence
        </span>
        <span className="text-xs text-text-muted">
          {candidate.occurrences} similar occurrence{candidate.occurrences === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "income" | "expense")}
          className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary"
          disabled={saving}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <select
          value={cadence}
          onChange={(e) => setCadence(e.target.value)}
          className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary"
          disabled={saving}
        >
          {REVIEW_CADENCE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {kind === "expense" ? (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary"
            disabled={saving}
          >
            <option value="">Category (optional)</option>
            {REVIEW_EXPENSE_CATEGORIES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={incomeType}
            onChange={(e) => setIncomeType(e.target.value)}
            className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary"
            disabled={saving}
          >
            <option value="">Income type (optional)</option>
            {REVIEW_INCOME_TYPES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setSaveError(null);
              try {
                await onConfirm({
                  transactionId: tx.transaction_id,
                  kind,
                  cadence,
                  category: kind === "expense" ? category || null : null,
                  incomeType: kind === "income" ? incomeType || null : null,
                });
              } catch (err) {
                setSaveError(err instanceof Error ? err.message : "Could not save decision.");
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Confirm recurring
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setSaveError(null);
              try {
                await onNotRecurring(tx.transaction_id);
              } catch (err) {
                setSaveError(err instanceof Error ? err.message : "Could not save decision.");
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm font-medium text-text-secondary hover:border-border-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            Not recurring
          </button>
        </div>
      </div>
      {saveError && (
        <div className="mt-2 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-text-secondary">
          {saveError}
        </div>
      )}
    </div>
  );
};

function StreamTable({
  title,
  streams,
  tone,
}: {
  title: string;
  streams: PlaidTransactionStreamDoc[];
  tone: "in" | "out";
}) {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(n);

  if (streams.length === 0) {
    return (
      <div className="bg-surface-1 border border-border-subtle rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">{title}</h2>
        <p className="text-text-muted text-sm">No streams in this category.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 overflow-x-auto">
      <h2 className="text-lg font-semibold text-text-primary mb-4">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted text-xs uppercase tracking-widest border-b border-border-subtle">
            <th className="py-2 pr-2">Description</th>
            <th className="py-2 pr-2">Avg / last</th>
            <th className="py-2 pr-2">Frequency</th>
            <th className="py-2 pr-2">Next</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {streams.map((s) => (
            <tr key={s.stream_id} className="border-b border-border-subtle/80">
              <td className="py-2 pr-2 text-text-primary font-medium">
                {s.merchant_name || s.description}
              </td>
              <td
                className={`py-2 pr-2 tabular-nums font-medium ${
                  tone === "in" ? "text-income-green" : "text-spending-red"
                }`}
              >
                {tone === "in" ? "+" : "-"}
                {formatCurrency(streamAmt(s))}
              </td>
              <td className="py-2 pr-2 text-text-secondary">{s.frequency}</td>
              <td className="py-2 pr-2 text-text-secondary">
                {s.predicted_next_date || "—"}
              </td>
              <td className="py-2 text-text-muted text-xs">
                {s.status ?? "—"}
                {s.is_active === false ? " · inactive" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const RecurringPlaidView: React.FC = () => {
  const { usePlaidForActuals } = usePlaidActuals();
  const plaidAccountTypes = usePlaidAccountTypeMap();
  const now = new Date();
  const monthBounds = calendarMonthPlaidRange(now);
  const { transactions } = usePlaidTransactionsInRange(
    usePlaidForActuals ? monthBounds.start : null,
    usePlaidForActuals ? monthBounds.end : null
  );
  const { data: rec, loading } = usePlaidRecurringFirestore();
  const {
    overrides,
    loading: reviewLoading,
    error: reviewError,
    saveOverride,
  } = usePlaidRecurringReview();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const reviewStart = format(subMonths(now, 3), "yyyy-MM-dd");
  const reviewEnd = format(now, "yyyy-MM-dd");
  const { transactions: reviewTransactions, loading: reviewTxLoading } =
    usePlaidTransactionsInRange(
      usePlaidForActuals ? reviewStart : null,
      usePlaidForActuals ? reviewEnd : null
    );

  const monthActual = useMemo(
    () => plaidMonthlyTotal(transactions, y, m, plaidAccountTypes),
    [transactions, y, m, plaidAccountTypes]
  );

  const streamEst = useMemo(
    () => estimateMonthlyFromStreams(rec.inflow_streams, rec.outflow_streams),
    [rec.inflow_streams, rec.outflow_streams]
  );

  const outflowsSortedByNext = useMemo(
    () => sortOutflowsByNextDate(rec.outflow_streams),
    [rec.outflow_streams]
  );

  const streamTxIds = useMemo(
    () => buildStreamTransactionIdSet(rec.inflow_streams, rec.outflow_streams),
    [rec.inflow_streams, rec.outflow_streams]
  );
  const reviewedTxIds = useMemo(() => new Set(Object.keys(overrides)), [overrides]);
  const reviewCandidates = useMemo(
    () =>
      recurringReviewCandidates(
        reviewTransactions,
        streamTxIds,
        reviewedTxIds
      ),
    [reviewTransactions, streamTxIds, reviewedTxIds]
  );
  const reviewedCount = reviewedTxIds.size;

  return (
    <div data-tour="tour-recurring-plaid-intro" className="flex-1 overflow-y-auto p-6 bg-bg-app">
      <h1 className="text-3xl font-semibold text-text-primary mb-2">
        Recurring
      </h1>
      <p className="text-text-muted text-sm mb-6 max-w-3xl">
        Streams are detected from your linked accounts. Refresh accounts on the Accounts page
        after syncing transactions so recurring and liabilities stay current. Manual recurring
        templates are disabled while your bank is connected.
      </p>

      {loading && (
        <p className="text-text-muted text-sm mb-4">Loading stream data…</p>
      )}
      {rec.error && (
        <div className="mb-4 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-text-secondary">
          Plaid could not load recurring streams for this item. Try again after a full transaction sync.
        </div>
      )}
      {reviewError && (
        <div className="mb-4 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-text-secondary">
          Recurring review overrides failed to load. You can still view stream insights.
        </div>
      )}

      <div data-tour="tour-recurring-plaid-stats" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-4">
          <div className="text-text-muted text-xs uppercase tracking-widest mb-1">
            This month — spending (actual)
          </div>
          <div className="text-2xl font-semibold text-spending-red tabular-nums">
            {formatCurrency(monthActual.spending)}
          </div>
          <div className="text-text-muted text-xs mt-1">{format(now, "MMMM yyyy")}</div>
        </div>
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-4">
          <div className="text-text-muted text-xs uppercase tracking-widest mb-1">
            This month — income (actual)
          </div>
          <div className="text-2xl font-semibold text-income-green tabular-nums">
            {formatCurrency(monthActual.income)}
          </div>
          <div className="text-text-muted text-xs mt-1">{format(now, "MMMM yyyy")}</div>
        </div>
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-4">
          <div className="text-text-muted text-xs uppercase tracking-widest mb-1">
            This month — net (actual)
          </div>
          <div
            className={`text-2xl font-semibold tabular-nums ${
              monthActual.profit >= 0 ? "text-income-green" : "text-spending-red"
            }`}
          >
            {formatCurrency(monthActual.profit)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-2 border border-border-subtle rounded-xl p-4">
          <div className="text-text-muted text-xs uppercase tracking-widest mb-1">
            Streams — est. expenses / mo
          </div>
          <div className="text-xl font-semibold text-spending-red tabular-nums">
            {formatCurrency(streamEst.expense)}
          </div>
          <div className="text-text-muted text-xs mt-1">
            Per-stream amount × occurrences per month (approx.)
          </div>
        </div>
        <div className="bg-surface-2 border border-border-subtle rounded-xl p-4">
          <div className="text-text-muted text-xs uppercase tracking-widest mb-1">
            Streams — est. income / mo
          </div>
          <div className="text-xl font-semibold text-income-green tabular-nums">
            {formatCurrency(streamEst.income)}
          </div>
          <div className="text-text-muted text-xs mt-1">
            Per-stream amount × occurrences per month (approx.)
          </div>
        </div>
        <div className="bg-surface-2 border border-border-subtle rounded-xl p-4">
          <div className="text-text-muted text-xs uppercase tracking-widest mb-1">
            Streams — est. net / mo
          </div>
          <div
            className={`text-xl font-semibold tabular-nums ${
              streamEst.income - streamEst.expense >= 0
                ? "text-income-green"
                : "text-spending-red"
            }`}
          >
            {formatCurrency(streamEst.income - streamEst.expense)}
          </div>
          <div className="text-text-muted text-xs mt-1">Income estimate minus expense estimate</div>
        </div>
      </div>

      <div data-tour="tour-recurring-plaid-streams" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StreamTable
          title="Outflows (subscriptions & bills)"
          streams={outflowsSortedByNext}
          tone="out"
        />
        <StreamTable
          title="Inflows (paychecks & deposits)"
          streams={rec.inflow_streams}
          tone="in"
        />
      </div>

      <div className="mt-8 rounded-xl border border-border-subtle bg-surface-1 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Recurring review queue
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Confirm likely recurring transactions from the last 3 months to
              improve forecasting accuracy.
            </p>
          </div>
          <div className="text-xs uppercase tracking-widest text-text-muted">
            Reviewed: {reviewedCount}
          </div>
        </div>

        {(reviewLoading || reviewTxLoading) && (
          <p className="mt-4 text-sm text-text-muted">Loading review candidates…</p>
        )}

        {!reviewLoading && !reviewTxLoading && reviewCandidates.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-border-subtle bg-surface-2 px-4 py-5 text-sm text-text-muted">
            No candidates right now. Sync more transactions or review newly
            posted activity later.
          </div>
        )}

        {reviewCandidates.length > 0 && (
          <div className="mt-4 space-y-3">
            {reviewCandidates.map((tx) => (
              <ReviewCandidateCard
                key={tx.tx.transaction_id}
                candidate={tx}
                onConfirm={async ({
                  transactionId,
                  kind,
                  cadence,
                  category,
                  incomeType,
                }) => {
                  await saveOverride({
                    transactionId,
                    decision: "recurring",
                    kind,
                    cadence,
                    category,
                    incomeType,
                  });
                }}
                onNotRecurring={async (transactionId) => {
                  await saveOverride({
                    transactionId,
                    decision: "not_recurring",
                    kind: null,
                    cadence: null,
                    category: null,
                    incomeType: null,
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecurringPlaidView;
