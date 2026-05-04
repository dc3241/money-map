import { Link } from 'react-router-dom';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { useAuthStore } from '../store/useAuthStore';
import calendarDashboardImg from '../assets/screenshots/calendar-dashboard.png';
import reportsImg from '../assets/screenshots/reports.png';
import budgetsImg from '../assets/screenshots/budgets.png';
import goalsImg from '../assets/screenshots/goals.png';

const HOME_STYLES = `
@keyframes home-spotlight-sweep {
  0% { transform: translate3d(-38%, -2%, 0); opacity: 0; }
  12% { opacity: 0.24; }
  55% { opacity: 0.36; }
  88% { opacity: 0.2; }
  100% { transform: translate3d(124%, -4%, 0); opacity: 0; }
}
@keyframes home-noise-drift {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-8%, -6%, 0); }
}
@keyframes home-text-caret {
  0%, 50% { border-color: rgba(255, 255, 255, 0.7); }
  51%, 100% { border-color: transparent; }
}
@keyframes home-mesh {
  0%, 100% { opacity: 0.4; transform: scale(1) translate3d(0, 0, 0); }
  50% { opacity: 0.75; transform: scale(1.07) translate3d(2%, -2%, 0); }
}
@keyframes home-float {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -14px, 0); }
}
@keyframes home-scan {
  0% { transform: translate3d(-120%, 0, 0); opacity: 0; }
  15% { opacity: 0.65; }
  85% { opacity: 0.65; }
  100% { transform: translate3d(120%, 0, 0); opacity: 0; }
}
@keyframes home-cell-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.95; }
}
@keyframes home-shimmer {
  0% { background-position: 0% 50%; }
  100% { background-position: 220% 50%; }
}
@keyframes home-ring-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(79, 127, 255, 0.2), 0 12px 40px -16px rgba(0, 0, 0, 0.45); }
  50% { box-shadow: 0 0 32px 0 rgba(79, 127, 255, 0.28), 0 16px 48px -12px rgba(0, 0, 0, 0.5); }
}
@keyframes home-tips-border {
  0%, 100% { border-color: rgba(79, 127, 255, 0.28); }
  50% { border-color: rgba(79, 127, 255, 0.55); }
}
.home-reveal {
  opacity: 0;
  transform: translate3d(0, 14px, 0);
  transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}
.home-reveal-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}
.home-hero-bg {
  background:
    radial-gradient(75% 80% at 12% 12%, rgba(79, 127, 255, 0.24), transparent 66%),
    radial-gradient(70% 70% at 88% 84%, rgba(16, 185, 129, 0.16), transparent 72%),
    linear-gradient(180deg, rgba(7, 12, 24, 1) 0%, rgba(7, 11, 20, 1) 48%, rgba(5, 9, 17, 1) 100%);
}
.home-hero-noise {
  opacity: 0.12;
  mix-blend-mode: soft-light;
  animation: home-noise-drift 24s linear infinite;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.24) 0 1px, transparent 1.2px),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.16) 0 1px, transparent 1.2px);
  background-size: 4px 4px, 5px 5px;
}
.home-hero-spotlight {
  top: -28%;
  left: -38%;
  width: 68%;
  height: 165%;
  filter: blur(36px);
  transform: translate3d(-38%, -2%, 0);
  background: radial-gradient(
    closest-side,
    rgba(133, 177, 255, 0.45),
    rgba(133, 177, 255, 0) 72%
  );
  animation: home-spotlight-sweep 14s linear infinite;
}
.home-typing-text {
  border-right: 2px solid rgba(255, 255, 255, 0.7);
  animation: home-text-caret 0.95s step-end infinite;
}
.home-band {
  position: relative;
  overflow: hidden;
}
.home-band::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.home-band-cool {
  background:
    radial-gradient(120% 90% at 10% 0%, rgba(79, 127, 255, 0.16), transparent 60%),
    radial-gradient(90% 80% at 100% 100%, rgba(90, 190, 255, 0.1), transparent 65%),
    linear-gradient(180deg, rgba(10, 15, 29, 1), rgba(7, 11, 20, 1));
}
.home-band-cool::before {
  background: linear-gradient(to bottom, rgba(3, 6, 13, 0.22), rgba(3, 6, 13, 0.5));
}
.home-band-warm {
  background:
    radial-gradient(90% 75% at 0% 20%, rgba(255, 173, 90, 0.16), transparent 60%),
    radial-gradient(90% 70% at 100% 80%, rgba(79, 127, 255, 0.14), transparent 62%),
    linear-gradient(180deg, rgba(22, 14, 10, 1), rgba(13, 10, 15, 1));
}
.home-band-warm::before {
  background: linear-gradient(to bottom, rgba(8, 5, 4, 0.25), rgba(6, 6, 8, 0.6));
}
.home-band-dark {
  background:
    radial-gradient(95% 90% at 50% 0%, rgba(79, 127, 255, 0.12), transparent 55%),
    linear-gradient(180deg, rgba(8, 11, 20, 1), rgba(6, 9, 17, 1));
}
.home-band-dark::before {
  background: linear-gradient(to bottom, rgba(4, 6, 12, 0.3), rgba(4, 6, 12, 0.55));
}
.home-band-noise {
  position: absolute;
  inset: -16%;
  opacity: 0.09;
  mix-blend-mode: soft-light;
  animation: home-noise-drift 26s linear infinite;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.22) 0 1px, transparent 1.2px),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.14) 0 1px, transparent 1.2px);
  background-size: 4px 4px, 5px 5px;
}
.home-story-panel {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(11, 16, 28, 0.72);
  box-shadow: 0 12px 40px -20px rgba(0, 0, 0, 0.7);
  transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
}
.home-story-panel:hover {
  transform: translate3d(0, -2px, 0);
  border-color: rgba(79, 127, 255, 0.34);
  box-shadow: 0 20px 44px -20px rgba(26, 48, 89, 0.55);
}
.home-story-panel::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 55%;
  pointer-events: none;
  background: linear-gradient(to top, rgba(6, 9, 18, 0.72), transparent 62%);
}
.home-mesh-anim {
  animation: home-mesh 10s ease-in-out infinite;
}
.home-float-anim {
  animation: home-float 4s ease-in-out infinite;
}
.home-scan-line {
  animation: home-scan 3s ease-in-out infinite;
}
.home-grid-cell {
  animation: home-cell-pulse 2.6s ease-in-out infinite;
}
.home-hero-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(79, 127, 255, 0.14) 45%,
    rgba(79, 127, 255, 0.22) 50%,
    rgba(79, 127, 255, 0.14) 55%,
    transparent 100%
  );
  background-size: 220% 100%;
  animation: home-shimmer 4.5s linear infinite;
}
.home-mock-glow {
  animation: home-ring-pulse 3.5s ease-in-out infinite;
}
.home-tips-glow {
  animation: home-tips-border 3.8s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .home-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
  .home-mesh-anim,
  .home-float-anim,
  .home-scan-line,
  .home-grid-cell,
  .home-hero-shimmer,
  .home-hero-noise,
  .home-hero-spotlight,
  .home-typing-text,
  .home-band-noise,
  .home-mock-glow,
  .home-tips-glow {
    animation: none !important;
  }
  .home-mesh-anim { opacity: 0.5; }
  .home-grid-cell { opacity: 0.58; }
  .home-hero-shimmer { opacity: 0.55; }
  .home-mock-glow { box-shadow: 0 12px 40px -16px rgba(0, 0, 0, 0.4); }
}
`;

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`home-reveal ${visible ? 'home-reveal-visible' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="120" height="120" fill="#334155" rx="20" />
      <g transform="translate(30, 30)">
        <rect x="0" y="0" width="18" height="18" fill="rgba(16, 185, 129, 0.2)" rx="2" />
        <rect x="21" y="0" width="18" height="18" fill="#10B981" rx="2" />
        <rect x="42" y="0" width="18" height="18" fill="rgba(16, 185, 129, 0.2)" rx="2" />
        <rect x="0" y="21" width="18" height="18" fill="#10B981" rx="2" />
        <rect x="21" y="21" width="18" height="18" fill="rgba(16, 185, 129, 0.2)" rx="2" />
        <rect x="42" y="21" width="18" height="18" fill="#10B981" rx="2" />
        <rect x="0" y="42" width="18" height="18" fill="#10B981" rx="2" />
        <rect x="21" y="42" width="18" height="18" fill="rgba(16, 185, 129, 0.2)" rx="2" />
        <rect x="42" y="42" width="18" height="18" fill="#10B981" rx="2" />
      </g>
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconRecurring({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
}
function IconAccounts({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  );
}
function IconBudget({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M21.21 15.89A10 10 0 118 2.83" />
      <path d="M22 12A10 10 0 0012 2v10z" />
    </svg>
  );
}
function IconGoal({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IconDebt({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}
function IconReport({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 6-6" />
    </svg>
  );
}
function IconTips({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 00-7 7c0 5 7 9 7 9s7-4 7-9a7 7 0 00-7-7z" />
    </svg>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(media.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

function HeroPrompt() {
  const reducedMotion = usePrefersReducedMotion();
  const [promptIndex, setPromptIndex] = useState(0);
  const [text, setText] = useState(reducedMotion ? HERO_PROMPTS[0] : '');

  useEffect(() => {
    if (reducedMotion) {
      setText(HERO_PROMPTS[0]);
      return;
    }
    const phrase = HERO_PROMPTS[promptIndex];
    let current = 0;
    const typeTimer = setInterval(() => {
      current += 1;
      setText(phrase.slice(0, current));
      if (current >= phrase.length) {
        clearInterval(typeTimer);
        setTimeout(() => {
          setPromptIndex((prev) => (prev + 1) % HERO_PROMPTS.length);
        }, 1300);
      }
    }, 45);
    return () => clearInterval(typeTimer);
  }, [promptIndex, reducedMotion]);

  return (
    <Link
      to="/login"
      className="group mt-8 flex max-w-[42rem] items-center gap-3 rounded-full border border-white/15 bg-white/[0.06] p-1.5 pr-2 shadow-xl shadow-black/20 backdrop-blur-xl transition-colors duration-200 hover:border-accent/45 hover:bg-white/[0.09]"
      aria-label="Open app and start tracking"
    >
      <div className="flex-1 rounded-full px-5 py-3 text-left text-sm text-white/80 sm:text-base">
        <span className={`${reducedMotion ? '' : 'home-typing-text'} inline-block min-h-[1.4rem]`}>
          {text}
        </span>
      </div>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-accent text-white shadow-md shadow-accent/35 transition-transform duration-200 group-hover:translate-x-0.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 12h12M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}

const HERO_PROMPTS = [
  'Show what changed in my spending this month',
  'Build a budget from my transaction patterns',
  'Find repeat charges I can cut',
  'Review my money safely in one view',
] as const;

type InterfaceItem = {
  id: string;
  title: string;
  Icon: (props: { className?: string }) => ReactNode;
  summary: string;
  details: string;
};

const interfaceItems: InterfaceItem[] = [
  {
    id: 'calendar',
    title: 'Calendar',
    Icon: IconCalendar,
    summary: 'Weekly and monthly cash movement at a glance.',
    details:
      'Track inflow and outflow day by day, catch spending spikes early, and keep context without digging through statements.',
  },
  {
    id: 'recurring',
    title: 'Recurring',
    Icon: IconRecurring,
    summary: 'Recurring charges and income, clearly mapped.',
    details:
      'See repeating payments and deposits in one place so you can spot unnecessary subscriptions and plan around fixed commitments.',
  },
  {
    id: 'accounts',
    title: 'Accounts',
    Icon: IconAccounts,
    summary: 'All linked accounts in a single readable view.',
    details:
      'Monitor balances and activity across accounts without hopping between apps, so your full financial picture stays connected.',
  },
  {
    id: 'budgets',
    title: 'Budgets',
    Icon: IconBudget,
    summary: 'Targets vs. actuals with real transaction context.',
    details:
      'Set category budgets, track progress in real time, and adjust quickly when spending shifts during the month.',
  },
  {
    id: 'goals',
    title: 'Goals',
    Icon: IconGoal,
    summary: 'Progress tracking tied to your real cash flow.',
    details:
      'Set savings goals with clear milestones and measure progress using the same account and transaction data you already review.',
  },
  {
    id: 'debt',
    title: 'Debt',
    Icon: IconDebt,
    summary: 'Debt payoff visibility without spreadsheet overhead.',
    details:
      'Follow balances and payment direction in one map so you can prioritize payoff decisions with better context.',
  },
  {
    id: 'reporting',
    title: 'Reporting',
    Icon: IconReport,
    summary: 'Deeper trend and category analysis on demand.',
    details:
      'Review monthly and yearly patterns, compare categories, and understand where money is actually going before you make changes.',
  },
  {
    id: 'tips',
    title: 'Tips',
    Icon: IconTips,
    summary: 'Actionable suggestions based on your patterns.',
    details:
      'Get practical recommendations to reduce waste, improve surplus, and make smarter budgeting decisions from your actual activity.',
  },
];

function StoryPanel({
  image,
  imageAlt,
  title,
  body,
  tone,
}: {
  image: string;
  imageAlt: string;
  title: string;
  body: string;
  tone: 'warm' | 'cool' | 'neutral';
}) {
  const toneClass =
    tone === 'warm'
      ? 'from-amber-500/10 to-transparent'
      : tone === 'cool'
        ? 'from-sky-400/12 to-transparent'
        : 'from-accent/10 to-transparent';

  return (
    <div className="home-story-panel">
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${toneClass}`} aria-hidden />
      <div className="aspect-[16/10]">
        <ScreenshotImg src={image} alt={imageAlt} />
      </div>
      <div className="relative z-10 p-6">
        <h3 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
          {title}
        </h3>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-white/75">{body}</p>
      </div>
    </div>
  );
}

