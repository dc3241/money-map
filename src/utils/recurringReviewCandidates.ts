import { differenceInCalendarDays, parseISO } from "date-fns";
import type { PlaidTransaction } from "../hooks/usePlaidTransactions";

export type CandidateConfidenceLabel = "High" | "Medium" | "Low";

export interface RecurringReviewCandidate {
  tx: PlaidTransaction;
  confidenceScore: number;
  confidenceLabel: CandidateConfidenceLabel;
  occurrences: number;
}

const CADENCE_TARGETS_DAYS = [7, 14, 15, 30];
const CADENCE_TOLERANCE_DAYS = 3;
const MAX_AMOUNT_DEVIATION_RATIO = 0.2;
const MIN_OCCURRENCES_HARD = 3;
const MIN_OCCURRENCES_SOFT = 2;
const MIN_CADENCE_SCORE_SOFT = 0.75;

function normalizeGroupKey(tx: PlaidTransaction): string | null {
  const raw = (tx.merchant_name || tx.name || "").trim().toLowerCase();
  if (!raw) return null;
  const cleaned = raw
    .replace(/\b\d{3,}\b/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  const direction = tx.amount < 0 ? "in" : "out";
  return `${cleaned}::${direction}`;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function amountConsistencyScore(amounts: number[]): { score: number; maxDeviationRatio: number } {
  const med = median(amounts.map((a) => Math.abs(a)));
  if (med <= 0) return { score: 0, maxDeviationRatio: Number.POSITIVE_INFINITY };
  let maxDeviationRatio = 0;
  for (const amount of amounts) {
    const ratio = Math.abs(Math.abs(amount) - med) / med;
    if (ratio > maxDeviationRatio) maxDeviationRatio = ratio;
  }
  const score = Math.max(0, 1 - maxDeviationRatio);
  return { score, maxDeviationRatio };
}

function cadenceConsistencyScore(transactions: PlaidTransaction[]): number {
  if (transactions.length < 2) return 0;
  const sortedAsc = [...transactions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const intervals: number[] = [];
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = parseISO(`${sortedAsc[i - 1].date}T12:00:00`);
    const cur = parseISO(`${sortedAsc[i].date}T12:00:00`);
    const delta = Math.abs(differenceInCalendarDays(cur, prev));
    if (delta > 0) intervals.push(delta);
  }
  if (intervals.length === 0) return 0;

  let bestMatchRatio = 0;
  for (const target of CADENCE_TARGETS_DAYS) {
    const matches = intervals.filter((days) => Math.abs(days - target) <= CADENCE_TOLERANCE_DAYS).length;
    const ratio = matches / intervals.length;
    if (ratio > bestMatchRatio) bestMatchRatio = ratio;
  }
  return bestMatchRatio;
}

function confidenceLabel(score: number): CandidateConfidenceLabel {
  if (score >= 0.78) return "High";
  if (score >= 0.6) return "Medium";
  return "Low";
}

export function recurringReviewCandidates(
  transactions: PlaidTransaction[],
  streamTxIds: Set<string>,
  reviewedTxIds: Set<string>,
  maxCandidates = 12
): RecurringReviewCandidate[] {
  const groups = new Map<string, PlaidTransaction[]>();

  for (const tx of transactions) {
    if (tx.pending) continue;
    if (streamTxIds.has(tx.transaction_id)) continue;
    if (reviewedTxIds.has(tx.transaction_id)) continue;

    const key = normalizeGroupKey(tx);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(tx);
    groups.set(key, group);
  }

  const candidates: RecurringReviewCandidate[] = [];
  for (const group of groups.values()) {
    const occurrences = group.length;
    if (occurrences < MIN_OCCURRENCES_SOFT) continue;

    const cadenceScore = cadenceConsistencyScore(group);
    const { score: amountScore, maxDeviationRatio } = amountConsistencyScore(
      group.map((tx) => tx.amount)
    );

    if (maxDeviationRatio > MAX_AMOUNT_DEVIATION_RATIO) continue;

    const meetsHardRule = occurrences >= MIN_OCCURRENCES_HARD;
    const meetsSoftRule = occurrences >= MIN_OCCURRENCES_SOFT && cadenceScore >= MIN_CADENCE_SCORE_SOFT;
    if (!meetsHardRule && !meetsSoftRule) continue;

    const occurrenceScore = Math.min(occurrences, 6) / 6;
    const confidenceScore =
      occurrenceScore * 0.4 + cadenceScore * 0.35 + amountScore * 0.25;

    const latestTx = [...group].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0];
    candidates.push({
      tx: latestTx,
      confidenceScore,
      confidenceLabel: confidenceLabel(confidenceScore),
      occurrences,
    });
  }

  candidates.sort((a, b) => {
    if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
    return a.tx.date < b.tx.date ? 1 : -1;
  });

  return candidates.slice(0, maxCandidates);
}
