import React, { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
  subMonths,
} from "date-fns";
import { usePlaidActuals } from "../context/PlaidActualsContext";
import { usePlaidTransactionsInRange } from "../hooks/usePlaidTransactionsInRange";
import { calendarMonthPlaidRange } from "../utils/plaidVisibleRange";
import { usePlaidRecurringFirestore } from "../hooks/usePlaidRecurringFirestore";
import { usePlaidAccountTypeMap } from "../hooks/usePlaidAccounts";
import { plaidMonthlyTotal } from "../utils/plaidAggregates";
import {
  buildStreamTransactionIdSet,
  estimateMonthlyFromRecurringOverrides,
  estimateMonthlyFromStreams,
} from "../utils/plaidStreamUtils";
import { usePlaidRecurringReview } from "../hooks/usePlaidRecurringReview";
import type { PlaidTransactionStreamDoc } from "../hooks/usePlaidRecurringFirestore";
import {
  recurringReviewCandidates,
  type RecurringReviewCandidate,
} from "../utils/recurringReviewCandidates";
import AddRecurringFromTransaction from "./recurring/AddRecurringFromTransaction";
import {
  RECURRING_REVIEW_CADENCE_OPTIONS,
  RECURRING_REVIEW_EXPENSE_CATEGORIES,
  RECURRING_REVIEW_INCOME_TYPES,
} from "../constants/recurringReviewFormOptions";

function streamAmt(s: PlaidTransactionStreamDoc): number {
  return Math.abs(
    Number(s.last_amount?.amount ?? s.average_amount?.amount ?? 0) || 0
  );
}

type StreamSortOption = "next" | "amount" | "description" | "frequency";

function streamSortKeyNext(s: PlaidTransactionStreamDoc): string {
  return s.predicted_next_date || s.last_date || "";
}

function compareStreamsBySort(
  a: PlaidTransactionStreamDoc,
  b: PlaidTransactionStreamDoc,
  sort: StreamSortOption
): number {
  switch (sort) {
    case "next": {
      const aKey = streamSortKeyNext(a);
      const bKey = streamSortKeyNext(b);
      if (!aKey && !bKey) return 0;
      if (!aKey) return 1;
      if (!bKey) return -1;
      return aKey.localeCompare(bKey);
    }
    case "amount":
      return streamAmt(a) - streamAmt(b);
    case "description": {
      const an = (a.merchant_name || a.description || "").toLowerCase();
      const bn = (b.merchant_name || b.description || "").toLowerCase();
      return an.localeCompare(bn);
    }
    case "frequency":
      return (a.frequency || "").localeCompare(b.frequency || "");
    default:
      return 0;
  }
}

function filterStreamsByQuery(
  streams: PlaidTransactionStreamDoc[],
  query: string
): PlaidTransactionStreamDoc[] {
  const q = query.trim().toLowerCase();
  if (!q) return streams;
  return streams.filter((s) => {
    const nameHaystack = [s.merchant_name, s.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const freq = (s.frequency || "").toLowerCase();
    const stat = (s.status || "").toLowerCase();
    const cat = (s.category?.join(" ") || "").toLowerCase();
    const next = (s.predicted_next_date || s.last_date || "").toLowerCase();
    return (
      nameHaystack.includes(q) ||
      freq.includes(q) ||
      stat.includes(q) ||
      cat.includes(q) ||
      next.includes(q)
    );
  });
}

function addCadenceFromDate(d: Date, cadenceRaw: string | null): Date {
  const c = (cadenceRaw ?? "monthly")
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, "_");
  switch (c) {
    case "daily":
      return addDays(d, 1);
    case "weekly":
      return addWeeks(d, 1);
    case "biweekly":
    case "bi_weekly":
      return addWeeks(d, 2);
    case "semimonthly":
    case "semi_monthly":
    case "twice_monthly":
      return addDays(d, 15);
    case "monthly":
      return addMonths(d, 1);
    case "quarterly":
      return addMonths(d, 3);
    case "annually":
    case "annual":
    case "yearly":
      return addYears(d, 1);
    default:
      return addMonths(d, 1);
  }
}

type ConfirmedOverrideExpense = {
  transactionId: string;
  label: string;
  amount: number;
  cadence: string;
  cadenceRaw: string | null;
  category: string | null;
  lastDate: string;
};

/** Next occurrence on or after today from last posted date + review cadence (approximate for semimonthly). */
function confirmedApproxNextDate(
  lastDateStr: string,
  cadenceRaw: string | null
): string | null {
  if (!lastDateStr || lastDateStr === "—") return null;
  const parsed = parseISO(`${lastDateStr}T12:00:00`);
  if (!isValid(parsed)) return null;
  const today = startOfDay(new Date());
  let cur = parsed;
  for (let i = 0; i < 400; i++) {
    const nxt = addCadenceFromDate(cur, cadenceRaw);
    if (!isBefore(startOfDay(nxt), today)) {
      return format(nxt, "yyyy-MM-dd");
    }
    cur = nxt;
  }
  return null;
}

