import type { Step } from 'react-joyride';
import type { TourViewKey } from './tourStorage';

const T = (s: string) => s;

function navStep(isMobile: boolean): Step {
  if (isMobile) {
    return {
      target: '[data-tour="tour-mobile-nav"]',
      title: T('Move around the app'),
      content: T(
        'On your phone, use the bottom bar for Dashboard, Accounts, Budgets, and Goals. Tap More for Recurring, Reports, Debt, and Profile — the same areas as the desktop sidebar.'
      ),
      placement: 'top',
    };
  }
  return {
    target: '[data-tour="tour-sidebar-nav"]',
    title: T('Main navigation'),
    content: T(
      'Use the left rail to switch areas: overview, recurring money, accounts, budgets, goals, debt, and reports. Hover an icon to see its name. Profile and sign out are at the bottom.'
    ),
    placement: 'right',
  };
}

const dashboardSteps = (isMobile: boolean): Step[] => [
  navStep(isMobile),
  {
    target: '[data-tour="tour-dashboard-header"]',
    title: T('Time range'),
    content: T(
      'Move backward and forward in time with Prev / Next. Switch Week or Month to see this week’s calendar or a full month — the numbers below follow the same mode.'
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-dashboard-metrics"]',
    title: T('At-a-glance numbers'),
    content: T(
      'These cards summarize income, spending, and net for the week or month you’re viewing. They’re a quick health check before you dig into the calendar and lists below.'
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-dashboard-calendar"]',
    title: T('Calendar and daily detail'),
    content: T(
      'Your spending rhythm lives here. Tap or click days to add or review transactions. Use this grid to see when money moved, not just totals.'
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="tour-dashboard-snapshots"]',
    title: T('Accounts, budget, and debt'),
    content: T(
      'Short summaries of linked accounts, how you’re doing against budgets this month, and debt progress. Use “view all” actions to jump to full pages when you need detail.'
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="tour-dashboard-activity"]',
    title: T('Activity and what’s next'),
    content: T(
      'Recent transactions, upcoming recurring items, and a month summary help you reconcile the past and plan ahead. Replay any page tour from the ? button when you want a refresher.'
    ),
    placement: 'top',
  },
];

const accountsSteps: Step[] = [
  {
    target: '[data-tour="tour-accounts-header"]',
    title: T('Accounts overview'),
    content: T(
      'See net worth and how many accounts are linked. Refresh pulls the latest balances and transactions from your bank when you use Plaid.'
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-accounts-link"]',
    title: T('Connect your bank'),
    content: T(
      'Link institutions with Plaid to sync real balances and transactions. You can add more accounts later from this same block.'
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="tour-accounts-list"]',
    title: T('Your accounts'),
    content: T(
      'Each card shows balance and type. Transfer between manual accounts when not using bank sync, or drill in for account-specific actions.'
    ),
    placement: 'top',
  },
];

const budgetsSteps: Step[] = [
  {
    target: '[data-tour="tour-budgets-header"]',
    title: T('Budget period and actions'),
    content: T(
      'Pick year and month to score budgets against the right period. Add budget creates a new spending target for a category.'
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-budgets-planner"]',
    title: T('Spendable planner'),
    content: T(
      'Forecast safe spend from recurring income and bills. Adjust the safety buffer and horizon (weekly / biweekly / monthly) to match how you think about cash flow.'
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="tour-budgets-list"]',
    title: T('Budget cards'),
    content: T(
      'When you have budgets, each card compares limit to actual spend. Use filters above (when shown) to narrow by category or status. Add your first budget from the header if this area is empty.'
    ),
    placement: 'top',
  },
];

const recurringManualSteps: Step[] = [
  {
    target: '[data-tour="tour-recurring-intro"]',
    title: T('Recurring income and expenses'),
    content: T(
      'Templates here drive predictable bills and income. They roll into your calendar and forecasts so future months stay accurate.'
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-recurring-expenses"]',
    title: T('Expenses'),
    content: T(
      'Add subscriptions and bills, sort and filter by next date or amount, and edit when something changes. These inform “upcoming” on the dashboard.'
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="tour-recurring-income"]',
    title: T('Income'),
    content: T(
      'Same idea for money that arrives on a schedule. Keeping both sides updated makes cash-flow views trustworthy.'
    ),
    placement: 'top',
  },
];

const recurringPlaidSteps: Step[] = [
  {
    target: '[data-tour="tour-recurring-plaid-intro"]',
    title: T('Bank-based recurring'),
    content: T(
      'With Plaid, Money Map reads streams from your accounts instead of manual templates. Refresh accounts after syncing so streams stay current.'
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-recurring-plaid-stats"]',
    title: T('Actuals vs streams'),
    content: T(
      'Compare this month’s actuals to estimated recurring from streams. Use it to see whether detected subscriptions match reality.'
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-recurring-plaid-streams"]',
    title: T('Streams and review'),
    content: T(
      'Scroll through inflows and outflows Plaid detected. Confirm or adjust items so reporting and forecasts match how you actually spend.'
    ),
    placement: 'top',
  },
];

const reportingSteps: Step[] = [
  {
    target: '[data-tour="tour-reporting-header"]',
    title: T('Reports hub'),
    content: T(
      'The badge shows whether totals use linked bank data or your manual ledger. Pick a year below to move across annual views.'
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-reporting-year"]',
    title: T('Year selector'),
    content: T(
      'Tap a year to load charts and tables for that calendar period. Loading states appear while bank transactions are fetched for the full year.'
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-reporting-content"]',
    title: T('Charts and breakdowns'),
    content: T(
      'Scroll for income vs spending trends, category splits, and insights. Use this page when you want the story behind the dashboard numbers.'
    ),
    placement: 'top',
  },
];

const goalsSteps: Step[] = [
  {
    target: '[data-tour="tour-goals-header"]',
    title: T('Savings goals'),
    content: T(
      'Set targets with Add goal. Progress can tie to Plaid accounts and transactions when bank linking is on.'
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-goals-grid"]',
    title: T('Goal cards'),
    content: T(
      'Each card shows progress and timeline when you have goals. Click to edit amounts, dates, or linked accounts. If you’re new, create your first goal to populate this area.'
    ),
    placement: 'top',
  },
];

const debtSteps: Step[] = [
  {
    target: '[data-tour="tour-debt-header"]',
    title: T('Debt overview'),
    content: T(
      'Liabilities from Plaid show read-only balances and payment details. Set goal on a card to track payoff targets.'
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-debt-body"]',
    title: T('Totals and accounts'),
    content: T(
      'Review total debt, counts, and each liability’s balance, minimum payment, and APR. Goals show progress toward zero or a target date.'
    ),
    placement: 'top',
  },
];

const profileSteps: Step[] = [
  {
    target: '[data-tour="tour-profile-header"]',
    title: T('Profile'),
    content: T(
      'Update how your name appears and manage email or password for email accounts. Google sign-in users manage password through Google.'
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-profile-card"]',
    title: T('Account snapshot'),
    content: T(
      'Quick facts: member since, provider, and verification status for your email.'
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="tour-profile-tabs"]',
    title: T('Sections'),
    content: T(
      'Switch between profile, password (if applicable), and contact support.'
    ),
    placement: 'bottom',
  },
];

export function getTourSteps(view: TourViewKey, isMobile: boolean, recurringMode: 'manual' | 'plaid'): Step[] {
  switch (view) {
    case 'dashboard':
      return dashboardSteps(isMobile);
    case 'accounts':
      return accountsSteps;
    case 'budgets':
      return budgetsSteps;
    case 'recurring':
      return recurringMode === 'plaid' ? recurringPlaidSteps : recurringManualSteps;
    case 'reporting':
      return reportingSteps;
    case 'goals':
      return goalsSteps;
    case 'debt':
      return debtSteps;
    case 'profile':
      return profileSteps;
    default:
      return [];
  }
}
