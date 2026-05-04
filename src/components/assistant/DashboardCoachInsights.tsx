import { useMemo } from 'react';
import { useBudgetStore } from '../../store/useBudgetStore';
import { usePlaidActuals } from '../../context/PlaidActualsContext';
import { useMoneyCoachOptional } from '../../context/MoneyCoachContext';
import { buildMoneyMapContextSnapshot } from '../../assistant/moneyMapSnapshot';
import { buildCoachInsights } from '../../assistant/coachInsights';
import { getWeekRange, formatDateKey } from '../../utils/dateUtils';
import { plaidWeeklyTotal, plaidMonthlyTotal } from '../../utils/plaidAggregates';
import { usePlaidRangeTransactionsState } from '../../context/PlaidRangeTransactionsContext';

type DashboardCoachInsightsProps = {
  currentDate: Date;
};

export default function DashboardCoachInsights({ currentDate }: DashboardCoachInsightsProps) {
  const coach = useMoneyCoachOptional();
  const { usePlaidForActuals } = usePlaidActuals();
  const { transactions: plaidTransactions, accountTypeByAccountId } = usePlaidRangeTransactionsState();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const weekRange = getWeekRange(currentDate);

  const plaidWeekly = useMemo(
    () =>
      plaidWeeklyTotal(
        plaidTransactions,
        weekRange.start,
        weekRange.end,
        usePlaidForActuals ? accountTypeByAccountId : undefined
      ),
    [plaidTransactions, weekRange.start, weekRange.end, usePlaidForActuals, accountTypeByAccountId]
  );

  const plaidMonthly = useMemo(
    () =>
      plaidMonthlyTotal(plaidTransactions, year, month, usePlaidForActuals ? accountTypeByAccountId : undefined),
    [plaidTransactions, year, month, usePlaidForActuals, accountTypeByAccountId]
  );

  const insights = useMemo(() => {
    const store = useBudgetStore.getState();
    const overlay =
      usePlaidForActuals ?
        {
          year,
          month,
          weekStartKey: formatDateKey(weekRange.start),
          monthly: {
            income: plaidMonthly.income,
            spending: plaidMonthly.spending,
            profit: plaidMonthly.profit,
          },
          weekly: {
            income: plaidWeekly.income,
            spending: plaidWeekly.spending,
            profit: plaidWeekly.profit,
          },
        } :
        null;
    const snap = buildMoneyMapContextSnapshot(store, currentDate, {
      usePlaidLinkedActuals: usePlaidForActuals,
      plaidOverlay: overlay,
    });
    return buildCoachInsights(snap);
  }, [
    currentDate,
    usePlaidForActuals,
    year,
    month,
    weekRange.start,
    plaidMonthly,
    plaidWeekly,
  ]);

  if (!coach) return null;

  return (
    <section className="mb-4 rounded-xl border border-border-subtle bg-surface-1 p-4" aria-labelledby="coach-insights-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id="coach-insights-heading" className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
          Insights
        </h3>
        <button
          type="button"
          onClick={() =>
            coach.openCoach({
              referenceDate: currentDate,
              plaidOverlay:
                usePlaidForActuals ?
                  {
                    year,
                    month,
                    weekStartKey: formatDateKey(weekRange.start),
                    monthly: {
                      income: plaidMonthly.income,
                      spending: plaidMonthly.spending,
                      profit: plaidMonthly.profit,
                    },
                    weekly: {
                      income: plaidWeekly.income,
                      spending: plaidWeekly.spending,
                      profit: plaidWeekly.profit,
                    },
                  } :
                  null,
            })
          }
          className="text-xs font-medium text-accent hover:underline"
        >
          Open coach
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className={`rounded-lg border px-3 py-2.5 text-sm ${
              insight.tone === 'warning' ?
                'border-amber-500/35 bg-amber-500/5' :
                insight.tone === 'positive' ?
                  'border-emerald-500/30 bg-emerald-500/5' :
                  'border-border-subtle bg-surface-2/60'
            }`}
          >
            <p className="font-medium text-text-primary">{insight.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{insight.body}</p>
            <button
              type="button"
              onClick={() =>
                coach.openCoach({
                  seed: insight.askPrompt,
                  referenceDate: currentDate,
                  plaidOverlay:
                    usePlaidForActuals ?
                      {
                        year,
                        month,
                        weekStartKey: formatDateKey(weekRange.start),
                        monthly: {
                          income: plaidMonthly.income,
                          spending: plaidMonthly.spending,
                          profit: plaidMonthly.profit,
                        },
                        weekly: {
                          income: plaidWeekly.income,
                          spending: plaidWeekly.spending,
                          profit: plaidWeekly.profit,
                        },
                      } :
                      null,
                })
              }
              className="mt-2 text-xs font-medium text-accent hover:underline"
            >
              Ask coach about this
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