type MergedOutflowRow =
  | { kind: "plaid"; stream: PlaidTransactionStreamDoc }
  | { kind: "confirmed"; row: ConfirmedOverrideExpense };

function mergedOutflowSortKeyNext(r: MergedOutflowRow): string {
  if (r.kind === "plaid") {
    return streamSortKeyNext(r.stream);
  }
  return (
    confirmedApproxNextDate(r.row.lastDate, r.row.cadenceRaw) ||
    r.row.lastDate ||
    ""
  );
}

function mergedOutflowAmount(r: MergedOutflowRow): number {
  return r.kind === "plaid" ? streamAmt(r.stream) : r.row.amount;
}

function mergedOutflowDescription(r: MergedOutflowRow): string {
  return r.kind === "plaid"
    ? r.stream.merchant_name || r.stream.description || ""
    : r.row.label;
}

function mergedOutflowFrequency(r: MergedOutflowRow): string {
  return r.kind === "plaid" ? r.stream.frequency || "" : r.row.cadence;
}

function compareMergedOutflows(
  a: MergedOutflowRow,
  b: MergedOutflowRow,
  sort: StreamSortOption
): number {
  switch (sort) {
    case "next": {
      const aKey = mergedOutflowSortKeyNext(a);
      const bKey = mergedOutflowSortKeyNext(b);
      if (!aKey && !bKey) return 0;
      if (!aKey) return 1;
      if (!bKey) return -1;
      return aKey.localeCompare(bKey);
    }
    case "amount":
      return mergedOutflowAmount(a) - mergedOutflowAmount(b);
    case "description":
      return mergedOutflowDescription(a)
        .toLowerCase()
        .localeCompare(mergedOutflowDescription(b).toLowerCase());
    case "frequency":
      return mergedOutflowFrequency(a).localeCompare(mergedOutflowFrequency(b));
    default:
      return 0;
  }
}

