import React from 'react';
import {
  format,
  startOfMonth,
  startOfWeek,
  addDays,
  subMonths,
  isSameMonth,
  isToday,
  endOfMonth,
} from 'date-fns';
import { useBudgetStore } from '../../store/useBudgetStore';
import { usePlaidActuals } from '../../context/PlaidActualsContext';
import { usePlaidTransactionsInRange } from '../../hooks/usePlaidTransactionsInRange';
import { plaidMonthlyTotal } from '../../utils/plaidAggregates';
import DayBox from '../DayBox';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

const DashboardMonthlyView: React.FC<Props> = ({ currentDate, onDateChange }) => {
  const getMonthlyTotal = useBudgetStore((state) => state.getMonthlyTotal);
  const { usePlaidForActuals } = usePlaidActuals();

  const currentMonthStart = startOfMonth(currentDate);
  const plaidRangeStart = format(startOfMonth(subMonths(currentMonthStart, 5)), 'yyyy-MM-dd');
  const plaidRangeEnd = format(endOfMonth(currentMonthStart), 'yyyy-MM-dd');
  const { transactions } = usePlaidTransactionsInRange(
    usePlaidForActuals ? plaidRangeStart : null,
    usePlaidForActuals ? plaidRangeEnd : null
  );

  const sixMonths: Date[] = [5, 4, 3, 2, 1, 0].map((offset) =>
    subMonths(currentMonthStart, offset)
  );

  return (
    <div className="flex flex-col gap-8 overflow-y-auto">
      {sixMonths.map((monthDate) => {
        const monthStart = startOfMonth(monthDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
        const calendarDays: Date[] = [];
        for (let i = 0; i < 42; i++) {
          calendarDays.push(addDays(calendarStart, i));
        }
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth() + 1;
        const monthTotals = usePlaidForActuals
          ? plaidMonthlyTotal(transactions, year, month)
          : getMonthlyTotal(year, month);

        return (
          <div
            key={format(monthDate, 'yyyy-MM')}
            className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <h3 className="text-text-primary font-semibold text-sm">
                {format(monthDate, 'MMMM yyyy')}
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted text-xs uppercase tracking-widest">Income</span>
                  <span className="text-income-green text-xs font-semibold tabular-nums">
                    {formatCurrency(monthTotals.income)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted text-xs uppercase tracking-widest">Spending</span>
                  <span className="text-spending-red text-xs font-semibold tabular-nums">
                    {formatCurrency(monthTotals.spending)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted text-xs uppercase tracking-widest">Net</span>
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      monthTotals.profit >= 0 ? 'text-income-green' : 'text-spending-red'
                    }`}
                  >
                    {monthTotals.profit >= 0 ? '+' : ''}
                    {formatCurrency(monthTotals.profit)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-border-subtle">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-text-muted text-xs uppercase tracking-widest font-medium"
                >
                  {day}
                </div>
              ))}
            </div>

            <div
              className="grid grid-cols-7 gap-1 p-2"
              style={{ gridTemplateRows: 'repeat(6, minmax(80px, 1fr))' }}
            >
              {calendarDays.map((date, i) => (
                <DayBox
                  key={i}
                  date={date}
                  isCurrentMonth={isSameMonth(date, monthDate)}
                  isToday={isToday(date)}
                  onClick={() => onDateChange(date)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardMonthlyView;
