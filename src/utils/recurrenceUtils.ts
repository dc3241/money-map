import { addDays, addWeeks, addMonths, addYears, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, isBefore, isAfter } from 'date-fns';
import type { RecurrencePattern } from '../types';

/**
 * Get the next occurrence date for a recurrence pattern
 */
export function getNextOccurrence(pattern: RecurrencePattern, fromDate: Date = new Date(), startDate?: string, endDate?: string): Date | null {
  const start = startDate ? parseISO(startDate) : fromDate;
  const end = endDate ? parseISO(endDate) : null;
  
  // Check if we're past the end date
  if (end && isBefore(fromDate, end) === false) {
    return null;
  }

  // If start date is in the future, return that
  if (start && isAfter(start, fromDate)) {
    return getFirstOccurrenceAfter(pattern, start, fromDate, end);
  }

  return getFirstOccurrenceAfter(pattern, fromDate, fromDate, end);
}

function getFirstOccurrenceAfter(pattern: RecurrencePattern, searchFrom: Date, _fromDate: Date, endDate: Date | null): Date | null {
  if (endDate && isAfter(searchFrom, endDate)) {
    return null;
  }

  switch (pattern.type) {
    case 'daily':
      return addDays(searchFrom, pattern.interval || 1);
    
    case 'weekly':
      if (pattern.dayType === 'dayOfWeek' && pattern.dayValue !== undefined) {
        const currentDay = getDay(searchFrom);
        let daysUntil = pattern.dayValue - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        
        // If interval is set, add weeks
        const weeksToAdd = pattern.interval ? (pattern.interval - 1) * 7 : 0;
        const nextDate = addDays(searchFrom, daysUntil + weeksToAdd);
        
        if (endDate && isAfter(nextDate, endDate)) return null;
        return nextDate;
      }
      return addWeeks(searchFrom, pattern.interval || 1);
    
    case 'biweekly':
      return addWeeks(searchFrom, 2);
    
    case 'monthly':
      if (pattern.dayType === 'dayOfMonth' && pattern.dayValue !== undefined) {
        let nextDate = new Date(searchFrom.getFullYear(), searchFrom.getMonth(), pattern.dayValue);
        
        // If we've passed this day this month, go to next month
        if (nextDate <= searchFrom) {
          nextDate = addMonths(nextDate, 1);
        }
        
        // Handle last day of month case (dayValue === -1 means last day)
        if (pattern.dayValue === -1) {
          nextDate = endOfMonth(nextDate);
        } else {
          const lastDay = endOfMonth(nextDate).getDate();
          if (pattern.dayValue > lastDay) {
            nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), lastDay);
          }
        }
        
        if (endDate && isAfter(nextDate, endDate)) return null;
        return nextDate;
      } else if (pattern.dayType === 'lastDayOfMonth') {
        let nextDate = endOfMonth(searchFrom);
        if (nextDate <= searchFrom) {
          nextDate = endOfMonth(addMonths(searchFrom, 1));
        }
        if (endDate && isAfter(nextDate, endDate)) return null;
        return nextDate;
      }
      return addMonths(searchFrom, pattern.interval || 1);
    
    case 'quarterly':
      return addMonths(searchFrom, 3);
    
    case 'semiannual':
      return addMonths(searchFrom, 6);
    
    case 'annual':
      return addYears(searchFrom, 1);
    
    default:
      return null;
  }
}

/**
 * Get all occurrence dates for a month
 */
