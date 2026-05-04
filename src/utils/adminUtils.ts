import { User } from 'firebase/auth';

/**
 * Checks whether the current user has the Firebase custom claim `admin: true`.
 * Admin claims must be set server-side via Firebase Admin SDK.
 */
export const isAdmin = async (user: User | null): Promise<boolean> => {
  if (!user) return false;
  const tokenResult = await user.getIdTokenResult();
  return tokenResult.claims.admin === true;
};
