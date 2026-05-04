/** Shared labels for recurring review / manual-from-Plaid flows */
export const RECURRING_REVIEW_CADENCE_OPTIONS = [
  "weekly",
  "biweekly",
  "semimonthly",
  "monthly",
  "quarterly",
  "annually",
] as const;

export const RECURRING_REVIEW_EXPENSE_CATEGORIES = [
  "Housing",
  "Utilities",
  "Food & Dining",
  "Transportation",
  "Insurance",
  "Healthcare",
  "Shopping",
  "Entertainment",
  "Debt Payment",
  "Subscription",
  "Other",
] as const;

export const RECURRING_REVIEW_INCOME_TYPES = [
  "Salary",
  "Freelance",
  "Side hustle",
  "Bonus",
  "Investment",
  "Transfer",
  "Other",
] as const;
