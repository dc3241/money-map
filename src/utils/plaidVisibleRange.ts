import {
  format,
  subDays,
  addDays,
  startOfMonth,
  endOfMonth,
  min as dfMin,
  max as dfMax,
} from "date-fns";
import { getWeekRange } from "./dateUtils";

/**
 * Dashboard / calendar anchor: visible week (Sun–Sat) ± 7 days ∪ month of anchor.
 * Ensures week boxes and month summary cards share one consistent Plaid slice.
 */
export function dashboardPlaidRange(anchor: Date): { start: string; end: string } {
  const { start: weekStart, end: weekEnd } = getWeekRange(anchor);
  const bufStart = subDays(weekStart, 7);
  const bufEnd = addDays(weekEnd, 7);
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const start = dfMin([bufStart, monthStart]);
  const end = dfMax([bufEnd, monthEnd]);
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

export function calendarMonthPlaidRange(anchor: Date): { start: string; end: string } {
  return {
    start: format(startOfMonth(anchor), "yyyy-MM-dd"),
    end: format(endOfMonth(anchor), "yyyy-MM-dd"),
  };
}
