import React, { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { getWeekGrid } from '../../utils/dateUtils';
import WeekDayBox from '../WeekDayBox';
import DayEditModal from '../DayEditModal';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DashboardWeeklyViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

const DashboardWeeklyView: React.FC<DashboardWeeklyViewProps> = ({ currentDate, onDateChange }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [mobileCurrentDay, setMobileCurrentDay] = useState<Date>(currentDate);

  const weekGrid = getWeekGrid(currentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const currentDayStr = format(mobileCurrentDay, 'yyyy-MM-dd');
    const inWeek = weekGrid.some((d) => format(d, 'yyyy-MM-dd') === currentDayStr);
    if (!inWeek) {
      setMobileCurrentDay(weekGrid[0]);
    }
  }, [currentDate, weekGrid]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-app rounded-xl border border-border-subtle overflow-hidden">
      <div className="text-text-muted text-xs uppercase tracking-widest font-medium px-3 py-2 border-b border-border-subtle">
        Weekly view
      </div>
      <div className="flex-1 overflow-hidden p-2 md:p-3 min-h-0">
        {/* Mobile: single day */}
        <div className="md:hidden h-full flex flex-col">
          <div className="flex items-center justify-center gap-2 py-2">
            <button
              type="button"
              onClick={() => {
                const prev = subDays(mobileCurrentDay, 1);
                setMobileCurrentDay(prev);
                onDateChange(prev);
              }}
              className="p-2 bg-surface-2 border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary"
              aria-label="Previous day"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center min-w-[140px]">
              <div className="text-sm font-semibold text-text-primary">{format(mobileCurrentDay, 'EEEE')}</div>
              <div className="text-xs text-text-muted">{format(mobileCurrentDay, 'MMM d, yyyy')}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = addDays(mobileCurrentDay, 1);
                setMobileCurrentDay(next);
                onDateChange(next);
              }}
              className="p-2 bg-surface-2 border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary"
              aria-label="Next day"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <WeekDayBox
              date={mobileCurrentDay}
              isToday={format(mobileCurrentDay, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')}
              onClick={() => handleDayClick(mobileCurrentDay)}
            />
          </div>
        </div>
        {/* Desktop: 7 days */}
        <div className="hidden md:grid grid-cols-7 gap-2 md:gap-3 h-full">
          {weekDays.map((day, index) => (
            <div key={day} className="flex flex-col min-h-0">
              <div className="text-center text-xs uppercase tracking-widest font-medium text-text-muted py-1">
                {day}
              </div>
              <div className="flex-1 min-h-0">
                <WeekDayBox
                  date={weekGrid[index]}
                  isToday={weekGrid[index].getTime() === today.getTime()}
                  onClick={() => handleDayClick(weekGrid[index])}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedDate && (
        <DayEditModal date={selectedDate} onClose={() => setSelectedDate(null)} />
      )}
    </div>
  );
};

export default DashboardWeeklyView;
