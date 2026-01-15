import { create } from 'zustand';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from './useAuthStore';

export interface WalkthroughTask {
  id: string;
  title: string;
  description: string;
  action?: string; // Optional: "Navigate to accounts", "Add transaction", etc.
  completed: boolean;
}

interface WalkthroughState {
  isCompleted: boolean;
  isLoading: boolean;
  tasks: WalkthroughTask[];
  initializeWalkthrough: () => Promise<void>;
  checkTask: (taskId: string) => void;
  completeWalkthrough: () => Promise<void>;
  skipWalkthrough: () => Promise<void>;
  resetWalkthrough: () => Promise<void>;
}

const defaultTasks: WalkthroughTask[] = [
  {
    id: '1',
    title: 'Explore the Calendar',
    description: 'Check out the weekly and monthly calendar views to see your financial timeline',
    action: 'Navigate to dashboard',
    completed: false,
  },
  {
    id: '2',
    title: 'Add Your First Account',
    description: 'Set up at least one account (checking, savings, or credit card) to get started',
    action: 'Navigate to accounts',
    completed: false,
  },
  {
    id: '3',
    title: 'Record a Transaction',
    description: 'Add an income or expense to the calendar to track your money flow',
    action: 'Add a transaction',
    completed: false,
  },
  {
    id: '4',
    title: 'Set Up Recurring Items',
    description: 'Create recurring bills or income so they automatically populate each month',
    action: 'Navigate to recurring',
    completed: false,
  },
  {
    id: '5',
    title: 'Create a Budget',
    description: 'Set spending limits by category to stay on track with your financial goals',
    action: 'Navigate to budgets',
    completed: false,
  },
  {
    id: '6',
    title: 'Set a Savings Goal',
    description: 'Create a goal to save for something special and track your progress',
    action: 'Navigate to goals',
    completed: false,
  },
];

export const useWalkthroughStore = create<WalkthroughState>((set, get) => ({
  isCompleted: false,
  isLoading: true,
  tasks: defaultTasks,

  initializeWalkthrough: async () => {
    const { user } = useAuthStore.getState();
    if (!user) {
      set({ isLoading: false });
      return;
    }

    // Always read from Firestore to get the source of truth
    // Don't rely on local state which might be stale, especially after logout/login
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        const isCompleted = data.walkthroughCompleted || false;
        const savedTasks = data.walkthroughTasks || defaultTasks;

        set({
          isCompleted,
          tasks: savedTasks,
          isLoading: false,
        });
      } else {
        // First time user - create user document
        await setDoc(userDocRef, {
          walkthroughCompleted: false,
          walkthroughTasks: defaultTasks,
          createdAt: new Date().toISOString(),
        });
        set({ isCompleted: false, tasks: defaultTasks, isLoading: false });
      }
    } catch (error) {
      console.error('Error initializing walkthrough:', error);
      // On error, default to showing walkthrough (safer than hiding it incorrectly)
      // This ensures users can complete it even if there's a Firestore issue
      set({ 
        isLoading: false,
        isCompleted: false,
        tasks: defaultTasks
      });
    }
  },

  checkTask: async (taskId: string) => {
    const { tasks, isCompleted } = get();
    if (isCompleted) return;

    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: true } : task
    );

    set({ tasks: updatedTasks });

    // Save to Firestore
    const { user } = useAuthStore.getState();
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          walkthroughTasks: updatedTasks,
        }, { merge: true });

        // Check if all tasks are completed
        const allCompleted = updatedTasks.every((task) => task.completed);
        if (allCompleted) {
          await get().completeWalkthrough();
        }
      } catch (error) {
        console.error('Error updating task:', error);
      }
    }
  },

  completeWalkthrough: async () => {
    // Set state immediately for better UX, then save to Firestore
    set({ isCompleted: true });
    
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        walkthroughCompleted: true,
        walkthroughCompletedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error('Error saving completion to Firestore:', error);
      // State is already updated, so user experience is not affected
    }
  },

  skipWalkthrough: async () => {
    await get().completeWalkthrough();
  },

  resetWalkthrough: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        walkthroughCompleted: false,
        walkthroughTasks: defaultTasks,
      }, { merge: true });

      set({ isCompleted: false, tasks: defaultTasks });
    } catch (error) {
      console.error('Error resetting walkthrough:', error);
    }
  },
}));

