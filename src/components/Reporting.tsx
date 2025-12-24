import React, { useMemo, useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { format } from 'date-fns';
import StatementImport from './StatementImport';
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
  const getMonthlyTotal = useBudgetStore((state) => state.getMonthlyTotal);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showImport, setShowImport] = useState(false);

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

    Object.keys(days).forEach((dateKey) => {
      const [year] = dateKey.split('-').map(Number);
      if (year === selectedYear) {
        const dayData = days[dateKey];
        if (dayData) {
          income += dayData.income.reduce((sum, t) => sum + t.amount, 0);
          spending += dayData.spending.reduce((sum, t) => sum + t.amount, 0);
        }
      }
    });

    return {
      income,
      spending,
      profit: income - spending,
    };
  }, [days, selectedYear]);

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
    const monthsWithData = monthlyBreakdown.filter(m => m.income > 0 || m.spending > 0).length || 1;
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

  // Chart colors
  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];

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
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {showImport ? 'Hide Import' : 'Import Transactions'}
            </button>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Import Section */}
        {showImport && (
          <div className="mb-8">
            <StatementImport />
          </div>
        )}

        {/* Annual Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-emerald-500">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Annual Income</h3>
            <p className="text-3xl font-bold text-emerald-600">{formatCurrency(annualTotals.income)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-rose-500">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Annual Spending</h3>
            <p className="text-3xl font-bold text-rose-600">{formatCurrency(annualTotals.spending)}</p>
          </div>
          <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${annualTotals.profit >= 0 ? 'border-emerald-500' : 'border-rose-500'}`}>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Net Profit</h3>
            <p className={`text-3xl font-bold ${annualTotals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {annualTotals.profit >= 0 ? '+' : ''}{formatCurrency(annualTotals.profit)}
            </p>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Savings Rate</h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div
                  className={`h-6 rounded-full flex items-center justify-end pr-2 ${savingsRate >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(Math.abs(savingsRate), 100)}%` }}
                >
                  {Math.abs(savingsRate) > 5 && (
                    <span className="text-white text-sm font-semibold">{savingsRate.toFixed(1)}%</span>
                  )}
                </div>
              </div>
            </div>
            <span className={`text-2xl font-bold min-w-[80px] text-right ${savingsRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Monthly Trends Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Monthly Income & Spending Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Spending" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="Net" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Breakdown Bar Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Monthly Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="Income" fill="#10b981" />
              <Bar dataKey="Spending" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Monthly Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Income</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Spending</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Net</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Income Δ</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Spending Δ</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrends.map((month) => (
                  <tr key={month.month} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{month.monthNameFull}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">{formatCurrency(month.income)}</td>
                    <td className="py-3 px-4 text-right text-rose-600 font-medium">{formatCurrency(month.spending)}</td>
                    <td className={`py-3 px-4 text-right font-medium ${month.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {month.profit >= 0 ? '+' : ''}{formatCurrency(month.profit)}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${month.incomeChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {month.incomeChange !== 0 && (month.incomeChange >= 0 ? '+' : '')}
                      {month.incomeChange !== 0 ? `${month.incomeChange.toFixed(1)}%` : '-'}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${month.spendingChange >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
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
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Averages</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Monthly</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Income:</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(averages.monthlyIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Spending:</span>
                    <span className="font-semibold text-rose-600">{formatCurrency(averages.monthlySpending)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net:</span>
                    <span className={`font-semibold ${averages.monthlyProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {averages.monthlyProfit >= 0 ? '+' : ''}{formatCurrency(averages.monthlyProfit)}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Daily</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Income:</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(averages.dailyIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Spending:</span>
                    <span className="font-semibold text-rose-600">{formatCurrency(averages.dailySpending)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {projections && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Year-End Projections</h2>
              <p className="text-sm text-gray-600 mb-4">Based on current year averages</p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Projected Income:</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(projections.projectedIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Projected Spending:</span>
                  <span className="font-semibold text-rose-600">{formatCurrency(projections.projectedSpending)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-900 font-semibold">Projected Net:</span>
                  <span className={`font-bold text-lg ${projections.projectedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {projections.projectedProfit >= 0 ? '+' : ''}{formatCurrency(projections.projectedProfit)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Spending Categories */}
        {topSpendingCategories.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Top Spending Categories</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSpendingCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Income Sources */}
        {topIncomeSources.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Top Income Sources</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topIncomeSources} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recurring vs One-Time */}
        {recurringVsOneTimeData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recurring vs One-Time Transactions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="pr-4">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recurring Income:</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(transactionAnalysis.recurringIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">One-Time Income:</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(transactionAnalysis.oneTimeIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recurring Spending:</span>
                    <span className="font-semibold text-rose-600">{formatCurrency(transactionAnalysis.recurringSpending)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">One-Time Spending:</span>
                    <span className="font-semibold text-rose-600">{formatCurrency(transactionAnalysis.oneTimeSpending)}</span>
                  </div>
                </div>
              </div>
              <div className="pl-4 overflow-hidden">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Distribution</h3>
                <div className="w-full" style={{ minHeight: '250px' }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <Pie
                        data={recurringVsOneTimeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {recurringVsOneTimeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
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

