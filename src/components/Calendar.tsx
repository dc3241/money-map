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
      <div className="flex justify-between items-center py-1 md:py-2 px-2 md:px-4 border-b border-gray-200 bg-white overflow-x-hidden">
        <button
          onClick={handlePreviousPeriod}
          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-semibold transition-colors hidden md:block"
        >
          ← Prev
        </button>
        <div className="flex items-center gap-4 flex-1 justify-center md:justify-start min-w-0">
          <h2 className="text-lg font-bold text-gray-900 text-center md:text-left truncate">
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
      <div className="flex-1 overflow-hidden p-0 md:p-3 min-h-0 overflow-x-hidden min-w-0" ref={(el) => {
        // #region agent log
        if (el) {
          setTimeout(() => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            const logData = {location:'Calendar.tsx:138',message:'Calendar grid container dimensions',data:{containerWidth:rect.width,containerLeft:rect.left,containerRight:rect.right,containerOverflow:rect.right > window.innerWidth,viewportWidth:window.innerWidth,documentWidth:document.documentElement.clientWidth,computedWidth:style.width,minWidth:style.minWidth,paddingLeft:style.paddingLeft,paddingRight:style.paddingRight},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'};
            console.log('DEBUG:', logData);
            fetch('http://127.0.0.1:7242/ingest/9a5fadb7-ed49-408b-9ad5-e9f09e1cac2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch((e) => console.error('Log fetch failed:', e));
          }, 100);
        }
        // #endregion
      }}>
        {viewType === 'weekly' ? (
          <>
            {/* Mobile: Single Day View */}
            <div className="md:hidden h-full flex flex-col overflow-x-hidden w-full">
              <div className="flex items-center justify-center mb-2 md:mb-4 relative px-12 w-full max-w-full">
                <button
                  onClick={handlePreviousDay}
                  className="absolute left-0 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                  aria-label="Previous day"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="text-center flex-shrink-0">
                  <div className="text-sm font-semibold text-gray-600">
                    {format(mobileCurrentDay, 'EEEE')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(mobileCurrentDay, 'MMM d, yyyy')}
                  </div>
                </div>
                <button
                  onClick={handleNextDay}
                  className="absolute right-0 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                  aria-label="Next day"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 min-h-0 flex items-stretch overflow-x-hidden w-full min-w-0">
                <div className="w-full flex max-w-full min-w-0 h-full max-h-full px-2 py-1 md:px-0 md:py-0" ref={(el) => {
                  // #region agent log
                  if (el) {
                    setTimeout(() => {
                      const rect = el.getBoundingClientRect();
                      const style = window.getComputedStyle(el);
                      const logData = {location:'Calendar.tsx:183',message:'Card wrapper dimensions',data:{wrapperWidth:rect.width,wrapperLeft:rect.left,wrapperRight:rect.right,viewportWidth:window.innerWidth,documentWidth:document.documentElement.clientWidth,computedWidth:style.width,minWidth:style.minWidth,maxWidth:style.maxWidth,paddingLeft:style.paddingLeft,paddingRight:style.paddingRight,marginLeft:style.marginLeft,marginRight:style.marginRight,boxSizing:style.boxSizing},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'};
                      console.log('DEBUG:', logData);
                      fetch('http://127.0.0.1:7242/ingest/9a5fadb7-ed49-408b-9ad5-e9f09e1cac2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch((e) => console.error('Log fetch failed:', e));
                    }, 100);
                  }
                  // #endregion
                }}>
                  <WeekDayBox
                    date={mobileCurrentDay}
                    isToday={format(mobileCurrentDay, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')}
                    onClick={() => handleDayClick(mobileCurrentDay)}
                  />
                </div>
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

