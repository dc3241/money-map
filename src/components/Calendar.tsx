import React, { useState } from 'react';
import { format } from 'date-fns';
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

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Calendar Header */}
      <div className="flex justify-between items-center py-2 px-4 border-b border-gray-200 bg-white">
        <button
          onClick={handlePreviousPeriod}
          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-semibold transition-colors"
        >
          ← Prev
        </button>
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-gray-900">
            {viewType === 'weekly' 
              ? `${format(weekRange!.start, 'MMM d')} - ${format(weekRange!.end, 'MMM d, yyyy')}`
              : format(currentDate, 'MMMM yyyy')
            }
          </h2>
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
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
          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-semibold transition-colors"
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden p-3 min-h-0">
        {viewType === 'weekly' ? (
          // Weekly View - 7 days in a row
          <div className="grid grid-cols-7 gap-4 h-full">
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

