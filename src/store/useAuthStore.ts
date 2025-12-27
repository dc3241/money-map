import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
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
  updateProfile: (displayName: string) => Promise<void>;
  updatePassword: (newPassword: string, currentPassword: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
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

  updateProfile: async (displayName: string) => {
    try {
      set({ error: null, loading: true });
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('No user logged in');
      await updateProfile(user, { displayName: displayName.trim() });
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update profile', loading: false });
      throw error;
    }
  },

  updatePassword: async (newPassword: string, currentPassword: string) => {
    try {
      set({ error: null, loading: true });
      const { user } = useAuthStore.getState();
      if (!user || !user.email) throw new Error('No user logged in');
      
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update password', loading: false });
      throw error;
    }
  },

  setUser: (user: User | null) => set({ user, loading: false }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
}));

// Listen to auth state changes - Firebase handles persistence automatically
onAuthStateChanged(auth, (user) => {
  useAuthStore.getState().setUser(user);
});

