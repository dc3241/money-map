import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";

/** Milliseconds of no activity before automatic sign-out (finance-style session). */
const DEFAULT_IDLE_MS = 30 * 60 * 1000;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

/**
 * Signs the user out after a period of inactivity while the dashboard is mounted.
 * Resets the timer on user interaction.
 */
export function useSessionInactivity(idleMs: number = DEFAULT_IDLE_MS) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void logout();
      }, idleMs);
    };

    resetTimer();

    const onActivity = () => resetTimer();
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity);
      }
    };
  }, [user, idleMs, logout]);
}
