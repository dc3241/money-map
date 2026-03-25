/**
 * Flattens Plaid liabilitiesGet snapshot (Firestore shape) into display rows.
 * @see https://plaid.com/docs/api/products/liabilities/
 */

export interface PlaidLiabilityRow {
  kind: string;
  accountId: string;
  name: string;
  balance: number | null;
  minPayment: number | null;
  aprPercent: number | null;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function accountNamesById(accounts: unknown[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const raw of accounts) {
    if (!raw || typeof raw !== "object") continue;
    const a = raw as Record<string, unknown>;
    const id = a.account_id;
    if (typeof id !== "string" || !id) continue;
    const name = a.name ?? a.official_name;
    map.set(id, typeof name === "string" && name ? name : "Account");
  }
  return map;
}

export function plaidLiabilitiesToRows(
  liabilities: Record<string, unknown>,
  accounts: unknown[]
): PlaidLiabilityRow[] {
  const names = accountNamesById(accounts);
  const rows: PlaidLiabilityRow[] = [];

  for (const kind of Object.keys(liabilities)) {
    const arr = liabilities[kind];
    if (!Array.isArray(arr)) continue;

    for (const raw of arr) {
      if (!raw || typeof raw !== "object") continue;
      const o = raw as Record<string, unknown>;
      const accountId = o.account_id;
      if (typeof accountId !== "string" || !accountId) continue;

      let balance =
        num(o.last_statement_balance) ?? num(o.current_balance) ?? num(o.balance);
      const minPayment = num(o.minimum_payment_amount);
      let aprPercent: number | null = null;
      const aprs = o.aprs;
      if (Array.isArray(aprs) && aprs[0] && typeof aprs[0] === "object") {
        aprPercent = num((aprs[0] as Record<string, unknown>).apr_percentage);
      }

      rows.push({
        kind,
        accountId,
        name: names.get(accountId) ?? `${kind} ·•••${accountId.slice(-4)}`,
        balance,
        minPayment,
        aprPercent,
      });
    }
  }

  return rows;
}
