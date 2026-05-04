import React, { useMemo, useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { usePlaidActuals } from '../context/PlaidActualsContext';
import { usePlaidAccountTypeMap, usePlaidAccounts } from '../hooks/usePlaidAccounts';
import { usePlaidYearTransactions } from '../hooks/usePlaidYearTransactions';
import { usePlaidTransactionsInRange } from '../hooks/usePlaidTransactionsInRange';
import { usePlaidRecurringFirestore } from '../hooks/usePlaidRecurringFirestore';
import { usePlaidRecurringReview } from '../hooks/usePlaidRecurringReview';
import {
  plaidAnnualTotal,
  plaidMonthlyTotal,
  plaidTopIncomeSources,
  plaidTopSpendingMerchants,
  yearsFromPlaidTransactions,
} from '../utils/plaidAggregates';
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  isAfter,
  parseISO,
  startOfDay,
  subMonths,
} from 'date-fns';
import { getNextOccurrence } from '../utils/recurrenceUtils';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RecurrencePattern } from '../types';
import type { PlaidTransaction } from '../hooks/usePlaidTransactions';
import type { PlaidTransactionStreamDoc } from '../hooks/usePlaidRecurringFirestore';

type MonthlyChartRow = {
  monthKey: number;
  month: string;
  Income: number;
  Spending: number;
  Net: number;
};

type ForecastEvent = {
  id: string;
  label: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  source: 'override' | 'plaid_stream' | 'manual';
  confidence: number;
};

type ForecastPoint = {
  date: string;
  label: string;
  Income: number;
  Spending: number;
  Net: number;
  Balance: number;
};

const FORECAST_HORIZON_DAYS = 90;

