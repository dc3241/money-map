import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="120" height="120" fill="#334155" rx="20" />
      <g transform="translate(30, 30)">
        <rect x="0" y="0" width="18" height="18" fill="rgba(16, 185, 129, 0.2)" rx="2" />
        <rect x="21" y="0" width="18" height="18" fill="#10B981" rx="2" />
        <rect x="42" y="0" width="18" height="18" fill="rgba(16, 185, 129, 0.2)" rx="2" />
        <rect x="0" y="21" width="18" height="18" fill="#10B981" rx="2" />
        <rect x="21" y="21" width="18" height="18" fill="rgba(16, 185, 129, 0.2)" rx="2" />
        <rect x="42" y="21" width="18" height="18" fill="#10B981" rx="2" />
        <rect x="0" y="42" width="18" height="18" fill="#10B981" rx="2" />
        <rect x="21" y="42" width="18" height="18" fill="rgba(16, 185, 129, 0.2)" rx="2" />
        <rect x="42" y="42" width="18" height="18" fill="#10B981" rx="2" />
      </g>
    </svg>
  );
}

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const { signIn, signUp, signInWithGoogle, error, loading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      // Error is handled by the store
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      // Error is handled by the store
    }
  };

  const displayError = localError || error;

  const inputClassName =
    'w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted ' +
    'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors';

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-bg-app px-4"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(79,127,255,0.12) 0%, transparent 70%)',
      }}
    >
      <div className="max-w-md w-full">
        <div className="bg-surface-1 border border-border-subtle rounded-lg p-8 shadow-xl shadow-black/20">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <LogoMark size={48} />
            </div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-text-primary mb-2">
              Money Maps
            </h1>
            <p className="text-text-secondary">
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </p>
          </div>

          {displayError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClassName}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClassName}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white py-2.5 px-4 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-surface-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-subtle" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface-1 text-text-muted">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="mt-4 w-full flex items-center justify-center gap-3 bg-surface-2 border border-border-subtle text-text-primary py-2.5 px-4 rounded-lg hover:bg-surface-3 hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-surface-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setLocalError('');
                useAuthStore.getState().setError(null);
              }}
              className="text-sm text-accent hover:text-text-primary transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
