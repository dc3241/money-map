import { useEffect, useState } from 'react';

/** True when viewport is md breakpoint or wider (Tailwind md: 768px). */
export function useMediaMdUp(): boolean {
  const [mdUp, setMdUp] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = () => setMdUp(mq.matches);
    mq.addEventListener('change', handler);
    setMdUp(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return mdUp;
}
