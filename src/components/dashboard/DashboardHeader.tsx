import React from 'react';
import { format } from 'date-fns';
import { getWeekRange } from '../../utils/dateUtils';
import { addWeek, subtractWeek, addMonth, subtractMonth } from '../../utils/dateUtils';

export type ViewMode = 'week' | 'month';

interface DashboardHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
}) => {
  const weekRange = getWeekRange(currentDate);

  const handlePrev = () => {
    if (viewMode === 'week') {
      onDateChange(subtractWeek(currentDate));
    } else {
      onDateChange(subtractMonth(currentDate));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      onDateChange(addWeek(currentDate));
    } else {
      onDateChange(addMonth(currentDate));
    }
  };

  const dateLabel =
    viewMode === 'week'
      ? `${format(weekRange.start, 'MMM d')} - ${format(weekRange.end, 'MMM d, yyyy')}`
      : format(currentDate, 'MMMM yyyy');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-3 md:px-4 border-b border-border-subtle bg-bg-app flex-shrink-0">
      <h1 className="text-lg md:text-xl font-semibold text-text-primary truncate">
        Overview Dashboard
      </h1>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrev}
            className="px-3 py-1.5 bg-surface-2 border border-border-subtle text-text-secondary hover:border-border-hover hover:text-text-primary rounded-lg transition-all text-sm font-medium"
          >
            ← Prev
          </button>
          <div className="px-3 py-1.5 bg-surface-2 border border-border-subtle rounded-lg text-sm font-medium text-text-primary min-w-[180px] text-center">
            {dateLabel}
          </div>
          <button
            type="button"
            onClick={handleNext}
            className="px-3 py-1.5 bg-surface-2 border border-border-subtle text-text-secondary hover:border-border-hover hover:text-text-primary rounded-lg transition-all text-sm font-medium"
          >
            Next →
          </button>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-border-subtle bg-surface-2">
          <button
            type="button"
            onClick={() => onViewModeChange('week')}
            className={`px-3 py-1.5 text-sm font-medium transition-all ${
              viewMode === 'week'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('month')}
            className={`px-3 py-1.5 text-sm font-medium transition-all ${
              viewMode === 'month'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Month
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
