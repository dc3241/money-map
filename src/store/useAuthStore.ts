import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      error: null,

      signIn: async (email: string, password: string) => {
        try {
          set({ error: null, loading: true });
          await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
          set({ error: error.message || 'Failed to sign in', loading: false });
          throw error;
        }
      },

      signUp: async (email: string, password: string) => {
        try {
          set({ error: null, loading: true });
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
          set({ error: error.message || 'Failed to sign up', loading: false });
          throw error;
        }
      },

      signInWithGoogle: async () => {
        try {
          set({ error: null, loading: true });
          await signInWithPopup(auth, googleProvider);
        } catch (error: any) {
          set({ error: error.message || 'Failed to sign in with Google', loading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await signOut(auth);
          set({ user: null });
        } catch (error: any) {
          set({ error: error.message || 'Failed to logout' });
        }
      },

      setUser: (user: User | null) => set({ user, loading: false }),
      setLoading: (loading: boolean) => set({ loading }),
      setError: (error: string | null) => set({ error }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Listen to auth state changes
onAuthStateChanged(auth, (user) => {
  useAuthStore.getState().setUser(user);
});