function BrowserFrame({
  title,
  children,
  caption,
  body,
}: {
  title: string;
  children: ReactNode;
  caption: string;
  body: string;
}) {
  return (
    <div className="group rounded-lg border border-border-subtle bg-surface-2 overflow-hidden transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-lg hover:shadow-accent/10">
      <div className="flex h-9 items-center gap-2 border-b border-border-subtle bg-surface-3 px-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-accent/50" />
          <span className="h-2 w-2 rounded-full bg-accent/30" />
          <span className="h-2 w-2 rounded-full bg-accent/45" />
        </span>
        <span className="ml-1 truncate text-xs text-text-secondary">{title}</span>
      </div>
      <div className="relative aspect-video bg-surface-3">{children}</div>
      <div className="border-t border-border-subtle p-4">
        <h3 className="text-sm font-semibold text-text-primary">{caption}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{body}</p>
      </div>
    </div>
  );
}

function ScreenshotImg({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const onError = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder');
    placeholder?.classList.remove('hidden');
  }, []);

  return (
    <>
      <img src={src} alt={alt} className="h-full w-full object-cover object-top" onError={onError} />
      <div className="image-placeholder hidden flex-col items-center justify-center p-8 text-center text-text-muted">
        <p className="text-xs">Screenshot unavailable</p>
      </div>
    </>
  );
}