export function getOccurrencesInMonth(pattern: RecurrencePattern, year: number, month: number, startDate?: string, endDate?: string): Date[] {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const start = startDate ? parseISO(startDate) : null;
  const end = endDate ? parseISO(endDate) : null;

  // If the pattern has ended before this month, return empty
  if (end && isBefore(monthStart, end) === false) {
    return [];
  }

  // If the pattern hasn't started yet, return empty
  if (start && isAfter(monthEnd, start) === false) {
    return [];
  }

  const occurrences: Date[] = [];

  switch (pattern.type) {
    case 'daily':
      if (pattern.interval) {
        let current = monthStart;
        while (current <= monthEnd) {
          if ((!start || current >= start) && (!end || current <= end)) {
            occurrences.push(new Date(current));
          }
          current = addDays(current, pattern.interval);
        }
      } else {
        const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
        occurrences.push(...allDays.filter(d => (!start || d >= start) && (!end || d <= end)));
      }
      break;

    case 'weekly':
      if (pattern.dayType === 'dayOfWeek' && pattern.dayValue !== undefined) {
        const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
        allDays.forEach(day => {
          if (getDay(day) === pattern.dayValue) {
            if ((!start || day >= start) && (!end || day <= end)) {
              occurrences.push(day);
            }
          }
        });
      } else {
        // Weekly without specific day
        let current = monthStart;
        while (current <= monthEnd) {
          if ((!start || current >= start) && (!end || current <= end)) {
            occurrences.push(new Date(current));
          }
          current = addWeeks(current, pattern.interval || 1);
        }
      }
      break;

    case 'biweekly':
      let biweeklyCurrent = monthStart;
      while (biweeklyCurrent <= monthEnd) {
        if ((!start || biweeklyCurrent >= start) && (!end || biweeklyCurrent <= end)) {
          occurrences.push(new Date(biweeklyCurrent));
        }
        biweeklyCurrent = addWeeks(biweeklyCurrent, 2);
      }
      break;

    case 'monthly':
      if (pattern.dayType === 'dayOfMonth' && pattern.dayValue !== undefined) {
        let date: Date;
        // Handle last day of month (dayValue === -1)
        if (pattern.dayValue === -1) {
          date = monthEnd;
        } else {
          const lastDay = monthEnd.getDate();
          const targetDay = Math.min(pattern.dayValue, lastDay);
          date = new Date(year, month - 1, targetDay);
        }
        if ((!start || date >= start) && (!end || date <= end)) {
          occurrences.push(date);
        }
      } else if (pattern.dayType === 'lastDayOfMonth') {
        const date = monthEnd;
        if ((!start || date >= start) && (!end || date <= end)) {
          occurrences.push(date);
        }
      }
      break;

    case 'quarterly':
      // Only include if this month matches the quarter pattern
      const quarterMonth = (month - 1) % 3;
      if (quarterMonth === 0) {
        const lastDay = monthEnd.getDate();
        const targetDay = pattern.dayValue ? Math.min(pattern.dayValue, lastDay) : lastDay;
        const date = new Date(year, month - 1, targetDay);
        if ((!start || date >= start) && (!end || date <= end)) {
          occurrences.push(date);
        }
      }
      break;

    case 'semiannual':
      // Only include if this is one of the semiannual months (typically Jan/Jul or Jun/Dec)
      if (month === 1 || month === 7) {
        const lastDay = monthEnd.getDate();
        const targetDay = pattern.dayValue ? Math.min(pattern.dayValue, lastDay) : lastDay;
        const date = new Date(year, month - 1, targetDay);
        if ((!start || date >= start) && (!end || date <= end)) {
          occurrences.push(date);
        }
      }
      break;

    case 'annual':
      // Only include if this is the annual month
      if (pattern.dayValue && month === pattern.dayValue) {
        const date = new Date(year, month - 1, 1);
        if ((!start || date >= start) && (!end || date <= end)) {
          occurrences.push(date);
        }
      }
      break;
  }

  return occurrences;
}

/**
 * Format a recurrence pattern to human-readable text
 */
export function formatRecurrencePattern(pattern: RecurrencePattern): string {
  switch (pattern.type) {
    case 'daily':
      return pattern.interval && pattern.interval > 1 
        ? `Every ${pattern.interval} days`
        : 'Daily';
    
    case 'weekly':
      if (pattern.dayType === 'dayOfWeek' && pattern.dayValue !== undefined) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Every ${days[pattern.dayValue]}`;
      }
      return pattern.interval && pattern.interval > 1
        ? `Every ${pattern.interval} weeks`
        : 'Weekly';
    
    case 'biweekly':
      return 'Bi-weekly (every 2 weeks)';
    
    case 'monthly':
      if (pattern.dayType === 'dayOfMonth' && pattern.dayValue !== undefined) {
        if (pattern.dayValue === -1) {
          return 'Last day of each month';
        }
        return `Day ${pattern.dayValue} of each month`;
      } else if (pattern.dayType === 'lastDayOfMonth') {
        return 'Last day of each month';
      }
      return pattern.interval && pattern.interval > 1
        ? `Every ${pattern.interval} months`
        : 'Monthly';
    
    case 'quarterly':
      return 'Quarterly (every 3 months)';
    
    case 'semiannual':
      return 'Semi-annually (every 6 months)';
    
    case 'annual':
      return 'Annually (once per year)';
    
    default:
      return 'Unknown';
  }
}

/**
 * Migrate old format to new format
 */
export function migrateOldRecurringExpense(oldExpense: { id: string; amount: number; description: string; dayOfMonth: number }): {
  id: string;
  amount: number;
  description: string;
  category?: string;
  pattern: RecurrencePattern;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
} {
  return {
    ...oldExpense,
    category: undefined,
    pattern: {
      type: 'monthly',
      dayType: 'dayOfMonth',
      dayValue: oldExpense.dayOfMonth,
    },
    startDate: undefined,
    endDate: undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

export function migrateOldRecurringIncome(oldIncome: { id: string; amount: number; description: string; dayOfWeek: number }): {
  id: string;
  amount: number;
  description: string;
  category?: string;
  pattern: RecurrencePattern;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
} {
  return {
    ...oldIncome,
    category: undefined,
    pattern: {
      type: 'weekly',
      dayType: 'dayOfWeek',
      dayValue: oldIncome.dayOfWeek,
    },
    startDate: undefined,
    endDate: undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

