import React, { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { getMonthGrid, addMonth, subtractMonth, getWeekGrid, addWeek, subtractWeek } from '../utils/dateUtils';
import DayBox from './DayBox';
import WeekDayBox from './WeekDayBox';
import DayEditModal from './DayEditModal';

interface CalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewType: 'weekly' | 'monthly';
  onViewTypeChange: (viewType: 'weekly' | 'monthly') => void;
}

const Calendar: React.FC<CalendarProps> = ({ currentDate, onDateChange, viewType, onViewTypeChange }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Track the currently displayed day for mobile single-day view
  const [mobileCurrentDay, setMobileCurrentDay] = useState<Date>(currentDate);

  const monthGrid = getMonthGrid(currentDate);
  const weekGrid = getWeekGrid(currentDate);
  const currentMonth = currentDate.getMonth();
  
  // Calculate number of weeks dynamically for monthly view
  const numberOfWeeks = Math.ceil(monthGrid.length / 7);

  const handlePreviousPeriod = () => {
    if (viewType === 'weekly') {
      onDateChange(subtractWeek(currentDate));
    } else {
      onDateChange(subtractMonth(currentDate));
    }
  };

  const handleNextPeriod = () => {
    if (viewType === 'weekly') {
      onDateChange(addWeek(currentDate));
    } else {
      onDateChange(addMonth(currentDate));
    }
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
  const weekRange = viewType === 'weekly' 
    ? { start: weekGrid[0], end: weekGrid[6] }
    : null;

  // Sync mobileCurrentDay when currentDate changes from outside (e.g., week navigation)
  React.useEffect(() => {
    if (viewType === 'weekly') {
      // Find the day in the current week that matches mobileCurrentDay's date
      const currentDayDate = format(mobileCurrentDay, 'yyyy-MM-dd');
      const isInCurrentWeek = weekGrid.some(day => format(day, 'yyyy-MM-dd') === currentDayDate);
      if (!isInCurrentWeek) {
        // If the mobile day is not in the current week, reset to first day of week
        setMobileCurrentDay(weekGrid[0]);
      }
    }
  }, [currentDate, viewType]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Calendar Header */}
      <div className="flex justify-between items-center py-2 px-4 border-b border-gray-200 bg-white">
        <button
          onClick={handlePreviousPeriod}
          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-semibold transition-colors hidden md:block"
        >
          ← Prev
        </button>
        <div className="flex items-center gap-4 flex-1 justify-center md:justify-start">
          <h2 className="text-lg font-bold text-gray-900">
            {viewType === 'weekly' 
              ? `${format(weekRange!.start, 'MMM d')} - ${format(weekRange!.end, 'MMM d, yyyy')}`
              : format(currentDate, 'MMMM yyyy')
            }
          </h2>
          {/* View Toggle - Hidden on mobile */}
          <div className="hidden md:flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onViewTypeChange('weekly')}
              className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                viewType === 'weekly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => onViewTypeChange('monthly')}
              className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                viewType === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
          </div>
        </div>
        <button
          onClick={handleNextPeriod}
          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-semibold transition-colors hidden md:block"
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden p-3 min-h-0">
        {viewType === 'weekly' ? (
          <>
            {/* Mobile: Single Day View */}
            <div className="md:hidden h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePreviousDay}
                  className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                  aria-label="Previous day"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-600">
                    {format(mobileCurrentDay, 'EEEE')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(mobileCurrentDay, 'MMM d, yyyy')}
                  </div>
                </div>
                <button
                  onClick={handleNextDay}
                  className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                  aria-label="Next day"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Desktop: Weekly View - 7 days in a row */}
            <div className="hidden md:grid grid-cols-7 gap-4 h-full">
              {weekDays.map((day, index) => (
                <div key={day} className="flex flex-col">
                  <div className="bg-white py-2 px-1 text-center text-xs font-semibold text-gray-600 border-b border-gray-200 mb-2">
                    {day}
                  </div>
                  <WeekDayBox
                    date={weekGrid[index]}
                    isToday={weekGrid[index].getTime() === today.getTime()}
                    onClick={() => handleDayClick(weekGrid[index])}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          // Monthly View - existing grid layout
          <div 
            className="grid grid-cols-7 gap-3 h-full"
            style={{
              gridTemplateRows: `auto repeat(${numberOfWeeks}, 1fr)`
            }}
          >
            {/* Week Day Headers */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="bg-white py-2 px-1 text-center text-xs font-semibold text-gray-600 border-b border-gray-200"
              >
                {day}
              </div>
            ))}

            {/* Day Boxes */}
            {monthGrid.map((date) => {
              const isCurrentMonth = date.getMonth() === currentMonth;
              const dateOnly = new Date(date);
              dateOnly.setHours(0, 0, 0, 0);
              const isToday = dateOnly.getTime() === today.getTime();
              
              return (
                <DayBox
                  key={date.toISOString()}
                  date={date}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday}
                  onClick={() => handleDayClick(date)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {selectedDate && (
        <DayEditModal date={selectedDate} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default Calendar;