export default function Home() {
  const { user } = useAuthStore();
  const reducedMotion = usePrefersReducedMotion();
  const [openInterfaceId, setOpenInterfaceId] = useState<string | null>(null);

  const toggleInterfaceItem = (id: string) => {
    setOpenInterfaceId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <style>{HOME_STYLES}</style>
      <div className="min-h-screen bg-bg-app text-text-primary">
        <nav className="sticky top-0 z-50 border-b border-border-subtle bg-surface-1/85 backdrop-blur-md transition-colors duration-200">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <LogoMark size={32} />
              <span className="font-display text-lg font-semibold tracking-tight">Money Maps</span>
            </Link>
            {user ? (
              <Link
                to="/dashboard"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity duration-200 hover:opacity-90"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity duration-200 hover:opacity-90"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>

        <section className="relative overflow-hidden border-b border-border-subtle">
          <div className="home-hero-bg absolute inset-0" aria-hidden />
          <div className="home-hero-noise absolute -inset-[18%]" aria-hidden />
          <div className="home-hero-spotlight pointer-events-none absolute" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/55 to-black/72" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <Reveal className="mx-auto max-w-4xl text-center">
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium uppercase tracking-wide text-white/80">
                <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-white">
                  Free
                </span>
                <span className="text-accent/70">·</span>
                <span>Fast insights · secure bank connection</span>
              </div>
              <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-7xl">
                See your money clearly, faster.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
                Track spending, budgets, and trends in one place with a layout built for quick reads
                and deeper decisions when you need them.
              </p>
              <p className="mx-auto mt-4 max-w-xl text-sm text-white/70 sm:text-base">
                Connections are encrypted and secure. Your banking credentials are never shown or
                shared in Money Maps.
              </p>
              {!user && <HeroPrompt />}
              <ul className="mx-auto mt-9 grid max-w-3xl gap-3 text-sm leading-snug text-white/80 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-3">
                <li className="flex gap-2.5">
                  <span className="shrink-0 font-medium text-accent" aria-hidden>
                    —
                  </span>
                  Secure connection with encrypted data transfer.
                </li>
                <li className="flex gap-2.5">
                  <span className="shrink-0 font-medium text-accent" aria-hidden>
                    —
                  </span>
                  Credentials are never visible inside Money Maps.
                </li>
                <li className="flex gap-2.5">
                  <span className="shrink-0 font-medium text-accent" aria-hidden>
                    —
                  </span>
                  One view for spend, budget, recurring, and goals.
                </li>
                <li className="flex gap-2.5">
                  <span className="shrink-0 font-medium text-accent" aria-hidden>
                    —
                  </span>
                  Quick reads first, deeper drill-downs when needed.
                </li>
              </ul>
              {!user && (
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link
                    to="/login"
                    className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-accent/25 transition-[opacity,box-shadow] duration-200 hover:opacity-95 hover:shadow-lg hover:shadow-accent/30"
                  >
                    Get started
                  </Link>
                  <a
                    href="#features"
                    className="rounded-md border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/85 transition-colors duration-200 hover:border-accent/40 hover:text-white"
                  >
                    Features
                  </a>
                </div>
              )}
            </Reveal>
          </div>
        </section>

        <section id="features" className="home-band home-band-warm border-b border-white/10 py-16 sm:py-20">
          <div className="home-band-noise" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                Built for real money movement
              </h2>
              <p className="mt-3 max-w-2xl text-base text-white/75 sm:text-lg">
                Product-first surfaces tuned for fast scans, then deeper decisions.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              <Reveal>
                <StoryPanel
                  image={calendarDashboardImg}
                  imageAlt="Calendar overview and spend totals"
                  title="Monitor your spend"
                  body="See every week at a glance and catch shifts in spending before they snowball."
                  tone="warm"
                />
              </Reveal>
              <Reveal>
                <StoryPanel
                  image={budgetsImg}
                  imageAlt="Budget categories and targets"
                  title="Build a budget"
                  body="Set category targets, track against actual linked transactions, and adjust in minutes."
                  tone="neutral"
                />
              </Reveal>
              <Reveal>
                <StoryPanel
                  image={reportsImg}
                  imageAlt="Recurring and reports insights"
                  title="Cut waste quickly"
                  body="Spot repeating charges, merchant spikes, and trend changes with less digging."
                  tone="cool"
                />
              </Reveal>
            </div>
          </div>
        </section>

        <section className="home-band home-band-cool border-b border-white/10 py-16 sm:py-20">
          <div className="home-band-noise" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Know where your money is going, fast
              </h2>
              <p className="mt-3 max-w-2xl text-base text-white/75">
                Money Maps turns account activity into clear weekly and monthly views so you can make
                decisions without spreadsheet work.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <Reveal>
                <div className="rounded-xl border border-white/15 bg-black/25 p-6 backdrop-blur-md">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/90">
                    See patterns instantly
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">
                    Spot spending spikes, category drift, and recurring charges before they become
                    expensive habits.
                  </p>
                </div>
              </Reveal>
              <Reveal>
                <div className="rounded-xl border border-white/15 bg-black/25 p-6 backdrop-blur-md">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/90">
                    Act with context
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">
                    Budgets, goals, and reports stay connected, so every adjustment reflects the same
                    financial picture.
                  </p>
                </div>
              </Reveal>
              <Reveal>
                <div className="rounded-xl border border-white/15 bg-black/25 p-6 backdrop-blur-md">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/90">
                    Stay in control
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">
                    Secure encrypted connections keep data protected, and you can disconnect anytime from
                    settings.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="home-band home-band-dark border-b border-white/10 py-16 sm:py-20">
          <div className="home-band-noise" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Interface depth
              </h2>
              <p className="mt-3 max-w-2xl text-base text-white/75">
                Fast default views with deeper layers when you need precision.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {interfaceItems.map(({ id, title, Icon, summary, details }) => {
                const isOpen = openInterfaceId === id;
                const panelId = `interface-panel-${id}`;
                const buttonId = `interface-button-${id}`;

                return (
                <Reveal key={id}>
                  <div className="rounded-lg border border-white/10 bg-black/25 backdrop-blur-sm transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/35">
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleInterfaceItem(id)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/30 bg-accent/10 text-accent">
                          <Icon />
                        </div>
                        <svg
                          className={`mt-1 h-4 w-4 text-white/70 transition-transform ${
                            reducedMotion ? 'duration-0' : 'duration-200'
                          } ${isOpen ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="none"
                          aria-hidden
                        >
                          <path d="M5 7l5 6 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </div>
                      <p className="mt-3 text-sm font-medium text-white/88">{title}</p>
                      <p className="mt-1 text-sm text-white/72">{summary}</p>
                    </button>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className={`overflow-hidden px-4 transition-[max-height,opacity,padding] ${
                        reducedMotion ? 'duration-0' : 'duration-300'
                      } ${isOpen ? 'max-h-40 pb-4 opacity-100' : 'max-h-0 pb-0 opacity-0'}`}
                    >
                      <p className="text-sm leading-relaxed text-white/78">{details}</p>
                    </div>
                  </div>
                </Reveal>
                );
              })}
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <Reveal>
                <BrowserFrame
                  title="Money Maps"
                  caption="Budgets"
                  body="Targets and actuals for category-level control."
                >
                  <ScreenshotImg src={budgetsImg} alt="Budgets view" />
                </BrowserFrame>
              </Reveal>
              <Reveal>
                <BrowserFrame
                  title="Money Maps"
                  caption="Goals"
                  body="Progress tracking tied to the same account map."
                >
                  <ScreenshotImg src={goalsImg} alt="Savings goals view" />
                </BrowserFrame>
              </Reveal>
            </div>
          </div>
        </section>

        {!user && (
          <section className="home-band home-band-cool border-b border-white/10 py-16 sm:py-20">
            <div className="home-band-noise" aria-hidden />
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <Reveal>
                <div className="rounded-xl border border-white/15 bg-black/30 px-8 py-12 shadow-2xl shadow-black/35 backdrop-blur-lg sm:px-12">
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Start in minutes
                  </h2>
                  <p className="mt-3 max-w-md text-base text-white/80">
                    Sign in, link through Plaid, and open the calendar. Add structure as you go.
                  </p>
                  <Link
                    to="/login"
                    className="mt-8 inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-accent/25 transition-[opacity,box-shadow] duration-200 hover:opacity-95 hover:shadow-lg hover:shadow-accent/30"
                  >
                    Open app
                  </Link>
                  <p className="mt-4 text-sm text-white/70">No credit card required.</p>
                </div>
              </Reveal>
            </div>
          </section>
        )}

        <footer className="border-t border-white/10 bg-[#060a13] py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <LogoMark size={28} />
              <span className="font-display text-sm font-semibold tracking-tight text-white">Money Maps</span>
            </div>
            <p className="text-sm text-white/70">© {new Date().getFullYear()} Money Maps. Free to use.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
