import React, { useMemo, useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { format, startOfDay, parseISO } from 'date-fns';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Reporting: React.FC = () => {
  const days = useBudgetStore((state) => state.days);
  const accounts = useBudgetStore((state) => state.accounts);
  const getMonthlyTotal = useBudgetStore((state) => state.getMonthlyTotal);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    Object.keys(days).forEach((dateKey) => {
      const [year] = dateKey.split('-').map(Number);
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [days]);

  // Calculate annual totals
  const annualTotals = useMemo(() => {
    let income = 0;
    let spending = 0;
    const today = startOfDay(new Date());

    Object.keys(days).forEach((dateKey) => {
      const [year] = dateKey.split('-').map(Number);
      if (year === selectedYear) {
        // Parse the date and compare to today
        const dayDate = startOfDay(parseISO(dateKey));
        
        // Only include transactions on or before today
        if (dayDate.getTime() <= today.getTime()) {
          const dayData = days[dateKey];
          if (dayData) {
            income += dayData.income.reduce((sum, t) => sum + t.amount, 0);
            const regularSpending = (dayData.spending || []).reduce((sum, t) => sum + t.amount, 0);
            // Only count transfers to credit cards as spending (paying down debt)
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
  }, [days, selectedYear, accounts]);

  // Calculate monthly breakdown
  const monthlyBreakdown = useMemo(() => {
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const total = getMonthlyTotal(selectedYear, month);
      months.push({
        month,
        monthName: format(new Date(selectedYear, month - 1, 1), 'MMM'),
        monthNameFull: format(new Date(selectedYear, month - 1, 1), 'MMMM'),
        ...total,
      });
    }
    return months;
  }, [getMonthlyTotal, selectedYear, days]);

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

  // Analyze recurring vs one-time transactions
  const transactionAnalysis = useMemo(() => {
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
  }, [days, selectedYear]);

  // Top spending categories (by description)
  const topSpendingCategories = useMemo(() => {
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
  }, [days, selectedYear]);

  // Top income sources
  const topIncomeSources = useMemo(() => {
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
  }, [days, selectedYear]);

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
    const projectedIncome = annualTotals.income + (avgMonthlyIncome * monthsRemaining);
    const projectedSpending = annualTotals.spending + (avgMonthlySpending * monthsRemaining);

    return {
      projectedIncome,
      projectedSpending,
      projectedProfit: projectedIncome - projectedSpending,
    };
  }, [annualTotals, selectedYear]);

  // Chart colors (design tokens)
  const CHART_GRID_STROKE = '#1A2238'; // surface-3
  const CHART_TICK_FILL = '#4A5270'; // text-muted
  const TOOLTIP_STYLE = {
    contentStyle: { background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)', color: '#F0F4FF', borderRadius: '8px' },
  };
  const LEGEND_STYLE = { fill: '#8B95B0' };
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

  // Prepare data for charts
  const monthlyChartData = monthlyBreakdown.map(m => ({
    month: m.monthName,
    Income: m.income,
    Spending: m.spending,
    Net: m.profit,
  }));

  const recurringVsOneTimeData = [
    { name: 'Recurring Income', value: transactionAnalysis.recurringIncome },
    { name: 'One-Time Income', value: transactionAnalysis.oneTimeIncome },
    { name: 'Recurring Spending', value: transactionAnalysis.recurringSpending },
    { name: 'One-Time Spending', value: transactionAnalysis.oneTimeSpending },
  ].filter(item => item.value > 0);

  return (
    <div className="flex-1 overflow-y-auto bg-bg-app p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold text-text-primary">Financial Reports</h1>
          <div className="flex gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 bg-surface-2 border border-border-subtle rounded-xl text-text-secondary font-medium focus:outline-none focus:border-accent focus:ring-0 transition-all"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Annual Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface-1 border border-border-subtle border-l-2 border-l-income-green rounded-xl p-6 hover:border-border-hover transition-all duration-200">
            <h3 className="text-text-muted text-xs uppercase tracking-widest font-medium mb-2">Annual Income</h3>
            <p className="text-3xl font-semibold text-income-green">{formatCurrency(annualTotals.income)}</p>
          </div>
          <div className="bg-surface-1 border border-border-subtle border-l-2 border-l-spending-red rounded-xl p-6 hover:border-border-hover transition-all duration-200">
            <h3 className="text-text-muted text-xs uppercase tracking-widest font-medium mb-2">Annual Spending</h3>
            <p className="text-3xl font-semibold text-spending-red">{formatCurrency(annualTotals.spending)}</p>
          </div>
          <div className="bg-surface-1 border border-border-subtle border-l-2 border-l-accent rounded-xl p-6 hover:border-border-hover transition-all duration-200">
            <h3 className="text-text-muted text-xs uppercase tracking-widest font-medium mb-2">Net Profit</h3>
            <p className={`text-3xl font-semibold ${annualTotals.profit >= 0 ? 'text-income-green' : 'text-spending-red'}`}>
              {annualTotals.profit >= 0 ? '+' : ''}{formatCurrency(annualTotals.profit)}
            </p>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 mb-8">
          <h2 className="text-text-muted text-xs uppercase tracking-widest font-medium mb-4">Savings Rate</h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full flex items-center justify-end pr-2 ${savingsRate >= 0 ? 'bg-income-green' : 'bg-spending-red'}`}
                  style={{ width: `${Math.min(Math.abs(savingsRate), 100)}%` }}
                >
                  {Math.abs(savingsRate) > 5 && (
                    <span className="text-white text-xs font-semibold">{savingsRate.toFixed(1)}%</span>
                  )}
                </div>
              </div>
            </div>
            <span className={`text-2xl font-semibold min-w-[80px] text-right tabular-nums ${savingsRate >= 0 ? 'text-income-green' : 'text-spending-red'}`}>
              {savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Monthly Trends Chart */}
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 mb-8">
          <h2 className="text-text-primary text-xl font-semibold mb-6">Monthly Income & Spending Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="month" tick={{ fill: CHART_TICK_FILL }} />
              <YAxis tick={{ fill: CHART_TICK_FILL }} />
              <Tooltip formatter={(value: number | undefined) => formatCurrency(value ?? 0)} contentStyle={TOOLTIP_STYLE.contentStyle} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Line type="monotone" dataKey="Income" stroke="#34C98A" strokeWidth={2} />
              <Line type="monotone" dataKey="Spending" stroke="#FF5A5A" strokeWidth={2} />
              <Line type="monotone" dataKey="Net" stroke="#4F7FFF" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Breakdown Bar Chart */}
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 mb-8">
          <h2 className="text-text-primary text-xl font-semibold mb-6">Monthly Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="month" tick={{ fill: CHART_TICK_FILL }} />
              <YAxis tick={{ fill: CHART_TICK_FILL }} />
              <Tooltip formatter={(value: number | undefined) => formatCurrency(value ?? 0)} contentStyle={TOOLTIP_STYLE.contentStyle} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Bar dataKey="Income" fill="#34C98A" />
              <Bar dataKey="Spending" fill="#FF5A5A" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 mb-8">
          <h2 className="text-text-primary text-xl font-semibold mb-6">Monthly Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-2 border-b border-border-subtle">
                  <th className="text-left py-3 px-4 text-text-muted text-xs uppercase tracking-widest font-medium">Month</th>
                  <th className="text-right py-3 px-4 text-text-muted text-xs uppercase tracking-widest font-medium">Income</th>
                  <th className="text-right py-3 px-4 text-text-muted text-xs uppercase tracking-widest font-medium">Spending</th>
                  <th className="text-right py-3 px-4 text-text-muted text-xs uppercase tracking-widest font-medium">Net</th>
                  <th className="text-right py-3 px-4 text-text-muted text-xs uppercase tracking-widest font-medium">Income Δ</th>
                  <th className="text-right py-3 px-4 text-text-muted text-xs uppercase tracking-widest font-medium">Spending Δ</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrends.map((month) => (
                  <tr key={month.month} className="border-b border-border-subtle hover:bg-surface-2 transition-colors">
                    <td className="py-3 px-4 text-text-primary text-sm font-medium">{month.monthNameFull}</td>
                    <td className="py-3 px-4 text-right text-income-green font-medium tabular-nums">{formatCurrency(month.income)}</td>
                    <td className="py-3 px-4 text-right text-spending-red font-medium tabular-nums">{formatCurrency(month.spending)}</td>
                    <td className={`py-3 px-4 text-right font-medium tabular-nums ${month.profit >= 0 ? 'text-income-green' : 'text-spending-red'}`}>
                      {month.profit >= 0 ? '+' : ''}{formatCurrency(month.profit)}
                    </td>
                    <td className={`py-3 px-4 text-right text-xs tabular-nums ${month.incomeChange === 0 ? 'text-text-muted' : month.incomeChange > 0 ? 'text-income-green' : 'text-spending-red'}`}>
                      {month.incomeChange !== 0 && (month.incomeChange >= 0 ? '+' : '')}
                      {month.incomeChange !== 0 ? `${month.incomeChange.toFixed(1)}%` : '-'}
                    </td>
                    <td className={`py-3 px-4 text-right text-xs tabular-nums ${month.spendingChange === 0 ? 'text-text-muted' : month.spendingChange > 0 ? 'text-spending-red' : 'text-income-green'}`}>
                      {month.spendingChange !== 0 && (month.spendingChange >= 0 ? '+' : '')}
                      {month.spendingChange !== 0 ? `${month.spendingChange.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Averages and Projections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-6">
            <h2 className="text-text-muted text-xs uppercase tracking-widest font-medium mb-4">Averages</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-text-muted text-xs uppercase tracking-widest font-medium mb-2">Monthly</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary text-sm">Income:</span>
                    <span className="font-semibold text-income-green tabular-nums">{formatCurrency(averages.monthlyIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary text-sm">Spending:</span>
                    <span className="font-semibold text-spending-red tabular-nums">{formatCurrency(averages.monthlySpending)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary text-sm">Net:</span>
                    <span className={`font-semibold tabular-nums ${averages.monthlyProfit >= 0 ? 'text-income-green' : 'text-spending-red'}`}>
                      {averages.monthlyProfit >= 0 ? '+' : ''}{formatCurrency(averages.monthlyProfit)}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-text-muted text-xs uppercase tracking-widest font-medium mb-2">Daily</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary text-sm">Income:</span>
                    <span className="font-semibold text-income-green tabular-nums">{formatCurrency(averages.dailyIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary text-sm">Spending:</span>
                    <span className="font-semibold text-spending-red tabular-nums">{formatCurrency(averages.dailySpending)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {projections && (
            <div className="bg-surface-1 border border-border-subtle rounded-xl p-6">
              <h2 className="text-text-muted text-xs uppercase tracking-widest font-medium mb-4">Year-End Projections</h2>
              <p className="text-text-muted text-sm mb-4">Based on current year averages</p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary text-sm">Projected Income:</span>
                  <span className="font-semibold text-income-green tabular-nums">{formatCurrency(projections.projectedIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary text-sm">Projected Spending:</span>
                  <span className="font-semibold text-spending-red tabular-nums">{formatCurrency(projections.projectedSpending)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border-subtle">
                  <span className="text-text-primary font-semibold text-sm">Projected Net:</span>
                  <span className={`font-semibold text-lg tabular-nums ${projections.projectedProfit >= 0 ? 'text-income-green' : 'text-spending-red'}`}>
                    {projections.projectedProfit >= 0 ? '+' : ''}{formatCurrency(projections.projectedProfit)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Spending Categories */}
        {topSpendingCategories.length > 0 && (
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 mb-8">
            <h2 className="text-text-primary text-xl font-semibold mb-6">Top Spending Categories</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSpendingCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                <XAxis type="number" tick={{ fill: CHART_TICK_FILL }} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fill: CHART_TICK_FILL, fontSize: 12 }} />
                <Tooltip formatter={(value: number | undefined) => formatCurrency(value ?? 0)} contentStyle={TOOLTIP_STYLE.contentStyle} />
                <Bar dataKey="value" fill="#FF5A5A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Income Sources */}
        {topIncomeSources.length > 0 && (
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 mb-8">
            <h2 className="text-text-primary text-xl font-semibold mb-6">Top Income Sources</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topIncomeSources} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                <XAxis type="number" tick={{ fill: CHART_TICK_FILL }} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fill: CHART_TICK_FILL, fontSize: 12 }} />
                <Tooltip formatter={(value: number | undefined) => formatCurrency(value ?? 0)} contentStyle={TOOLTIP_STYLE.contentStyle} />
                <Bar dataKey="value" fill="#34C98A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recurring vs One-Time */}
        {recurringVsOneTimeData.length > 0 && (
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 mb-8">
            <h2 className="text-text-muted text-xs uppercase tracking-widest font-medium mb-6">Recurring vs One-Time Transactions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="pr-4">
                <h3 className="text-text-muted text-xs uppercase tracking-widest font-medium mb-4">Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-secondary text-sm">Recurring Income:</span>
                    <span className="font-semibold text-income-green tabular-nums">{formatCurrency(transactionAnalysis.recurringIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary text-sm">One-Time Income:</span>
                    <span className="font-semibold text-income-green tabular-nums">{formatCurrency(transactionAnalysis.oneTimeIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary text-sm">Recurring Spending:</span>
                    <span className="font-semibold text-spending-red tabular-nums">{formatCurrency(transactionAnalysis.recurringSpending)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary text-sm">One-Time Spending:</span>
                    <span className="font-semibold text-spending-red tabular-nums">{formatCurrency(transactionAnalysis.oneTimeSpending)}</span>
                  </div>
                </div>
              </div>
              <div className="pl-4 overflow-hidden">
                <h3 className="text-text-muted text-xs uppercase tracking-widest font-medium mb-4">Distribution</h3>
                <div className="w-full" style={{ minHeight: '250px' }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <Pie
                        data={recurringVsOneTimeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {recurringVsOneTimeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={RECURRING_PIE_COLORS[entry.name] ?? '#8B95B0'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | undefined) => formatCurrency(value ?? 0)} contentStyle={TOOLTIP_STYLE.contentStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reporting;

