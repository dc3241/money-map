import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { usePlaidActuals } from '../context/PlaidActualsContext';
import { usePlaidLiabilitiesFirestore } from '../hooks/usePlaidLiabilitiesFirestore';
import { plaidLiabilitiesToRows, type PlaidLiabilityRow } from '../utils/plaidLiabilitiesFlatten';
import { useBudgetStore } from '../store/useBudgetStore';
import type { DebtGoal, DebtGoalType } from '../types';
import { calculateDebtGoalProgress, getDebtGoalStatus } from '../utils/debtGoals';

const goalTypeLabels: Record<DebtGoalType, string> = {
  payoff_by_date: 'Pay off by date',
  target_balance_by_date: 'Reach target balance by date',
  extra_monthly_payment: 'Commit extra monthly payment',
};

const statusStyle: Record<string, string> = {
  on_track: 'bg-income-green/10 text-income-green border border-income-green/30',
  at_risk: 'bg-amber/10 text-amber border border-amber/30',
  off_track: 'bg-spending-red/10 text-spending-red border border-spending-red/30',
  complete: 'bg-income-green/10 text-income-green border border-income-green/30',
};

const DebtTracking: React.FC = () => {
  const { usePlaidForActuals } = usePlaidActuals();
  const { data: plaidLiab } = usePlaidLiabilitiesFirestore();
  const plaidLiabilityRows = useMemo(
    () => plaidLiabilitiesToRows(plaidLiab.liabilities, plaidLiab.accounts),
    [plaidLiab.liabilities, plaidLiab.accounts]
  );

  const debtGoals = useBudgetStore((state) => state.debtGoals);
  const addDebtGoal = useBudgetStore((state) => state.addDebtGoal);
  const updateDebtGoal = useBudgetStore((state) => state.updateDebtGoal);
  const removeDebtGoal = useBudgetStore((state) => state.removeDebtGoal);

  const [goalModalRow, setGoalModalRow] = useState<PlaidLiabilityRow | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalType, setGoalType] = useState<DebtGoalType>('payoff_by_date');
  const [targetDate, setTargetDate] = useState('');
  const [targetBalance, setTargetBalance] = useState('');
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState('');
  const [notes, setNotes] = useState('');

  const goalByAccountId = useMemo(() => {
    return debtGoals.reduce<Record<string, DebtGoal>>((acc, goal) => {
      if (!goal.isArchived) {
        acc[goal.plaidAccountId] = goal;
      }
      return acc;
    }, {});
  }, [debtGoals]);

  const resetGoalModal = () => {
    setGoalModalRow(null);
    setEditingGoalId(null);
    setGoalType('payoff_by_date');
    setTargetDate('');
    setTargetBalance('');
    setExtraMonthlyPayment('');
    setNotes('');
  };

  const openGoalModal = (row: PlaidLiabilityRow) => {
    const existing = goalByAccountId[row.accountId];
    setGoalModalRow(row);
    if (existing) {
      setEditingGoalId(existing.id);
      setGoalType(existing.goalType);
      setTargetDate(existing.targetDate ?? '');
      setTargetBalance(existing.targetBalance != null ? existing.targetBalance.toString() : '');
      setExtraMonthlyPayment(
        existing.extraMonthlyPayment != null ? existing.extraMonthlyPayment.toString() : ''
      );
      setNotes(existing.notes ?? '');
      return;
    }

    setEditingGoalId(null);
    setGoalType('payoff_by_date');
    setTargetDate('');
    setTargetBalance('');
    setExtraMonthlyPayment('');
    setNotes('');
  };

  const handleSaveGoal = () => {
    if (!goalModalRow || goalModalRow.balance == null) return;

    const requiresDate = goalType === 'payoff_by_date' || goalType === 'target_balance_by_date';
    if (requiresDate && !targetDate) return;
    if (goalType === 'target_balance_by_date' && (!targetBalance || Number(targetBalance) < 0)) return;
    if (goalType === 'extra_monthly_payment' && (!extraMonthlyPayment || Number(extraMonthlyPayment) <= 0)) return;

    if (editingGoalId) {
      updateDebtGoal(editingGoalId, {
        goalType,
        targetDate: requiresDate ? targetDate : undefined,
        targetBalance: goalType === 'target_balance_by_date' ? Number(targetBalance) : undefined,
        extraMonthlyPayment:
          goalType === 'extra_monthly_payment' ? Number(extraMonthlyPayment) : undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addDebtGoal({
        plaidAccountId: goalModalRow.accountId,
        goalType,
        targetDate: requiresDate ? targetDate : undefined,
        targetBalance: goalType === 'target_balance_by_date' ? Number(targetBalance) : undefined,
        extraMonthlyPayment:
          goalType === 'extra_monthly_payment' ? Number(extraMonthlyPayment) : undefined,
        startingBalance: goalModalRow.balance,
        notes: notes.trim() || undefined,
      });
    }
    resetGoalModal();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const totalDebt = plaidLiabilityRows.reduce((sum, row) => sum + (row.balance ?? 0), 0);
  const accountsWithGoals = plaidLiabilityRows.filter((row) => !!goalByAccountId[row.accountId]).length;
  
  return (
    <div className="flex-1 overflow-y-auto bg-bg-app min-h-screen">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-text-primary mb-2">
                Debt Tracking
              </h1>
              <p className="text-text-muted text-sm">
                Monitor and manage your debt payments
                {usePlaidForActuals &&
                  ' — bank-reported balances appear below when Plaid Liabilities is enabled for your institution.'}
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          {plaidLiabilityRows.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Total Debt</div>
                <div className="text-3xl font-semibold text-spending-red">{formatCurrency(totalDebt)}</div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Liability Accounts</div>
                <div className="text-3xl font-semibold text-text-primary">{plaidLiabilityRows.length}</div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Accounts With Goals</div>
                <div className="text-3xl font-semibold text-text-primary">{accountsWithGoals}</div>
              </div>
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-all duration-200">
                <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Source</div>
                <div className="text-xl font-semibold text-text-primary">Plaid (read-only)</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Debts Grid */}
        {plaidLiabilityRows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plaidLiabilityRows.map((row) => {
              const currentBalance = row.balance ?? 0;
              const goal = goalByAccountId[row.accountId];
              const goalProgress = goal ? calculateDebtGoalProgress(goal, currentBalance) : null;
              const goalStatus = goal ? getDebtGoalStatus(goal, currentBalance) : null;
              const progressWidth = goalProgress ? Math.min(goalProgress.progressPercent, 100) : 0;
              const statusLabel = goalStatus ? goalStatus.replace('_', ' ') : '';

              return (
                <div
                  key={`${row.kind}-${row.accountId}`}
                  className="group bg-surface-1 border border-border-subtle rounded-xl hover:border-border-hover transition-all duration-200 overflow-hidden p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-text-primary font-semibold text-sm">{row.name}</h3>
                      <span className="bg-surface-2 text-text-secondary text-xs rounded-lg px-2 py-0.5">
                        {row.kind}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {goalStatus && (
                        <span className={`text-xs px-2 py-1 rounded-lg capitalize ${statusStyle[goalStatus]}`}>
                          {statusLabel}
                        </span>
                      )}
                      <button
                        onClick={() => openGoalModal(row)}
                        className="px-3 py-2 bg-surface-2 border border-border-subtle text-text-secondary rounded-lg text-xs hover:border-border-hover hover:text-text-primary transition-all"
                      >
                        {goal ? 'Edit Goal' : 'Set Goal'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-text-muted text-xs">Current Balance</span>
                      <span className="text-spending-red font-semibold tabular-nums">
                        {row.balance != null ? formatCurrency(row.balance) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-text-muted text-xs">Min Payment</span>
                      <span className="text-text-secondary text-sm tabular-nums">
                        {row.minPayment != null ? formatCurrency(row.minPayment) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-text-muted text-xs">APR</span>
                      <span className="text-text-secondary text-sm tabular-nums">
                        {row.aprPercent != null ? `${row.aprPercent.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                  </div>

                  {goal && goalProgress ? (
                    <div className="border-t border-border-subtle pt-4 space-y-3">
                      <div className="text-xs text-text-muted">
                        Goal: {goalTypeLabels[goal.goalType]}
                        {goal.targetDate ? ` · ${format(new Date(goal.targetDate), 'MMM d, yyyy')}` : ''}
                      </div>
                      <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-income-green transition-all duration-500 ease-out"
                          style={{ width: `${progressWidth}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">{goalProgress.progressPercent.toFixed(1)}% complete</span>
                        <span className="text-text-secondary">
                          Remaining: {formatCurrency(goalProgress.remainingToTarget)}
                        </span>
                      </div>
                      {goalProgress.daysRemaining != null && (
                        <div className="flex justify-between text-xs">
                          <span className="text-text-muted">Days left</span>
                          <span className="text-text-secondary">{goalProgress.daysRemaining}</span>
                        </div>
                      )}
                      {goal.notes && <p className="text-xs text-text-muted">{goal.notes}</p>}
                    </div>
                  ) : (
                    <div className="border-t border-border-subtle pt-4">
                      <p className="text-xs text-text-muted mb-3">
                        Set a payoff goal to track progress for this account.
                      </p>
                      <div
                        className="inline-flex items-center px-3 py-2 bg-surface-2 border border-border-subtle text-text-secondary rounded-lg text-xs hover:border-border-hover hover:text-text-primary transition-all cursor-pointer"
                        onClick={() => openGoalModal(row)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openGoalModal(row);
                          }
                        }}
                      >
                        Set Goal
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto bg-surface-1 border border-dashed border-border-subtle rounded-xl p-12">
              <div className="text-8xl mb-6">💸</div>
              <h2 className="text-2xl font-semibold text-text-primary mb-3">No Debt Accounts Synced Yet</h2>
              <p className="text-text-muted text-sm mb-8">
                Connect and refresh your accounts in Plaid to view debt balances here. Debt balances on this page are read-only from your bank connection.
              </p>
            </div>
          </div>
        )}

        {/* Goal Modal */}
        {goalModalRow && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={resetGoalModal}
          >
            <div 
              className="bg-surface-1 border border-border-subtle rounded-xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold text-text-primary mb-6">
                {editingGoalId ? 'Edit Debt Goal' : 'Set Debt Goal'}
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Account
                  </label>
                  <div className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary">
                    {goalModalRow.name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Goal Type
                  </label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value as DebtGoalType)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary focus:border-accent focus:ring-0 focus:outline-none transition-all"
                  >
                    {Object.entries(goalTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {(goalType === 'payoff_by_date' || goalType === 'target_balance_by_date') && (
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                    />
                  </div>
                )}

                {goalType === 'target_balance_by_date' && (
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      Target Balance
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={targetBalance}
                        onChange={(e) => setTargetBalance(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}

                {goalType === 'extra_monthly_payment' && (
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">
                      Extra Monthly Payment
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={extraMonthlyPayment}
                        onChange={(e) => setExtraMonthlyPayment(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Notes <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all min-h-[90px]"
                    placeholder="Add context or motivation for this goal"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveGoal}
                    className="flex-1 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
                  >
                    {editingGoalId ? 'Save Goal' : 'Create Goal'}
                  </button>
                  {editingGoalId && (
                    <button
                      onClick={() => {
                        removeDebtGoal(editingGoalId);
                        resetGoalModal();
                      }}
                      className="px-4 py-3 bg-surface-2 border border-border-subtle text-spending-red rounded-xl font-medium hover:border-border-hover transition-all duration-200"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    onClick={resetGoalModal}
                    className="flex-1 px-6 py-3 bg-surface-2 border border-border-subtle text-text-secondary rounded-xl font-medium hover:border-border-hover hover:text-text-primary transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebtTracking;