function filterMergedOutflowRow(r: MergedOutflowRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (r.kind === "plaid") {
    return filterStreamsByQuery([r.stream], query).length > 0;
  }
  const row = r.row;
  const blob = [
    row.label,
    row.cadence,
    row.category ?? "",
    row.lastDate,
    confirmedApproxNextDate(row.lastDate, row.cadenceRaw) ?? "",
    "confirmed",
  ]
    .join(" ")
    .toLowerCase();
  return blob.includes(q);
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function formatCadenceLabel(cadence: string | null | undefined): string {
  if (!cadence) return "Monthly";
  return cadence
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
            className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary"
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
            className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary"
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
  searchPlaceholder = "Search streams…",
}: {
  title: string;
  streams: PlaidTransactionStreamDoc[];
  tone: "in" | "out";
  searchPlaceholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<StreamSortOption>("next");

  const displayed = useMemo(() => {
    const filtered = filterStreamsByQuery(streams, search);
    return [...filtered].sort((a, b) => compareStreamsBySort(a, b, sort));
  }, [streams, search, sort]);

  const filterControlClass =
    "w-full px-3 py-2 bg-surface-2 border border-border-subtle rounded-xl focus:border-accent focus:ring-0 focus:outline-none text-text-primary placeholder:text-text-muted text-sm";
  const selectClass =
    "flex-1 px-3 py-2 bg-surface-2 border border-border-subtle rounded-xl text-text-secondary text-sm focus:outline-none focus:border-accent";

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
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          className={`${filterControlClass} flex-1 min-w-0`}
          aria-label={`Filter ${title}`}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as StreamSortOption)}
          className={`${selectClass} w-full sm:w-auto sm:min-w-[200px] shrink-0`}
          aria-label={`Sort ${title}`}
        >
          <option value="next">Next date</option>
          <option value="amount">Amount</option>
          <option value="description">Description</option>
          <option value="frequency">Frequency</option>
        </select>
      </div>

      {displayed.length === 0 ? (
        <p className="text-text-muted text-sm py-6 text-center border border-dashed border-border-subtle rounded-xl bg-surface-2/50">
          No streams match your search.
          {search.trim() ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="ml-2 text-accent underline-offset-2 hover:underline font-medium"
            >
              Clear search
            </button>
          ) : null}
        </p>
      ) : (
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
          {displayed.map((s) => (
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
      )}
      {displayed.length > 0 && search.trim() ? (
        <p className="mt-3 text-xs text-text-muted">
          Showing {displayed.length} of {streams.length} stream{streams.length === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}

function MergedOutflowsTable({
  plaidStreams,
  confirmedRows,
  onRemoveConfirmed,
}: {
  plaidStreams: PlaidTransactionStreamDoc[];
  confirmedRows: ConfirmedOverrideExpense[];
  onRemoveConfirmed: (transactionId: string) => void | Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<StreamSortOption>("next");

  const baseRows = useMemo<MergedOutflowRow[]>(() => {
    return [
      ...plaidStreams.map((stream) => ({ kind: "plaid" as const, stream })),
      ...confirmedRows.map((row) => ({ kind: "confirmed" as const, row })),
    ];
  }, [plaidStreams, confirmedRows]);

  const totalCount = baseRows.length;

  const displayed = useMemo(() => {
    const filtered = baseRows.filter((r) => filterMergedOutflowRow(r, search));
    return [...filtered].sort((a, b) => compareMergedOutflows(a, b, sort));
  }, [baseRows, search, sort]);

  const filterControlClass =
    "w-full px-3 py-2 bg-surface-2 border border-border-subtle rounded-xl focus:border-accent focus:ring-0 focus:outline-none text-text-primary placeholder:text-text-muted text-sm";
  const selectClass =
    "flex-1 px-3 py-2 bg-surface-2 border border-border-subtle rounded-xl text-text-secondary text-sm focus:outline-none focus:border-accent";

  if (totalCount === 0) {
    return (
      <div className="bg-surface-1 border border-border-subtle rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Outflows (subscriptions & bills)
        </h2>
        <p className="text-text-muted text-sm">
          No Plaid outflows and no confirmed recurring expenses yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 overflow-x-auto">
      <h2 className="text-lg font-semibold text-text-primary mb-1">
        Outflows (subscriptions & bills)
      </h2>
      <p className="text-xs text-text-muted mb-4 max-w-3xl">
        Plaid-detected streams plus rules you confirmed from transaction review (e.g. weekly
        housing). If a transaction is already part of a Plaid stream, only the Plaid row is shown.
      </p>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Search subscriptions & bills…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          className={`${filterControlClass} flex-1 min-w-0`}
          aria-label="Filter outflows"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as StreamSortOption)}
          className={`${selectClass} w-full sm:w-auto sm:min-w-[200px] shrink-0`}
          aria-label="Sort outflows"
        >
          <option value="next">Next date</option>
          <option value="amount">Amount</option>
          <option value="description">Description</option>
          <option value="frequency">Frequency</option>
        </select>
      </div>

      {displayed.length === 0 ? (
        <p className="text-text-muted text-sm py-6 text-center border border-dashed border-border-subtle rounded-xl bg-surface-2/50">
          No rows match your search.
          {search.trim() ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="ml-2 text-accent underline-offset-2 hover:underline font-medium"
            >
              Clear search
            </button>
          ) : null}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted text-xs uppercase tracking-widest border-b border-border-subtle">
              <th className="py-2 pr-2">Description</th>
              <th className="py-2 pr-2">Avg / last</th>
              <th className="py-2 pr-2">Frequency</th>
              <th className="py-2 pr-2">Next</th>
              <th className="py-2 pr-2">Source</th>
              <th className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((r) =>
              r.kind === "plaid" ? (
                <tr key={`plaid-${r.stream.stream_id}`} className="border-b border-border-subtle/80">
                  <td className="py-2 pr-2 text-text-primary font-medium">
                    {r.stream.merchant_name || r.stream.description}
                  </td>
                  <td className="py-2 pr-2 tabular-nums font-medium text-spending-red">
                    -{formatCurrency(streamAmt(r.stream))}
                  </td>
                  <td className="py-2 pr-2 text-text-secondary">{r.stream.frequency}</td>
                  <td className="py-2 pr-2 text-text-secondary">
                    {r.stream.predicted_next_date || "—"}
                  </td>
                  <td className="py-2 pr-2 text-text-secondary text-xs">
                    <span className="font-medium text-text-primary">Plaid</span>
                    <span className="block text-text-muted mt-0.5">
                      {r.stream.status ?? "—"}
                      {r.stream.is_active === false ? " · inactive" : ""}
                    </span>
                  </td>
                  <td className="py-2 text-right text-text-muted text-xs">—</td>
                </tr>
              ) : (
                <tr
                  key={`confirmed-${r.row.transactionId}`}
                  className="border-b border-border-subtle/80"
                >
                  <td className="py-2 pr-2 text-text-primary font-medium">{r.row.label}</td>
                  <td className="py-2 pr-2 tabular-nums font-medium text-spending-red">
                    -{formatCurrency(r.row.amount)}
                  </td>
                  <td className="py-2 pr-2 text-text-secondary">{r.row.cadence}</td>
                  <td className="py-2 pr-2 text-text-secondary">
                    {confirmedApproxNextDate(r.row.lastDate, r.row.cadenceRaw) ?? "—"}
                  </td>
                  <td className="py-2 pr-2 text-text-secondary text-xs">
                    <span className="font-medium text-text-primary">You confirmed</span>
                    {r.row.category ? (
                      <span className="block text-text-muted mt-0.5">{r.row.category}</span>
                    ) : null}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => void onRemoveConfirmed(r.row.transactionId)}
                      className="rounded-lg border border-spending-red bg-spending-red-dim px-3 py-1.5 text-xs font-medium text-spending-red hover:bg-spending-red hover:text-white"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
      {displayed.length > 0 && search.trim() ? (
        <p className="mt-3 text-xs text-text-muted">
          Showing {displayed.length} of {totalCount} row{totalCount === 1 ? "" : "s"}
        </p>
      ) : null}
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
    deleteOverride,
  } = usePlaidRecurringReview();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const reviewStart = format(subMonths(now, 6), "yyyy-MM-dd");
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

  const streamTxIds = useMemo(
    () => buildStreamTransactionIdSet(rec.inflow_streams, rec.outflow_streams),
    [rec.inflow_streams, rec.outflow_streams]
  );

  const streamEst = useMemo(() => {
    const fromPlaid = estimateMonthlyFromStreams(
      rec.inflow_streams,
      rec.outflow_streams
    );
    const fromOverrides = estimateMonthlyFromRecurringOverrides(
      overrides,
      reviewTransactions,
      streamTxIds
    );
    return {
      income: fromPlaid.income + fromOverrides.income,
      expense: fromPlaid.expense + fromOverrides.expense,
    };
  }, [
    rec.inflow_streams,
    rec.outflow_streams,
    overrides,
    reviewTransactions,
    streamTxIds,
  ]);

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
  const reviewTxById = useMemo(() => {
    const map = new Map<string, (typeof reviewTransactions)[number]>();
    for (const tx of reviewTransactions) {
      map.set(tx.transaction_id, tx);
    }
    return map;
  }, [reviewTransactions]);
  const confirmedRecurringOutflows = useMemo<ConfirmedOverrideExpense[]>(() => {
    const rows: ConfirmedOverrideExpense[] = [];
    for (const [transactionId, override] of Object.entries(overrides)) {
      if (override.decision !== "recurring") continue;
      const tx = reviewTxById.get(transactionId);
      const inferredKind = tx && tx.amount < 0 ? "income" : "expense";
      const kind = override.kind ?? inferredKind;
      if (kind !== "expense") continue;
      rows.push({
        transactionId,
        label: tx?.merchant_name || tx?.name || "Confirmed recurring",
        amount: Math.abs(tx?.amount ?? 0),
        cadence: formatCadenceLabel(override.cadence),
        cadenceRaw: override.cadence,
        category: override.category ?? tx?.category_primary ?? null,
        lastDate: tx?.date ?? "—",
      });
    }
    rows.sort((a, b) => a.label.localeCompare(b.label));
    return rows;
  }, [overrides, reviewTxById]);

  const confirmedOutflowsForMerge = useMemo(
    () =>
      confirmedRecurringOutflows.filter(
        (r) => !streamTxIds.has(r.transactionId)
      ),
    [confirmedRecurringOutflows, streamTxIds]
  );

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
            Plaid streams plus confirmed recurring rules (not double-counted with streams).
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
            Plaid streams plus confirmed recurring rules (not double-counted with streams).
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
          <div className="text-text-muted text-xs mt-1">
            Same combined estimates as the two cards above.
          </div>
        </div>
      </div>

      <div data-tour="tour-recurring-plaid-streams" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <MergedOutflowsTable
            plaidStreams={rec.outflow_streams}
            confirmedRows={confirmedOutflowsForMerge}
            onRemoveConfirmed={(id) => void deleteOverride(id)}
          />
        </div>
        <StreamTable
          title="Inflows (paychecks & deposits)"
          streams={rec.inflow_streams}
          tone="in"
          searchPlaceholder="Search paychecks & deposits…"
        />
      </div>

      <div className="mt-8">
        <AddRecurringFromTransaction
          transactions={reviewTransactions}
          loading={reviewTxLoading}
          overrides={overrides}
          saveOverride={saveOverride}
          deleteOverride={deleteOverride}
        />
      </div>

      <div className="mt-8 rounded-xl border border-border-subtle bg-surface-1 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Recurring review queue
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Confirm likely recurring transactions from the last 6 months to
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
