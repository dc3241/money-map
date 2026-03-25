import React, { useMemo } from "react";
import { format } from "date-fns";
import { usePlaidActuals } from "../context/PlaidActualsContext";
import { usePlaidTransactionsInRange } from "../hooks/usePlaidTransactionsInRange";
import { calendarMonthPlaidRange } from "../utils/plaidVisibleRange";
import { usePlaidRecurringFirestore } from "../hooks/usePlaidRecurringFirestore";
import { plaidMonthlyTotal } from "../utils/plaidAggregates";
import { estimateMonthlyFromStreams } from "../utils/plaidStreamUtils";
import type { PlaidTransactionStreamDoc } from "../hooks/usePlaidRecurringFirestore";

function streamAmt(s: PlaidTransactionStreamDoc): number {
  return Math.abs(
    Number(s.last_amount?.amount ?? s.average_amount?.amount ?? 0) || 0
  );
}

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
  const now = new Date();
  const monthBounds = calendarMonthPlaidRange(now);
  const { transactions } = usePlaidTransactionsInRange(
    usePlaidForActuals ? monthBounds.start : null,
    usePlaidForActuals ? monthBounds.end : null
  );
  const { data: rec, loading } = usePlaidRecurringFirestore();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  const monthActual = useMemo(
    () => plaidMonthlyTotal(transactions, y, m),
    [transactions, y, m]
  );

  const streamEst = useMemo(
    () => estimateMonthlyFromStreams(rec.inflow_streams, rec.outflow_streams),
    [rec.inflow_streams, rec.outflow_streams]
  );

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(n);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-bg-app">
      <h1 className="text-3xl font-semibold text-text-primary mb-2">
        Recurring (Plaid)
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          <div className="text-text-muted text-xs mt-1">Sum of stream amounts (approx.)</div>
        </div>
        <div className="bg-surface-2 border border-border-subtle rounded-xl p-4">
          <div className="text-text-muted text-xs uppercase tracking-widest mb-1">
            Streams — est. income / mo
          </div>
          <div className="text-xl font-semibold text-income-green tabular-nums">
            {formatCurrency(streamEst.income)}
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StreamTable
          title="Outflows (subscriptions & bills)"
          streams={rec.outflow_streams}
          tone="out"
        />
        <StreamTable
          title="Inflows (paychecks & deposits)"
          streams={rec.inflow_streams}
          tone="in"
        />
      </div>
    </div>
  );
};

export default RecurringPlaidView;
