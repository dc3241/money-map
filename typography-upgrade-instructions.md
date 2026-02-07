# Money Maps - Typography Upgrade Instructions

## Objective
Upgrade typography to match enterprise-level finance applications like Robinhood, Coinbase, and WeBull.

---

## STEP 1: Update Base Font Family

Replace the current font stack with:

```css
body, * {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

If you want to use Inter specifically (recommended free option):
1. Add this to your HTML `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

2. Update font-family:
```css
body, * {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## STEP 2: Configure All Currency/Number Displays

Add these properties to ALL elements that display currency or numbers:

```css
/* Apply to all currency and number elements */
.currency,
.amount,
.balance,
[class*="balance"],
[class*="amount"],
[class*="total"],
[class*="price"],
[class*="value"] {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  letter-spacing: -0.02em;
}
```

This ensures:
- Numbers are monospaced (align properly in columns)
- Tighter letter spacing for professional appearance

---

## STEP 3: Update Font Sizes and Weights

Apply these specific styles to your components:

### Page Titles
```css
h1,
.page-title,
[class*="page-title"] {
  font-size: 32px;
  font-weight: 600;
  color: #0F0F0F;
  letter-spacing: -0.02em;
}
```

### Section Headers / Card Titles
```css
h2,
.section-header,
.card-title,
[class*="card-title"],
[class*="section"] h2 {
  font-size: 20px;
  font-weight: 600;
  color: #0F0F0F;
  letter-spacing: -0.01em;
}
```

### Large Currency Values (Main Balances)
**CRITICAL: These should be the most prominent elements**

```css
/* Main account balances, total balances */
.account-balance,
.total-balance,
.balance-large,
.current-balance,
[class*="current-balance"],
[class*="total-balance"],
[class*="account"] .balance {
  font-size: 36px;
  font-weight: 600;
  color: #0F0F0F;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
```

### Medium Currency Values
```css
/* Summary totals, secondary balances */
.summary-total,
.monthly-total,
.balance-medium,
[class*="summary"] .amount,
[class*="monthly"] .total {
  font-size: 24px;
  font-weight: 600;
  color: #0F0F0F;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
```

### Small Currency Values (In Lists)
```css
/* Expense amounts, income amounts in lists */
.expense-amount,
.income-amount,
.list-item-amount,
.balance-small,
[class*="expense"] .amount,
[class*="spending"] .amount,
[class*="income"] .amount {
  font-size: 18px;
  font-weight: 600;
  color: #0F0F0F;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}
```

### Body Text / Descriptions
```css
p,
.description,
.body-text,
[class*="description"] {
  font-size: 15px;
  font-weight: 400;
  color: #404040;
  line-height: 1.5;
}
```

### Labels / Metadata / Small Text
```css
.label,
.metadata,
.caption,
.category,
.account-type,
[class*="label"],
[class*="category"],
[class*="date"],
[class*="meta"] {
  font-size: 13px;
  font-weight: 500;
  color: #737373;
}
```

### Very Small Text (Timestamps, etc.)
```css
.timestamp,
.footnote,
[class*="timestamp"] {
  font-size: 12px;
  font-weight: 400;
  color: #A3A3A3;
}
```

---

## STEP 4: Page-Specific Updates

### Calendar View

**Daily Total at Top:**
```css
.day-total,
[class*="day-total"],
.daily-balance {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
```

**Expense/Income Items:**
```css
.calendar-expense-amount,
.calendar-income-amount,
[class*="calendar"] .amount {
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
```

**Week/Month Summary:**
```css
.weekly-summary .total,
.monthly-summary .total,
[class*="summary"] .total {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
```

### Recurring Expenses & Income Page

**Monthly Totals (Top Cards):**
```css
.monthly-expenses-total,
.monthly-income-total,
.net-monthly,
[class*="monthly-expenses"],
[class*="monthly-income"] {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
```

**Individual Expense Amounts:**
```css
.recurring-expense-amount,
.recurring-income-amount,
[class*="recurring"] .amount {
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
```

**Expense Names:**
```css
.expense-name,
.income-name,
[class*="recurring"] .name {
  font-size: 16px;
  font-weight: 500;
  color: #0F0F0F;
}
```

### Accounts Page

**Summary Card Numbers:**
```css
.total-balance-summary,
.account-count,
.balance-change,
[class*="summary-card"] .value {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
```

**Individual Account Balances (on cards):**
```css
.account-card-balance,
[class*="account-card"] .balance {
  font-size: 36px;
  font-weight: 600;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: #FFFFFF; /* if on dark card background */
}
```

**Account Names:**
```css
.account-name,
[class*="account-card"] .name {
  font-size: 18px;
  font-weight: 500;
}
```

**Account Type Labels:**
```css
.account-type,
[class*="account-card"] .type {
  font-size: 13px;
  font-weight: 500;
  opacity: 0.7;
}
```

### Savings Goals Page

**Goal Target/Current:**
```css
.goal-current,
.goal-target,
[class*="goal"] .current,
[class*="goal"] .target {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
```

**Goal Name:**
```css
.goal-name,
[class*="goal"] .name {
  font-size: 20px;
  font-weight: 500;
}
```

### Debt Tracking Page

**Current Debt Balance:**
```css
.debt-balance,
.current-debt,
[class*="debt"] .balance {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
```

**Original Amount / Paid Off:**
```css
.original-amount,
.paid-off-amount,
[class*="debt"] .original,
[class*="debt"] .paid {
  font-size: 16px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
```

### Financial Reports Page

**Annual Totals:**
```css
.annual-income,
.annual-spending,
.net-profit,
[class*="annual"] .amount {
  font-size: 36px;
  font-weight: 600;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
```

**Savings Rate Percentage:**
```css
.savings-rate,
[class*="savings-rate"] {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
```

**Chart Labels:**
```css
.chart-label,
[class*="chart"] .label {
  font-size: 12px;
  font-weight: 500;
  color: #737373;
}
```

---

## STEP 5: Button Text

```css
button,
.button,
[class*="button"],
[class*="btn"] {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0;
}
```

---

## STEP 6: Form Inputs

```css
input,
select,
textarea,
.input,
[class*="input"],
[class*="select"] {
  font-size: 15px;
  font-weight: 400;
  color: #0F0F0F;
}

/* Input labels */
label,
.form-label,
[class*="label"] {
  font-size: 13px;
  font-weight: 500;
  color: #404040;
}
```

---

## CRITICAL RULES TO FOLLOW

### Font Weight Usage
✅ **ONLY USE THESE THREE WEIGHTS:**
- 400 (Regular) - Body text, descriptions, secondary info
- 500 (Medium) - Labels, button text, names/titles
- 600 (Semibold) - ALL currency values, headings, emphasis

❌ **NEVER USE:**
- 300 (Light)
- 700+ (Bold or heavier)

### Currency Display Requirements
✅ **ALL CURRENCY MUST HAVE:**
```css
font-weight: 600;
font-variant-numeric: tabular-nums;
letter-spacing: -0.02em; /* or -0.03em for 36px+ */
```

### Size Hierarchy
✅ **Follow this hierarchy:**
- 36px = Primary balances (account totals, main balances)
- 28-32px = Section totals, annual figures
- 24px = Secondary totals, summary cards
- 18px = List item amounts
- 16px = Small amounts, metadata

### Letter Spacing
✅ **Apply negative letter spacing to numbers:**
- 36px+ numbers: `letter-spacing: -0.03em`
- 24px+ numbers: `letter-spacing: -0.02em`
- 18px+ numbers: `letter-spacing: -0.01em`

❌ **Do not apply negative letter spacing to:**
- Body text
- Labels
- Button text

---

## TESTING CHECKLIST

After implementation, verify:

- [ ] All currency values use font-weight: 600
- [ ] All currency values have tabular-nums enabled
- [ ] Main account balances are 36px
- [ ] Numbers have appropriate negative letter-spacing
- [ ] No font weights outside of 400, 500, 600 are used
- [ ] Body text is 15px, weight 400
- [ ] Labels are 13px, weight 500
- [ ] Numbers align properly in columns (test by viewing multiple amounts)

---

## BEFORE/AFTER EXPECTATIONS

**Before:**
- Currency: 16-20px, weight 400-500
- Inconsistent number spacing
- Body text too bold or too thin
- Numbers don't align in columns

**After:**
- Currency: 18-36px (depending on context), weight 600
- Tight, professional letter spacing on all numbers
- Clear hierarchy: numbers dominate, text supports
- Perfect number alignment due to tabular-nums

---

## IMPLEMENTATION NOTES

1. **Start with the base font family** (Step 1)
2. **Apply currency/number config globally** (Step 2)
3. **Work through font sizes/weights** (Step 3)
4. **Apply page-specific styles** (Step 4)
5. **Test thoroughly** - View each page and verify numbers are prominent

If class names don't match exactly, apply the styles to whatever classes are actually used for:
- Account balances
- Currency amounts
- Totals and summaries
- Expense/income values
- Labels and metadata

The key is making ALL currency values:
- **Heavier** (600 weight)
- **Larger** (relative to current size)
- **Tighter** (negative letter-spacing)
- **Aligned** (tabular-nums)

This will instantly make the app look enterprise-level professional.
