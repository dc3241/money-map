import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';

export const formatDateKey = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const getMonthGrid = (date: Date): Date[] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
};

export const getWeekGrid = (date: Date): Date[] => {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
  
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
};

export const getWeekRange = (date: Date): { start: Date; end: Date } => {
  return {
    start: startOfWeek(date, { weekStartsOn: 0 }),
    end: endOfWeek(date, { weekStartsOn: 0 }),
  };
};

export const getMonthRange = (date: Date): { start: Date; end: Date } => {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
};

export const addMonth = (date: Date): Date => {
  return addMonths(date, 1);
};

export const subtractMonth = (date: Date): Date => {
  return subMonths(date, 1);
};

export const addWeek = (date: Date): Date => {
  return addWeeks(date, 1);
};

export const subtractWeek = (date: Date): Date => {
  return subWeeks(date, 1);
};

