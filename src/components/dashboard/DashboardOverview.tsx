import React, { useState } from 'react';
import { getWeekRange } from '../../utils/dateUtils';
import { useBudgetStore } from '../../store/useBudgetStore';
import DashboardHeader, { type ViewMode } from './DashboardHeader';
import DashboardMetricCard from './DashboardMetricCard';
import DashboardWeeklyView from './DashboardWeeklyView';
import AccountsAtAGlance from './AccountsAtAGlance';
import BudgetSnapshot from './BudgetSnapshot';
import DebtPayoffSnapshot from './DebtPayoffSnapshot';
import RecentTransactions from './RecentTransactions';
import MonthSummaryCard from './MonthSummaryCard';

interface DashboardOverviewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange?: (view: 'accounts' | 'budgets' | 'debt') => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentDate,
  onDateChange,
  onViewChange,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  const getWeeklyTotal = useBudgetStore((state) => state.getWeeklyTotal);
  const getMonthlyTotal = useBudgetStore((state) => state.getMonthlyTotal);

  const weekRange = getWeekRange(currentDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const weekly = getWeeklyTotal(weekRange.start, weekRange.end);
  const monthly = getMonthlyTotal(year, month);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  const incomeSubtitle =
    viewMode === 'week'
      ? (weekly.income > 0 ? 'This week' : 'No income this week')
      : (monthly.income > 0 ? 'This month' : 'No income this month');
  const spendingSubtitle =
    viewMode === 'week'
      ? 'This week'
      : 'This month';

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-bg-app">
      <DashboardHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onDateChange={onDateChange}
        onViewModeChange={setViewMode}
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-3 md:p-4 pb-20 md:pb-4">
        {/* Top row: 3 metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4">
          <DashboardMetricCard
            title={viewMode === 'week' ? 'Weekly income' : 'Monthly income'}
            value={viewMode === 'week' ? `+${formatCurrency(weekly.income)}` : `+${formatCurrency(monthly.income)}`}
            subtitle={incomeSubtitle}
            variant="income"
          />
          <DashboardMetricCard
            title={viewMode === 'week' ? 'Weekly spending' : 'Monthly spending'}
            value={formatCurrency(viewMode === 'week' ? weekly.spending : monthly.spending)}
            subtitle={spendingSubtitle}
            variant="spending"
          />
          <DashboardMetricCard
            title={viewMode === 'week' ? 'Net this week' : 'Net this month'}
            value={
              viewMode === 'week'
                ? (weekly.profit >= 0 ? '+' : '') + formatCurrency(weekly.profit)
                : (monthly.profit >= 0 ? '+' : '') + formatCurrency(monthly.profit)
            }
            variant="net"
            positive={viewMode === 'week' ? weekly.profit > 0 : monthly.profit > 0}
          />
        </div>

        {/* Main content: week grid or month summary + sidebar cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Left: Weekly view (week mode) or Month summary (month mode) */}
          <div className="lg:col-span-2 min-h-[280px] md:min-h-[320px]">
            {viewMode === 'week' ? (
              <DashboardWeeklyView currentDate={currentDate} onDateChange={onDateChange} />
            ) : (
              <MonthSummaryCard year={year} month={month} />
            )}
          </div>

          {/* Right: Accounts, Budget, Debt */}
          <div className="flex flex-col gap-4">
            <AccountsAtAGlance onViewAccounts={onViewChange ? () => onViewChange('accounts') : undefined} />
            <BudgetSnapshot year={year} month={month} onViewBudgets={onViewChange ? () => onViewChange('budgets') : undefined} />
            <DebtPayoffSnapshot year={year} month={month} onViewDebt={onViewChange ? () => onViewChange('debt') : undefined} />
          </div>
        </div>

        {/* Bottom: Recent transactions + Monthly summary (when in week view) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="min-h-[200px]">
            <RecentTransactions />
          </div>
          {viewMode === 'week' && (
            <div>
              <MonthSummaryCard year={year} month={month} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
