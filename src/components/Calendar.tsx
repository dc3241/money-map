import React, { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { getWeekGrid, addWeek, subtractWeek } from '../utils/dateUtils';
import WeekDayBox from './WeekDayBox';
import DayEditModal from './DayEditModal';
import DayDetailReadOnly from './DayDetailReadOnly';
import { usePlaidActuals } from '../context/PlaidActualsContext';
import { PlaidRangeTransactionsProvider } from '../context/PlaidRangeTransactionsContext';

interface CalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ currentDate, onDateChange }) => {
  const { usePlaidForActuals } = usePlaidActuals();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Track the currently displayed day for mobile single-day view
  const [mobileCurrentDay, setMobileCurrentDay] = useState<Date>(currentDate);

  const weekGrid = getWeekGrid(currentDate);

  const handlePreviousPeriod = () => {
    onDateChange(subtractWeek(currentDate));
  };

  const handleNextPeriod = () => {
    onDateChange(addWeek(currentDate));
  };

  // Mobile day navigation
  const handlePreviousDay = () => {
    const newDay = subDays(mobileCurrentDay, 1);
    setMobileCurrentDay(newDay);
    onDateChange(newDay);
  };

  const handleNextDay = () => {
    const newDay = addDays(mobileCurrentDay, 1);
    setMobileCurrentDay(newDay);
    onDateChange(newDay);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCloseModal = () => {
    setSelectedDate(null);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Get today's date for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get week range for header display
  const weekRange = { start: weekGrid[0], end: weekGrid[6] };

  // Sync mobileCurrentDay when currentDate changes from outside (e.g., week navigation)
  React.useEffect(() => {
    const currentDayDate = format(mobileCurrentDay, 'yyyy-MM-dd');
    const isInCurrentWeek = weekGrid.some(day => format(day, 'yyyy-MM-dd') === currentDayDate);
    if (!isInCurrentWeek) {
      setMobileCurrentDay(weekGrid[0]);
    }
  }, [currentDate]);

  return (
    <PlaidRangeTransactionsProvider anchorDate={currentDate}>
    <div className="flex flex-col h-full bg-bg-app">
      {/* Calendar Header */}
      <div className="flex justify-between items-center py-1 md:py-2 px-2 md:px-4 border-b border-border-subtle bg-bg-app overflow-x-hidden">
        <button
          onClick={handlePreviousPeriod}
          className="px-3 py-1 bg-surface-2 border border-border-subtle text-text-secondary hover:border-border-hover hover:text-text-primary rounded-lg transition-all duration-200 text-sm font-semibold hidden md:block"
        >
          ← Prev
        </button>
        <div className="flex items-center gap-4 flex-1 justify-center md:justify-start min-w-0">
          <h2 className="text-lg font-semibold text-text-primary text-center md:text-left truncate">
            {format(weekRange.start, 'MMM d')} - {format(weekRange.end, 'MMM d, yyyy')}
          </h2>
        </div>
        <button
          onClick={handleNextPeriod}
          className="px-3 py-1 bg-surface-2 border border-border-subtle text-text-secondary hover:border-border-hover hover:text-text-primary rounded-lg transition-all duration-200 text-sm font-semibold hidden md:block"
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden p-0 md:p-3 min-h-0 overflow-x-hidden min-w-0 bg-bg-app">
        <>
            {/* Mobile: Single Day View */}
            <div className="md:hidden h-full flex flex-col overflow-x-hidden w-full">
              <div className="flex items-center justify-center mb-2 md:mb-4 relative px-12 w-full max-w-full">
                <button
                  onClick={handlePreviousDay}
                  className="absolute left-0 p-2 bg-surface-2 border border-border-subtle text-text-secondary hover:border-border-hover hover:text-text-primary rounded-lg transition-all duration-200"
                  aria-label="Previous day"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="text-center flex-shrink-0">
                  <div className="text-sm font-semibold text-text-secondary">
                    {format(mobileCurrentDay, 'EEEE')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(mobileCurrentDay, 'MMM d, yyyy')}
                  </div>
                </div>
                <button
                  onClick={handleNextDay}
                  className="absolute right-0 p-2 bg-surface-2 border border-border-subtle text-text-secondary hover:border-border-hover hover:text-text-primary rounded-lg transition-all duration-200"
                  aria-label="Next day"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 min-h-0 flex items-stretch overflow-x-hidden w-full min-w-0">
                <div className="w-full flex max-w-full min-w-0 h-full max-h-full px-2 py-1 md:px-0 md:py-0">
                  <WeekDayBox
                    date={mobileCurrentDay}
                    isToday={format(mobileCurrentDay, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')}
                    onClick={() => handleDayClick(mobileCurrentDay)}
                  />
                </div>
              </div>
            </div>

            {/* Desktop: Weekly View - 7 days in a row */}
            <div className="hidden md:grid grid-cols-7 gap-4 h-full overflow-hidden">
              {weekDays.map((day, index) => (
                <div key={day} className="flex flex-col min-h-0 h-full">
                  <div className="bg-bg-app py-2 px-1 text-center text-xs uppercase tracking-widest font-medium text-text-muted border-b border-border-subtle mb-2 flex-shrink-0">
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
          </>
      </div>

      {selectedDate && usePlaidForActuals && (
        <DayDetailReadOnly date={selectedDate} onClose={handleCloseModal} />
      )}
      {selectedDate && !usePlaidForActuals && (
        <DayEditModal date={selectedDate} onClose={handleCloseModal} />
      )}
    </div>
    </PlaidRangeTransactionsProvider>
  );
};

export default Calendar;

