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

// Helper function to convert Firebase errors to user-friendly messages
const getAuthErrorMessage = (error: any): string => {
  const errorCode = error?.code || '';
  
  switch (errorCode) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    case 'auth/invalid-email':
      return 'Invalid email address. Please check your email and try again.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'An error occurred. Please try again.';
  }
};

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
      const errorMessage = getAuthErrorMessage(error);
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      set({ error: null, loading: true });
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ error: null, loading: true });
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      set({ user: null });
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      set({ error: errorMessage });
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
      const errorMessage = getAuthErrorMessage(error);
      set({ error: errorMessage, loading: false });
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
      const errorMessage = getAuthErrorMessage(error);
      set({ error: errorMessage, loading: false });
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

