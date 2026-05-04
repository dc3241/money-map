import { useCallback, useEffect, useMemo, useState } from 'react';
import { Joyride, EVENTS, STATUS, type EventData } from 'react-joyride';
import { usePlaidActuals } from '../../context/PlaidActualsContext';
import { useMediaMdUp } from '../../hooks/useMediaMdUp';
import { getTourSteps } from '../../tour/tourConfig';
import type { TourViewKey } from '../../tour/tourStorage';
import { setTourDismissedForView } from '../../tour/tourStorage';

type GuidedTourProps = {
  userId: string | null | undefined;
  currentView: TourViewKey;
  run: boolean;
  onRunChange: (run: boolean) => void;
};

export default function GuidedTour({ userId, currentView, run, onRunChange }: GuidedTourProps) {
  const mdUp = useMediaMdUp();
  const isMobile = !mdUp;
  const { usePlaidForActuals } = usePlaidActuals();
  const recurringMode = usePlaidForActuals ? 'plaid' : 'manual';

  const steps = useMemo(
    () =>
      getTourSteps(currentView, isMobile, currentView === 'recurring' ? recurringMode : 'manual'),
    [currentView, isMobile, recurringMode]
  );

  const markDone = useCallback(() => {
    setTourDismissedForView(userId, currentView);
    onRunChange(false);
  }, [userId, currentView, onRunChange]);

  const handleEvent = useCallback(
    (data: EventData) => {
      if (data.type === EVENTS.TOUR_END && (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED)) {
        markDone();
      }
    },
    [markDone]
  );

  const [joyKey, setJoyKey] = useState(0);
  useEffect(() => {
    setJoyKey((k) => k + 1);
  }, [currentView, isMobile, recurringMode]);

  if (steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      key={joyKey}
      run={run}
      steps={steps}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        showProgress: true,
        skipBeacon: true,
        scrollOffset: 120,
        zIndex: 10060,
        overlayColor: 'rgba(15, 23, 42, 0.78)',
        primaryColor: '#10b981',
        backgroundColor: '#1e293b',
        textColor: '#f1f5f9',
        arrowColor: '#1e293b',
        buttons: ['back', 'skip', 'primary'],
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        nextWithProgress: 'Next ({current} of {total})',
        skip: 'Skip tour',
      }}
      styles={{
        tooltip: {
          borderRadius: 14,
          padding: 16,
        },
        tooltipTitle: {
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 8,
        },
        tooltipContent: {
          fontSize: 14,
          lineHeight: 1.55,
          padding: '4px 0',
        },
        buttonPrimary: {
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          outline: 'none',
        },
        buttonBack: {
          borderRadius: 10,
          color: '#94a3b8',
          fontSize: 13,
        },
        buttonSkip: {
          color: '#94a3b8',
          fontSize: 13,
        },
      }}
    />
  );
}