function formatAxisCompact(value: number): string {
  const n = Math.abs(value);
  if (n >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}

const TOP_INSIGHTS_Y_AXIS_WIDTH = 136;
const TOP_INSIGHTS_CHART_MARGIN = { left: 8, right: 8 };

function truncateCategoryLabel(value: string, maxLength = 15): string {
  if (!value) return 'Uncategorized';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function addCadence(base: Date, cadence: string): Date {
  const c = cadence.toLowerCase().replace(/[-\s]+/g, '_');
  switch (c) {
    case 'daily':
      return addDays(base, 1);
    case 'weekly':
      return addWeeks(base, 1);
    case 'bi_weekly':
    case 'biweekly':
      return addWeeks(base, 2);
    case 'semi_monthly':
    case 'twice_monthly':
    case 'semimonthly':
      return addDays(base, 15);
    case 'quarterly':
      return addMonths(base, 3);
    case 'annually':
    case 'annual':
    case 'yearly':
      return addYears(base, 1);
    case 'monthly':
    default:
      return addMonths(base, 1);
  }
}

function confidenceLabel(value: number): 'High' | 'Medium' | 'Low' {
  if (value >= 0.8) return 'High';
  if (value >= 0.62) return 'Medium';
  return 'Low';
}

function nextByStreamFrequency(base: Date, frequency: string | null | undefined): Date {
  const f = (frequency ?? '').toUpperCase().trim().replace(/[-\s]+/g, '_');
  switch (f) {
    case 'DAILY':
      return addDays(base, 1);
    case 'WEEKLY':
      return addWeeks(base, 1);
    case 'BIWEEKLY':
      return addWeeks(base, 2);
    case 'SEMI_MONTHLY':
      return addDays(base, 15);
    case 'QUARTERLY':
      return addMonths(base, 3);
    case 'ANNUALLY':
    case 'ANNUAL':
      return addYears(base, 1);
    case 'MONTHLY':
    case 'UNKNOWN':
    case 'DYNAMIC':
    default:
      return addMonths(base, 1);
  }
}

function streamAmount(s: PlaidTransactionStreamDoc): number {
  const value = s.last_amount?.amount ?? s.average_amount?.amount ?? 0;
  return Math.abs(Number(value) || 0);
}

function streamAnchorDate(stream: PlaidTransactionStreamDoc, today: Date): Date | null {
  const raw = stream.predicted_next_date ?? stream.last_date ?? null;
  if (!raw) return null;
  const parsed = parseISO(`${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  let next = parsed;
  while (!isAfter(next, today)) {
    next = nextByStreamFrequency(next, stream.frequency);
  }
  return next;
}

const Reporting: React.FC = () => {
  const days = useBudgetStore((state) => state.days);
  const accounts = useBudgetStore((state) => state.accounts);
  const getMonthlyTotal = useBudgetStore((state) => state.getMonthlyTotal);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { usePlaidForActuals } = usePlaidActuals();
  const plaidAccountTypes = usePlaidAccountTypeMap();
  const { accounts: plaidAccounts } = usePlaidAccounts();
  const { data: plaidRecurring } = usePlaidRecurringFirestore();
  const { overrides: recurringOverrides } = usePlaidRecurringReview();
  const recurringExpenses = useBudgetStore((state) => state.recurringExpenses);
  const recurringIncome = useBudgetStore((state) => state.recurringIncome);
  const {
    transactions: plaidYearTransactions,
    loading: plaidYearLoading,
    error: plaidYearError,
  } = usePlaidYearTransactions(usePlaidForActuals ? selectedYear : null);
  const forecastRangeStart = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
  const forecastRangeEnd = format(new Date(), 'yyyy-MM-dd');
  const { transactions: forecastSourceTransactions } = usePlaidTransactionsInRange(
    usePlaidForActuals ? forecastRangeStart : null,
    usePlaidForActuals ? forecastRangeEnd : null
  );

  const plaidReportTransactions = usePlaidForActuals ? plaidYearTransactions : [];

  const [monthlyChartTab, setMonthlyChartTab] = useState<
    'overview' | 'bars' | 'net' | 'forecast'
  >('overview');
  const [focusMonthKey, setFocusMonthKey] = useState<number | null>(null);
  const [plaidRecurringExpanded, setPlaidRecurringExpanded] = useState(false);

  // Get available years from manual days + Plaid transaction dates (+ recent band when linked)
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    Object.keys(days).forEach((dateKey) => {
      const [year] = dateKey.split('-').map(Number);
      years.add(year);
    });
    const fromDays = Array.from(years);
    const merged = yearsFromPlaidTransactions(plaidYearTransactions, fromDays);
    if (usePlaidForActuals) {
      const cy = new Date().getFullYear();
      for (let y = cy; y >= cy - 10; y--) merged.push(y);
    }
    const uniq = Array.from(new Set(merged)).sort((a, b) => b - a);
    return uniq.length > 0 ? uniq : [new Date().getFullYear()];
  }, [days, plaidYearTransactions, usePlaidForActuals, selectedYear]);

  // Calculate annual totals
  const annualTotals = useMemo(() => {
    if (usePlaidForActuals) {
      return plaidAnnualTotal(
        plaidReportTransactions,
        selectedYear,
        plaidAccountTypes
      );
    }
    let income = 0;
    let spending = 0;
    const today = startOfDay(new Date());

    Object.keys(days).forEach((dateKey) => {
      const [year] = dateKey.split('-').map(Number);
      if (year === selectedYear) {
        const dayDate = startOfDay(parseISO(dateKey));

        if (dayDate.getTime() <= today.getTime()) {
          const dayData = days[dateKey];
          if (dayData) {
            income += dayData.income.reduce((sum, t) => sum + t.amount, 0);
            const regularSpending = (dayData.spending || []).reduce((sum, t) => sum + t.amount, 0);
            const transfers = (dayData.transfers || []).reduce((sum, t) => {
              if (t.transferToAccountId) {
                const toAccount = accounts.find((a) => a.id === t.transferToAccountId);
                if (toAccount && toAccount.type === 'credit_card') {
                  return sum + t.amount;
                }
              }
              return sum;
            }, 0);
            spending += regularSpending + transfers;
          }
        }
      }
    });

    return {
      income,
      spending,
      profit: income - spending,
    };
  }, [
    usePlaidForActuals,
    plaidReportTransactions,
    days,
    selectedYear,
    accounts,
    plaidAccountTypes,
  ]);

  // Calculate monthly breakdown
  const monthlyBreakdown = useMemo(() => {
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const total = usePlaidForActuals
        ? plaidMonthlyTotal(
            plaidReportTransactions,
            selectedYear,
            month,
            plaidAccountTypes
          )
        : getMonthlyTotal(selectedYear, month);
      months.push({
        month,
        monthName: format(new Date(selectedYear, month - 1, 1), 'MMM'),
        monthNameFull: format(new Date(selectedYear, month - 1, 1), 'MMMM'),
        ...total,
      });
    }
    return months;
  }, [
    usePlaidForActuals,
    plaidReportTransactions,
    getMonthlyTotal,
    selectedYear,
    days,
    plaidAccountTypes,
  ]);

  // Calculate averages
  const averages = useMemo(() => {
    const daysInYear = new Date(selectedYear, 1, 29).getMonth() === 1 ? 366 : 365; // Handle leap year
    return {
      monthlyIncome: annualTotals.income / 12,
      monthlySpending: annualTotals.spending / 12,
      monthlyProfit: annualTotals.profit / 12,
      dailySpending: annualTotals.spending / daysInYear,
      dailyIncome: annualTotals.income / daysInYear,
    };
  }, [annualTotals, monthlyBreakdown, selectedYear]);

  // Calculate savings rate
  const savingsRate = useMemo(() => {
    if (annualTotals.income === 0) return 0;
    return (annualTotals.profit / annualTotals.income) * 100;
  }, [annualTotals]);

  // Analyze recurring vs one-time transactions (manual entries only; bank sync has no recurring flags)
  const transactionAnalysis = useMemo(() => {
    if (usePlaidForActuals) {
      return {
        recurringIncome: 0,
        recurringSpending: 0,
        oneTimeIncome: 0,
        oneTimeSpending: 0,
      };
    }
    let recurringIncome = 0;
    let recurringSpending = 0;
    let oneTimeIncome = 0;
    let oneTimeSpending = 0;

    Object.values(days).forEach((dayData) => {
      const [year] = dayData.date.split('-').map(Number);
      if (year === selectedYear) {
        dayData.income.forEach((t) => {
          if (t.isRecurring) {
            recurringIncome += t.amount;
          } else {
            oneTimeIncome += t.amount;
          }
        });
        dayData.spending.forEach((t) => {
          if (t.isRecurring) {
            recurringSpending += t.amount;
          } else {
            oneTimeSpending += t.amount;
          }
        });
      }
    });

    return {
      recurringIncome,
      recurringSpending,
      oneTimeIncome,
      oneTimeSpending,
    };
  }, [usePlaidForActuals, days, selectedYear]);

  const topSpendingCategories = useMemo(() => {
    if (usePlaidForActuals) {
      return plaidTopSpendingMerchants(plaidReportTransactions, selectedYear, 10);
    }
    const categoryMap = new Map<string, number>();

    Object.values(days).forEach((dayData) => {
      const [year] = dayData.date.split('-').map(Number);
      if (year === selectedYear) {
        dayData.spending.forEach((t) => {
          const category = t.description || 'Uncategorized';
          categoryMap.set(category, (categoryMap.get(category) || 0) + t.amount);
        });
      }
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [usePlaidForActuals, plaidReportTransactions, days, selectedYear]);

  const topIncomeSources = useMemo(() => {
    if (usePlaidForActuals) {
      return plaidTopIncomeSources(
        plaidReportTransactions,
        selectedYear,
        10,
        plaidAccountTypes
      );
    }
    const sourceMap = new Map<string, number>();

    Object.values(days).forEach((dayData) => {
      const [year] = dayData.date.split('-').map(Number);
      if (year === selectedYear) {
        dayData.income.forEach((t) => {
          const source = t.description || 'Uncategorized';
          sourceMap.set(source, (sourceMap.get(source) || 0) + t.amount);
        });
      }
    });

    return Array.from(sourceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [
    usePlaidForActuals,
    plaidReportTransactions,
    days,
    selectedYear,
    plaidAccountTypes,
  ]);

  // Calculate trends (month-over-month)
  const monthlyTrends = useMemo(() => {
    return monthlyBreakdown.map((month, index) => {
      const previousMonth = index > 0 ? monthlyBreakdown[index - 1] : null;
      return {
        ...month,
        incomeChange: previousMonth
          ? ((month.income - previousMonth.income) / (previousMonth.income || 1)) * 100
          : 0,
        spendingChange: previousMonth
          ? ((month.spending - previousMonth.spending) / (previousMonth.spending || 1)) * 100
          : 0,
      };
    });
  }, [monthlyBreakdown]);

  // Projections (simple linear projection based on current year average)
  const projections = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    const monthsElapsed = currentMonth;
    const monthsRemaining = 12 - monthsElapsed;

    if (monthsElapsed === 0) return null;

    const avgMonthlyIncome = annualTotals.income / monthsElapsed;
    const avgMonthlySpending = annualTotals.spending / monthsElapsed;
    const projectedIncome = annualTotals.income + avgMonthlyIncome * monthsRemaining;
    const projectedSpending = annualTotals.spending + avgMonthlySpending * monthsRemaining;

    return {
      projectedIncome,
      projectedSpending,
      projectedProfit: projectedIncome - projectedSpending,
    };
  }, [annualTotals, selectedYear]);

  const CHART_TICK_FILL = '#4A5270';
  const CHART_GRID = 'rgba(255,255,255,0.04)';
  const TOOLTIP_STYLE = {
    contentStyle: {
      background: '#0F1524',
      border: '1px solid rgba(255,255,255,0.08)',
      color: '#F0F4FF',
      borderRadius: '10px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    },
    labelStyle: { color: '#8B95B0', marginBottom: 4 },
  };
  const LEGEND_STYLE = { paddingTop: 16 };
  const RECURRING_PIE_COLORS: Record<string, string> = {
    'Recurring Income': '#34C98A',
    'One-Time Income': '#2DD4BF',
    'Recurring Spending': '#FF5A5A',
    'One-Time Spending': '#F5A623',
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const monthlyChartData: MonthlyChartRow[] = monthlyBreakdown.map((m) => ({
    monthKey: m.month,
    month: m.monthName,
    Income: m.income,
    Spending: m.spending,
    Net: m.profit,
  }));

  const forecastModel = useMemo(() => {
    const today = startOfDay(new Date());
    const horizonEnd = startOfDay(addDays(today, FORECAST_HORIZON_DAYS));
    const txById = new Map<string, PlaidTransaction>();
    for (const tx of forecastSourceTransactions) {
      txById.set(tx.transaction_id, tx);
    }

    const overrideEvents: ForecastEvent[] = [];
    const blockedStreamTxIds = new Set<string>();
    for (const [transactionId, override] of Object.entries(recurringOverrides)) {
      if (override.decision !== 'recurring') continue;
      const tx = txById.get(transactionId);
      if (!tx) continue;
      const cadence = override.cadence ?? 'monthly';
      const type =
        override.kind ?? (tx.amount < 0 ? 'income' : 'expense');
      let next = startOfDay(parseISO(`${tx.date}T12:00:00`));
      if (Number.isNaN(next.getTime())) continue;
      while (!isAfter(next, today)) {
        next = addCadence(next, cadence);
      }
      let count = 0;
      while (!isAfter(next, horizonEnd) && count < 48) {
        overrideEvents.push({
          id: `ovr-${transactionId}-${count}`,
          label: tx.merchant_name || tx.name || 'Recurring',
          date: format(next, 'yyyy-MM-dd'),
          amount: Math.abs(tx.amount),
          type,
          source: 'override',
          confidence: 0.92,
        });
        next = addCadence(next, cadence);
        count++;
      }
      blockedStreamTxIds.add(transactionId);
    }

    const explicitNotRecurring = new Set(
      Object.entries(recurringOverrides)
        .filter(([, o]) => o.decision === 'not_recurring')
        .map(([id]) => id)
    );

    const streamEvents: ForecastEvent[] = [];
    for (const stream of [...plaidRecurring.inflow_streams, ...plaidRecurring.outflow_streams]) {
      const streamTxIds = Array.isArray(stream.transaction_ids)
        ? stream.transaction_ids.filter((id): id is string => typeof id === 'string')
        : [];
      if (streamTxIds.some((id) => explicitNotRecurring.has(id))) continue;
      if (streamTxIds.some((id) => blockedStreamTxIds.has(id))) continue;
      const anchor = streamAnchorDate(stream, today);
      if (!anchor) continue;
      let next = anchor;
      let count = 0;
      const type: 'income' | 'expense' =
        plaidRecurring.inflow_streams.includes(stream) ? 'income' : 'expense';
      while (!isAfter(next, horizonEnd) && count < 48) {
        streamEvents.push({
          id: `stream-${stream.stream_id}-${count}`,
          label: stream.merchant_name || stream.description || 'Stream',
          date: format(next, 'yyyy-MM-dd'),
          amount: streamAmount(stream),
          type,
          source: 'plaid_stream',
          confidence:
            stream.status?.toLowerCase() === 'mature' && stream.is_active !== false
              ? 0.82
              : stream.is_active !== false
                ? 0.72
                : 0.58,
        });
        next = nextByStreamFrequency(next, stream.frequency);
        count++;
      }
    }

    const manualEvents: ForecastEvent[] = [];
    const buildManual = (
      items: typeof recurringIncome | typeof recurringExpenses,
      type: 'income' | 'expense'
    ) => {
      for (const item of items) {
        if (!item.isActive) continue;
        let next = getNextOccurrence(
          item.pattern as RecurrencePattern,
          today,
          item.startDate,
          item.endDate
        );
        let count = 0;
        while (next && !isAfter(startOfDay(next), horizonEnd) && count < 48) {
          manualEvents.push({
            id: `manual-${type}-${item.id}-${count}`,
            label: item.description,
            date: format(startOfDay(next), 'yyyy-MM-dd'),
            amount: Math.abs(item.amount),
            type,
            source: 'manual',
            confidence: 0.64,
          });
          next = getNextOccurrence(
            item.pattern as RecurrencePattern,
            addDays(startOfDay(next), 1),
            item.startDate,
            item.endDate
          );
          count++;
        }
      }
    };
    buildManual(recurringIncome, 'income');
    buildManual(recurringExpenses, 'expense');

    const allEvents = [...overrideEvents, ...streamEvents, ...manualEvents];
    const totalsByDate = new Map<string, { income: number; spending: number }>();
    for (const ev of allEvents) {
      const existing = totalsByDate.get(ev.date) ?? { income: 0, spending: 0 };
      if (ev.type === 'income') existing.income += ev.amount;
      else existing.spending += ev.amount;
      totalsByDate.set(ev.date, existing);
    }

    const startingBalance = usePlaidForActuals
      ? plaidAccounts
          .filter((a) => a.type !== 'credit' && a.type !== 'loan' && a.type !== 'investment')
          .reduce((sum, a) => sum + Number(a.current_balance ?? 0), 0)
      : accounts
          .filter((a) => a.type !== 'credit_card')
          .reduce((sum, a) => sum + Number(a.initialBalance ?? 0), 0);

    let running = startingBalance;
    const points: ForecastPoint[] = [];
    const upcoming: ForecastEvent[] = [];
    for (let i = 1; i <= FORECAST_HORIZON_DAYS; i++) {
      const day = startOfDay(addDays(today, i));
      const dateKey = format(day, 'yyyy-MM-dd');
      const bucket = totalsByDate.get(dateKey) ?? { income: 0, spending: 0 };
      const net = bucket.income - bucket.spending;
      running += net;
      if (bucket.income > 0 || bucket.spending > 0) {
        for (const ev of allEvents.filter((e) => e.date === dateKey)) {
          upcoming.push(ev);
        }
      }
      points.push({
        date: dateKey,
        label: format(day, 'MMM d'),
        Income: bucket.income,
        Spending: bucket.spending,
        Net: net,
        Balance: running,
      });
    }

    const totalIncome = points.reduce((sum, p) => sum + p.Income, 0);
    const totalSpending = points.reduce((sum, p) => sum + p.Spending, 0);
    const totalNet = totalIncome - totalSpending;
    const firstNegative = points.find((p) => p.Balance < 0);
    const tips: { title: string; detail: string; tone: 'neutral' | 'warn' | 'good' }[] = [];
    if (firstNegative) {
      tips.push({
        title: 'Shortfall risk',
        detail: `Projected balance drops below $0 around ${firstNegative.label}.`,
        tone: 'warn',
      });
    }
    const recurringLoad = totalIncome > 0 ? totalSpending / totalIncome : 0;
    if (recurringLoad >= 0.8) {
      tips.push({
        title: 'High recurring load',
        detail: `${(recurringLoad * 100).toFixed(0)}% of expected income is already committed.`,
        tone: 'warn',
      });
    }
    if (totalNet > 0 && !firstNegative) {
      tips.push({
        title: 'Surplus window',
        detail: `Projected ${formatCurrency(totalNet)} surplus over the next ${FORECAST_HORIZON_DAYS} days.`,
        tone: 'good',
      });
    }
    if (tips.length === 0) {
      tips.push({
        title: 'Forecast baseline ready',
        detail: 'Confirm more recurring items to improve accuracy.',
        tone: 'neutral',
      });
    }

    const sourceMix = {
      overrides: allEvents.filter((e) => e.source === 'override').length,
      plaid: allEvents.filter((e) => e.source === 'plaid_stream').length,
      manual: allEvents.filter((e) => e.source === 'manual').length,
    };
    const weightedConfidence =
      allEvents.length === 0
        ? 0
        : allEvents.reduce((sum, e) => sum + e.confidence, 0) / allEvents.length;

    const priorWindowStart = startOfDay(addDays(today, -30));
    const priorWindowEnd = today;
    let priorIncome = 0;
    let priorSpending = 0;
    for (const tx of forecastSourceTransactions) {
      const d = parseISO(`${tx.date}T12:00:00`);
      if (Number.isNaN(d.getTime())) continue;
      if (isAfter(priorWindowStart, d) || isAfter(d, priorWindowEnd)) continue;
      if (tx.amount < 0) priorIncome += Math.abs(tx.amount);
      else priorSpending += Math.abs(tx.amount);
    }
    const priorNet = priorIncome - priorSpending;
    const next30Net = points.slice(0, 30).reduce((sum, p) => sum + p.Net, 0);
    const netDelta = next30Net - priorNet;

    return {
      points,
      upcoming: upcoming
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .slice(0, 14),
      summary: {
        startingBalance,
        endingBalance: points.length > 0 ? points[points.length - 1].Balance : startingBalance,
        income: totalIncome,
        spending: totalSpending,
        net: totalNet,
      },
      tips: tips.slice(0, 3),
      confidence: {
        score: weightedConfidence,
        label: confidenceLabel(weightedConfidence),
        sourceMix,
      },
      delta: {
        priorNet,
        forecastNet30: next30Net,
        difference: netDelta,
      },
    };
  }, [
    forecastSourceTransactions,
    recurringOverrides,
    plaidRecurring.inflow_streams,
    plaidRecurring.outflow_streams,
    recurringIncome,
    recurringExpenses,
    usePlaidForActuals,
    plaidAccounts,
    accounts,
  ]);

  const recurringVsOneTimeData = [
    { name: 'Recurring Income', value: transactionAnalysis.recurringIncome },
    { name: 'One-Time Income', value: transactionAnalysis.oneTimeIncome },
    { name: 'Recurring Spending', value: transactionAnalysis.recurringSpending },
    { name: 'One-Time Spending', value: transactionAnalysis.oneTimeSpending },
  ].filter((item) => item.value > 0);

  const calendarYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === calendarYear;
  const heroPeriodLabel = isCurrentYear ? 'Year to date' : 'Full year';

  const chartMonthTabClass = (tab: typeof monthlyChartTab) =>
    `min-h-[40px] shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app ${
      monthlyChartTab === tab
        ? 'bg-accent text-white shadow-[0_0_0_1px_rgba(79,127,255,0.35)]'
        : 'bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary border border-border-subtle'
    }`;

  return (
    <div className="flex-1 overflow-y-auto bg-bg-app">
      <header data-tour="tour-reporting-header" className="sticky top-0 z-20 border-b border-border-subtle bg-bg-app/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
                Financial Reports
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                {heroPeriodLabel} · {selectedYear}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  usePlaidForActuals
                    ? 'border-accent/40 bg-accent-glow text-accent'
                    : 'border-border-subtle bg-surface-2 text-text-secondary'
                }`}
                title={usePlaidForActuals ? 'Totals use linked bank transactions' : 'Totals use your manual calendar'}
              >
                {usePlaidForActuals ? 'Bank data' : 'Manual ledger'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              data-tour="tour-reporting-year"
              className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
              role="tablist"
              aria-label="Year"
            >
              {availableYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  role="tab"
                  aria-selected={selectedYear === year}
                  onClick={() => {
                    setSelectedYear(year);
                    setFocusMonthKey(null);
                  }}
                  className={`min-h-[44px] min-w-[72px] shrink-0 rounded-xl px-4 text-sm font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app ${
                    selectedYear === year
                      ? 'bg-surface-2 text-text-primary ring-1 ring-accent/50'
                      : 'text-text-muted hover:bg-surface-2 hover:text-text-secondary'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {usePlaidForActuals && plaidYearLoading && (
            <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-sm text-text-secondary">
              <span
                className="inline-block size-4 shrink-0 animate-pulse rounded-full bg-accent/60"
                aria-hidden
              />
              <span>Loading bank transactions for {selectedYear}…</span>
            </div>
          )}
          {usePlaidForActuals && plaidYearError && (
            <div
              className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-text-secondary"
              role="alert"
            >
              Could not load the full year of transactions ({plaidYearError.message}). If this
              persists, add a Firestore composite index for{' '}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-text-primary">
                transactions.date
              </code>{' '}
              range queries or retry after a sync.
            </div>
          )}
        </div>
      </header>

      <div data-tour="tour-reporting-content" className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Bento hero */}
        <section aria-labelledby="reports-hero-heading">
          <h2 id="reports-hero-heading" className="sr-only">
            Annual summary
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
            <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] lg:col-span-7 lg:row-span-2 lg:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-accent-glow blur-3xl" />
              <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Net</p>
              <p
                className={`mt-2 font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl ${
                  annualTotals.profit >= 0 ? 'text-income-green' : 'text-spending-red'
                }`}
              >
                {annualTotals.profit >= 0 ? '+' : ''}
                {formatCurrency(annualTotals.profit)}
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
                {heroPeriodLabel} for {selectedYear}. Income {formatCurrency(annualTotals.income)}{' '}
                vs spending {formatCurrency(annualTotals.spending)}.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-text-muted">Savings rate</p>
                  <div className="mt-3 flex items-center gap-4">
                    <div
                      className="relative grid size-20 shrink-0 place-items-center rounded-full border border-border-subtle bg-surface-2"
                      role="img"
                      aria-label={`Savings rate ${savingsRate.toFixed(1)} percent`}
                    >
                      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" aria-hidden>
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-surface-3"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="none"
                          strokeWidth="3"
                          strokeLinecap="round"
                          className={savingsRate >= 0 ? 'text-income-green' : 'text-spending-red'}
                          strokeDasharray={`${Math.min(Math.abs(savingsRate), 100) * 0.97} 100`}
                          pathLength={100}
                        />
                      </svg>
                      <span
                        className={`relative z-[1] text-sm font-bold tabular-nums ${
                          savingsRate >= 0 ? 'text-income-green' : 'text-spending-red'
                        }`}
                      >
                        {savingsRate.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-text-muted">
                      Of annual income retained after spending ({savingsRate.toFixed(1)}%).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Income</p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-income-green sm:text-3xl">
                {formatCurrency(annualTotals.income)}
              </p>
              <p className="mt-2 text-xs text-text-muted">Total inflows counted for the year</p>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Spending</p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-spending-red sm:text-3xl">
                {formatCurrency(annualTotals.spending)}
              </p>
              <p className="mt-2 text-xs text-text-muted">Total outflows counted for the year</p>
            </div>
          </div>
        </section>

        {/* Monthly cash flow */}
        <section
          className="rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:p-6"
          aria-labelledby="monthly-flow-heading"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2
                id="monthly-flow-heading"
                className="font-display text-lg font-semibold text-text-primary sm:text-xl"
              >
                Monthly cash flow
              </h2>
              <p className="mt-1 text-sm text-text-secondary">Switch view — one chart at a time</p>
            </div>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Chart view">
              <button type="button" className={chartMonthTabClass('overview')} onClick={() => setMonthlyChartTab('overview')}>
                Overview
              </button>
              <button type="button" className={chartMonthTabClass('bars')} onClick={() => setMonthlyChartTab('bars')}>
                Compare bars
              </button>
              <button type="button" className={chartMonthTabClass('net')} onClick={() => setMonthlyChartTab('net')}>
                Net focus
              </button>
              <button
                type="button"
                className={chartMonthTabClass('forecast')}
                onClick={() => setMonthlyChartTab('forecast')}
              >
                Forecast
              </button>
            </div>
          </div>

          <div className="mt-6 h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              {monthlyChartTab === 'overview' ? (
                <ComposedChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="repIncomeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34C98A" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#34C98A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="repSpendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF5A5A" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#FF5A5A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={CHART_GRID} />
                  <XAxis dataKey="month" tick={{ fill: CHART_TICK_FILL, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={formatAxisCompact}
                    tick={{ fill: CHART_TICK_FILL, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                    contentStyle={TOOLTIP_STYLE.contentStyle}
                    labelStyle={TOOLTIP_STYLE.labelStyle}
                  />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="Income"
                    stroke="#34C98A"
                    strokeWidth={2}
                    fill="url(#repIncomeFill)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="Spending"
                    stroke="#FF5A5A"
                    strokeWidth={2}
                    fill="url(#repSpendFill)"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Net"
                    stroke="#4F7FFF"
                    strokeWidth={2.5}
                    dot={(props) => {
                      const { cx, cy, payload } = props as {
                        cx: number;
                        cy: number;
                        payload: MonthlyChartRow;
                      };
                      const active = focusMonthKey === payload.monthKey;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={active ? 7 : 4}
                          fill="#4F7FFF"
                          stroke={active ? '#F0F4FF' : 'none'}
                          strokeWidth={active ? 2 : 0}
                          className="cursor-pointer"
                          onClick={() =>
                            setFocusMonthKey((prev) => (prev === payload.monthKey ? null : payload.monthKey))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setFocusMonthKey((prev) => (prev === payload.monthKey ? null : payload.monthKey));
                            }
                          }}
                          tabIndex={0}
                          aria-label={`Select ${payload.month}`}
                        />
                      );
                    }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              ) : monthlyChartTab === 'bars' ? (
                <BarChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART_GRID} />
                  <XAxis dataKey="month" tick={{ fill: CHART_TICK_FILL, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={formatAxisCompact}
                    tick={{ fill: CHART_TICK_FILL, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                    contentStyle={TOOLTIP_STYLE.contentStyle}
                    labelStyle={TOOLTIP_STYLE.labelStyle}
                  />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar
                    dataKey="Income"
                    fill="#34C98A"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                    onClick={(cell: { payload?: MonthlyChartRow }) => {
                      const key = cell?.payload?.monthKey;
                      if (key != null) {
                        setFocusMonthKey((prev) => (prev === key ? null : key));
                      }
                    }}
                  />
                  <Bar
                    dataKey="Spending"
                    fill="#FF5A5A"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                    onClick={(cell: { payload?: MonthlyChartRow }) => {
                      const key = cell?.payload?.monthKey;
                      if (key != null) {
                        setFocusMonthKey((prev) => (prev === key ? null : key));
                      }
                    }}
                  />
                </BarChart>
              ) : monthlyChartTab === 'net' ? (
                <LineChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART_GRID} />
                  <XAxis dataKey="month" tick={{ fill: CHART_TICK_FILL, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={formatAxisCompact}
                    tick={{ fill: CHART_TICK_FILL, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                    contentStyle={TOOLTIP_STYLE.contentStyle}
                    labelStyle={TOOLTIP_STYLE.labelStyle}
                  />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="Net"
                    name="Net"
                    stroke="#4F7FFF"
                    strokeWidth={3}
                    dot={(props) => {
                      const { cx, cy, payload } = props as {
                        cx: number;
                        cy: number;
                        payload: MonthlyChartRow;
                      };
                      const active = focusMonthKey === payload.monthKey;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={active ? 8 : 5}
                          fill="#4F7FFF"
                          stroke={active ? '#F0F4FF' : 'rgba(79,127,255,0.35)'}
                          strokeWidth={active ? 2 : 1}
                          className="cursor-pointer"
                          onClick={() =>
                            setFocusMonthKey((prev) => (prev === payload.monthKey ? null : payload.monthKey))
                          }
                          tabIndex={0}
                          aria-label={`Select ${payload.month}`}
                        />
                      );
                    }}
                    isAnimationActive={false}
                  />
                </LineChart>
              ) : (
                <LineChart data={forecastModel.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART_GRID} />
                  <XAxis dataKey="label" tick={{ fill: CHART_TICK_FILL, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={formatAxisCompact}
                    tick={{ fill: CHART_TICK_FILL, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                    contentStyle={TOOLTIP_STYLE.contentStyle}
                    labelStyle={TOOLTIP_STYLE.labelStyle}
                  />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="Balance"
                    name="Projected balance"
                    stroke="#4F7FFF"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Net"
                    name="Daily net"
                    stroke="#9C7CFF"
                    strokeWidth={1.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {monthlyChartTab === 'forecast' && (
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="rounded-xl border border-border-subtle bg-surface-2 p-4">
                <div className="text-xs uppercase tracking-widest text-text-muted">Starting balance</div>
                <div className="mt-2 text-xl font-semibold tabular-nums text-text-primary">
                  {formatCurrency(forecastModel.summary.startingBalance)}
                </div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-2 p-4">
                <div className="text-xs uppercase tracking-widest text-text-muted">90-day net</div>
                <div
                  className={`mt-2 text-xl font-semibold tabular-nums ${
                    forecastModel.summary.net >= 0 ? 'text-income-green' : 'text-spending-red'
                  }`}
                >
                  {forecastModel.summary.net >= 0 ? '+' : ''}
                  {formatCurrency(forecastModel.summary.net)}
                </div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-2 p-4">
                <div className="text-xs uppercase tracking-widest text-text-muted">Projected ending balance</div>
                <div
                  className={`mt-2 text-xl font-semibold tabular-nums ${
                    forecastModel.summary.endingBalance >= 0 ? 'text-income-green' : 'text-spending-red'
                  }`}
                >
                  {formatCurrency(forecastModel.summary.endingBalance)}
                </div>
              </div>

              <div className="rounded-xl border border-border-subtle bg-surface-2 p-4 lg:col-span-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-text-muted">
                      <span>Forecast confidence</span>
                      <span className="relative inline-flex items-center group">
                        <button
                          type="button"
                          aria-label="Why this confidence?"
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border-subtle text-[10px] font-semibold text-text-muted transition-colors hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          i
                        </button>
                        <span
                          role="tooltip"
                          className="pointer-events-none invisible absolute left-0 top-6 z-20 w-72 rounded-lg border border-border-subtle bg-surface-1 px-3 py-2 text-[11px] normal-case tracking-normal text-text-secondary shadow-lg group-hover:visible group-focus-within:visible"
                        >
                          Confidence is weighted by source reliability: user-confirmed recurring items score highest, Plaid streams score next (higher when active/mature), and manual recurring templates score baseline confidence.
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 text-lg font-semibold text-text-primary">
                      {forecastModel.confidence.label} ({Math.round(forecastModel.confidence.score * 100)}%)
                    </div>
                  </div>
                  <div className="text-xs text-text-muted">
                    Confirmed: {forecastModel.confidence.sourceMix.overrides} · Plaid: {forecastModel.confidence.sourceMix.plaid} · Manual: {forecastModel.confidence.sourceMix.manual}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border-subtle bg-surface-2 p-4 lg:col-span-3">
                <h3 className="text-sm font-semibold text-text-primary">What changed since last forecast window</h3>
                <p className="mt-1 text-xs text-text-muted">
                  Next 30-day projected net vs prior 30-day actual net.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-text-muted">Prior 30-day actual net</div>
                    <div className={`mt-1 text-sm font-semibold tabular-nums ${forecastModel.delta.priorNet >= 0 ? 'text-income-green' : 'text-spending-red'}`}>
                      {forecastModel.delta.priorNet >= 0 ? '+' : ''}
                      {formatCurrency(forecastModel.delta.priorNet)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-text-muted">Next 30-day forecast net</div>
                    <div className={`mt-1 text-sm font-semibold tabular-nums ${forecastModel.delta.forecastNet30 >= 0 ? 'text-income-green' : 'text-spending-red'}`}>
                      {forecastModel.delta.forecastNet30 >= 0 ? '+' : ''}
                      {formatCurrency(forecastModel.delta.forecastNet30)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-text-muted">Delta</div>
                    <div className={`mt-1 text-sm font-semibold tabular-nums ${forecastModel.delta.difference >= 0 ? 'text-income-green' : 'text-spending-red'}`}>
                      {forecastModel.delta.difference >= 0 ? '+' : ''}
                      {formatCurrency(forecastModel.delta.difference)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border-subtle bg-surface-2 p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-text-primary">Forecast tips</h3>
                <div className="mt-3 space-y-2">
                  {forecastModel.tips.map((tip) => (
                    <div
                      key={tip.title}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        tip.tone === 'warn'
                          ? 'border-amber/40 bg-amber/10 text-text-primary'
                          : tip.tone === 'good'
                            ? 'border-income-green/30 bg-income-green/10 text-text-primary'
                            : 'border-border-subtle bg-surface-1 text-text-secondary'
                      }`}
                    >
                      <div className="font-medium">{tip.title}</div>
                      <div className="mt-0.5 text-xs">{tip.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border-subtle bg-surface-2 p-4">
                <h3 className="text-sm font-semibold text-text-primary">Upcoming expected</h3>
                <div className="mt-3 space-y-2">
                  {forecastModel.upcoming.length === 0 && (
                    <p className="text-xs text-text-muted">
                      No expected recurring items detected in the forecast window yet.
                    </p>
                  )}
                  {forecastModel.upcoming.slice(0, 8).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="truncate text-text-primary">{item.label}</div>
                        <div className="text-text-muted">
                          {item.date} · {item.source === 'override' ? 'confirmed' : item.source === 'plaid_stream' ? 'plaid' : 'manual'}
                          <span className="ml-1">· {confidenceLabel(item.confidence)} confidence</span>
                        </div>
                      </div>
                      <div
                        className={`shrink-0 font-semibold tabular-nums ${
                          item.type === 'income' ? 'text-income-green' : 'text-spending-red'
                        }`}
                      >
                        {item.type === 'income' ? '+' : '-'}
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Monthly table */}
        <section
          className="rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:p-6"
          aria-labelledby="monthly-table-heading"
        >
          <h2 id="monthly-table-heading" className="font-display text-lg font-semibold text-text-primary sm:text-xl">
            Month by month
          </h2>
          <p className="mt-1 text-sm text-text-secondary">Click a row to highlight it alongside the chart</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border-subtle">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 z-[1] bg-surface-2/95 backdrop-blur-sm">
                <tr className="border-b border-border-subtle">
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-muted"
                  >
                    Month
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-text-muted"
                  >
                    Income
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-text-muted"
                  >
                    Spending
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-text-muted"
                  >
                    Net
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-text-muted"
                  >
                    Income Δ
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-text-muted"
                  >
                    Spend Δ
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrends.map((month) => {
                  const selected = focusMonthKey === month.month;
                  return (
                    <tr
                      key={month.month}
                      onClick={() => setFocusMonthKey((prev) => (prev === month.month ? null : month.month))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setFocusMonthKey((prev) => (prev === month.month ? null : month.month));
                        }
                      }}
                      tabIndex={0}
                      className={`cursor-pointer border-b border-border-subtle transition-colors focus:outline-none focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                        selected ? 'bg-accent/10' : 'hover:bg-surface-2/80'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-text-primary">{month.monthNameFull}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-income-green">
                        {formatCurrency(month.income)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-spending-red">
                        {formatCurrency(month.spending)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${
                          month.profit >= 0 ? 'text-income-green' : 'text-spending-red'
                        }`}
                      >
                        {month.profit >= 0 ? '+' : ''}
                        {formatCurrency(month.profit)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right text-xs tabular-nums ${
                          month.incomeChange === 0
                            ? 'text-text-muted'
                            : month.incomeChange > 0
                              ? 'text-income-green'
                              : 'text-spending-red'
                        }`}
                      >
                        {month.incomeChange !== 0 && (month.incomeChange >= 0 ? '+' : '')}
                        {month.incomeChange !== 0 ? `${month.incomeChange.toFixed(1)}%` : '—'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right text-xs tabular-nums ${
                          month.spendingChange === 0
                            ? 'text-text-muted'
                            : month.spendingChange > 0
                              ? 'text-spending-red'
                              : 'text-income-green'
                        }`}
                      >
                        {month.spendingChange !== 0 && (month.spendingChange >= 0 ? '+' : '')}
                        {month.spendingChange !== 0 ? `${month.spendingChange.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Averages + projections */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-labelledby="averages-heading">
          <div
            id="averages-heading"
            className="rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:p-6"
          >
            <h2 className="font-display text-lg font-semibold text-text-primary">Averages</h2>
            <div className="mt-5 space-y-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted">Monthly</h3>
                <dl className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-text-secondary">Income</dt>
                    <dd className="font-semibold tabular-nums text-income-green">{formatCurrency(averages.monthlyIncome)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-text-secondary">Spending</dt>
                    <dd className="font-semibold tabular-nums text-spending-red">{formatCurrency(averages.monthlySpending)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-text-secondary">Net</dt>
                    <dd
                      className={`font-semibold tabular-nums ${
                        averages.monthlyProfit >= 0 ? 'text-income-green' : 'text-spending-red'
                      }`}
                    >
                      {averages.monthlyProfit >= 0 ? '+' : ''}
                      {formatCurrency(averages.monthlyProfit)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted">Daily</h3>
                <dl className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-text-secondary">Income</dt>
                    <dd className="font-semibold tabular-nums text-income-green">{formatCurrency(averages.dailyIncome)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-text-secondary">Spending</dt>
                    <dd className="font-semibold tabular-nums text-spending-red">{formatCurrency(averages.dailySpending)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {projections && (
            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold text-text-primary">Year-end projections</h2>
              <p className="mt-1 text-sm text-text-muted">Based on current year averages</p>
              <dl className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-text-secondary">Projected income</dt>
                  <dd className="font-semibold tabular-nums text-income-green">
                    {formatCurrency(projections.projectedIncome)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-text-secondary">Projected spending</dt>
                  <dd className="font-semibold tabular-nums text-spending-red">
                    {formatCurrency(projections.projectedSpending)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-border-subtle pt-3">
                  <dt className="font-medium text-text-primary">Projected net</dt>
                  <dd
                    className={`text-lg font-semibold tabular-nums ${
                      projections.projectedProfit >= 0 ? 'text-income-green' : 'text-spending-red'
                    }`}
                  >
                    {projections.projectedProfit >= 0 ? '+' : ''}
                    {formatCurrency(projections.projectedProfit)}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </section>

        {/* Top insights — two columns on desktop */}
        {topSpendingCategories.length > 0 && topIncomeSources.length > 0 && (
          <section
            aria-label="Top spending and top income"
            className="grid grid-cols-1 gap-5 lg:grid-cols-2"
          >
            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:p-6">
              <h3 className="font-display text-lg font-semibold text-text-primary">
                {usePlaidForActuals ? 'Top spending (merchants)' : 'Top spending categories'}
              </h3>
              <div className="mt-4 h-[280px] w-full min-w-0 lg:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topSpendingCategories}
                    layout="vertical"
                    margin={TOP_INSIGHTS_CHART_MARGIN}
                  >
                    <CartesianGrid horizontal={false} stroke={CHART_GRID} />
                    <XAxis
                      type="number"
                      tickFormatter={formatAxisCompact}
                      tick={{ fill: CHART_TICK_FILL, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={TOP_INSIGHTS_Y_AXIS_WIDTH}
                      tickFormatter={truncateCategoryLabel}
                      tick={{ fill: CHART_TICK_FILL, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                      contentStyle={TOOLTIP_STYLE.contentStyle}
                      labelStyle={TOOLTIP_STYLE.labelStyle}
                    />
                    <Bar dataKey="value" fill="#FF5A5A" radius={[0, 6, 6, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:p-6">
              <h3 className="font-display text-lg font-semibold text-text-primary">Top income sources</h3>
              <div className="mt-4 h-[280px] w-full min-w-0 lg:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topIncomeSources}
                    layout="vertical"
                    margin={TOP_INSIGHTS_CHART_MARGIN}
                  >
                    <CartesianGrid horizontal={false} stroke={CHART_GRID} />
                    <XAxis
                      type="number"
                      tickFormatter={formatAxisCompact}
                      tick={{ fill: CHART_TICK_FILL, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={TOP_INSIGHTS_Y_AXIS_WIDTH}
                      tickFormatter={truncateCategoryLabel}
                      tick={{ fill: CHART_TICK_FILL, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                      contentStyle={TOOLTIP_STYLE.contentStyle}
                      labelStyle={TOOLTIP_STYLE.labelStyle}
                    />
                    <Bar dataKey="value" fill="#34C98A" radius={[0, 6, 6, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {topSpendingCategories.length > 0 && topIncomeSources.length === 0 && (
          <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:p-6">
            <h3 className="font-display text-lg font-semibold text-text-primary">
              {usePlaidForActuals ? 'Top spending (merchants)' : 'Top spending categories'}
            </h3>
            <div className="mt-4 h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topSpendingCategories}
                  layout="vertical"
                  margin={TOP_INSIGHTS_CHART_MARGIN}
                >
                  <CartesianGrid horizontal={false} stroke={CHART_GRID} />
                  <XAxis
                    type="number"
                    tickFormatter={formatAxisCompact}
                    tick={{ fill: CHART_TICK_FILL, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={TOP_INSIGHTS_Y_AXIS_WIDTH}
                    tickFormatter={truncateCategoryLabel}
                    tick={{ fill: CHART_TICK_FILL, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                    contentStyle={TOOLTIP_STYLE.contentStyle}
                    labelStyle={TOOLTIP_STYLE.labelStyle}
                  />
                  <Bar dataKey="value" fill="#FF5A5A" radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {topSpendingCategories.length === 0 && topIncomeSources.length > 0 && (
          <section className="rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:p-6">
            <h3 className="font-display text-lg font-semibold text-text-primary">Top income sources</h3>
            <div className="mt-4 h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topIncomeSources}
                  layout="vertical"
                  margin={TOP_INSIGHTS_CHART_MARGIN}
                >
                  <CartesianGrid horizontal={false} stroke={CHART_GRID} />
                  <XAxis
                    type="number"
                    tickFormatter={formatAxisCompact}
                    tick={{ fill: CHART_TICK_FILL, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={TOP_INSIGHTS_Y_AXIS_WIDTH}
                    tickFormatter={truncateCategoryLabel}
                    tick={{ fill: CHART_TICK_FILL, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                    contentStyle={TOOLTIP_STYLE.contentStyle}
                    labelStyle={TOOLTIP_STYLE.labelStyle}
                  />
                  <Bar dataKey="value" fill="#34C98A" radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {usePlaidForActuals && (
          <div className="rounded-2xl border border-border-subtle bg-surface-1 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="mt-0.5 text-accent" aria-hidden>
                  ●
                </span>
                <span>
                  Recurring splits on this page use your manual ledger only. Use{' '}
                  <span className="font-medium text-text-primary">Recurring</span> for bank-detected streams.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPlaidRecurringExpanded((e) => !e)}
                className="shrink-0 rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1"
                aria-expanded={plaidRecurringExpanded}
              >
                {plaidRecurringExpanded ? 'Hide detail' : 'Learn more'}
              </button>
            </div>
            {plaidRecurringExpanded && (
              <p className="mt-3 border-t border-border-subtle pt-3 text-sm leading-relaxed text-text-muted">
                Full-year income and spending totals here always reflect linked bank data when accounts are
                connected. The recurring vs one-time pie uses manual flags only, so it stays hidden for Plaid
                mode. Open Recurring to see Plaid streams next to these totals.
              </p>
            )}
          </div>
        )}

        {recurringVsOneTimeData.length > 0 && (
          <section
            className="rounded-2xl border border-border-subtle bg-surface-1 p-5 sm:p-6"
            aria-labelledby="recurring-heading"
          >
            <h2 id="recurring-heading" className="font-display text-lg font-semibold text-text-primary">
              Recurring vs one-time
            </h2>
            <p className="mt-1 text-sm text-text-secondary">Manual ledger classification for {selectedYear}</p>
            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted">Breakdown</h3>
                <dl className="mt-4 space-y-3">
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">Recurring income</dt>
                    <dd className="font-semibold tabular-nums text-income-green">
                      {formatCurrency(transactionAnalysis.recurringIncome)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">One-time income</dt>
                    <dd className="font-semibold tabular-nums text-income-green">
                      {formatCurrency(transactionAnalysis.oneTimeIncome)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">Recurring spending</dt>
                    <dd className="font-semibold tabular-nums text-spending-red">
                      {formatCurrency(transactionAnalysis.recurringSpending)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">One-time spending</dt>
                    <dd className="font-semibold tabular-nums text-spending-red">
                      {formatCurrency(transactionAnalysis.oneTimeSpending)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="min-h-[260px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Pie
                      data={recurringVsOneTimeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={88}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {recurringVsOneTimeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RECURRING_PIE_COLORS[entry.name] ?? '#8B95B0'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                      contentStyle={TOOLTIP_STYLE.contentStyle}
                      labelStyle={TOOLTIP_STYLE.labelStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Reporting;
