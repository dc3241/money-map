import { useEffect, useMemo } from 'react';
import { useWalkthroughStore } from '../store/useWalkthroughStore';
import { useBudgetStore } from '../store/useBudgetStore';

/**
 * Hook to automatically complete walkthrough tasks based on user actions
 * This monitors the app state and marks tasks as complete when the user performs the actions
 */
export const useWalkthroughAutoComplete = () => {
  const { tasks, checkTask, isCompleted } = useWalkthroughStore();
  const accounts = useBudgetStore((state) => state.accounts);
  const recurringExpenses = useBudgetStore((state) => state.recurringExpenses);
  const recurringIncome = useBudgetStore((state) => state.recurringIncome);
  const budgets = useBudgetStore((state) => state.budgets);
  const savingsGoals = useBudgetStore((state) => state.savingsGoals);
  const days = useBudgetStore((state) => state.days);

  // Create a map of task completion status for efficient lookup
  const taskCompletionMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    tasks.forEach((task) => {
      map[task.id] = task.completed;
    });
    return map;
  }, [tasks]);

  // Check if user has any transactions
  const hasTransactions = useMemo(() => {
    return Object.values(days).some(
      (day) => day.income.length > 0 || day.spending.length > 0
    );
  }, [days]);

  useEffect(() => {
    if (isCompleted) return;

    // Task 2: Add Your First Account
    if (!taskCompletionMap['2'] && accounts.length > 0) {
      checkTask('2');
    }

    // Task 3: Record a Transaction
    if (!taskCompletionMap['3'] && hasTransactions) {
      checkTask('3');
    }

    // Task 4: Set Up Recurring Items
    if (
      !taskCompletionMap['4'] &&
      (recurringExpenses.length > 0 || recurringIncome.length > 0)
    ) {
      checkTask('4');
    }

    // Task 5: Create a Budget
    if (!taskCompletionMap['5'] && budgets.length > 0) {
      checkTask('5');
    }

    // Task 6: Set a Savings Goal
    if (!taskCompletionMap['6'] && savingsGoals.length > 0) {
      checkTask('6');
    }
  }, [
    taskCompletionMap,
    accounts.length,
    recurringExpenses.length,
    recurringIncome.length,
    budgets.length,
    savingsGoals.length,
    hasTransactions,
    checkTask,
    isCompleted,
  ]);
};

