const PREFIX = 'mm_guided_tour_v1';

export type TourViewKey =
  | 'dashboard'
  | 'recurring'
  | 'reporting'
  | 'accounts'
  | 'budgets'
  | 'goals'
  | 'debt'
  | 'profile';

export function tourStorageKey(userId: string, view: TourViewKey): string {
  return `${PREFIX}_${userId}_${view}`;
}

export function isTourDismissedForView(userId: string | null | undefined, view: TourViewKey): boolean {
  if (!userId) return true;
  return localStorage.getItem(tourStorageKey(userId, view)) === '1';
}

export function setTourDismissedForView(userId: string | null | undefined, view: TourViewKey): void {
  if (!userId) return;
  localStorage.setItem(tourStorageKey(userId, view), '1');
}
