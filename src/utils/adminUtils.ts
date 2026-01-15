import { User } from 'firebase/auth';

/**
 * Check if a user is an admin
 * Currently checks against environment variable VITE_ADMIN_EMAIL
 * 
 * Setup:
 * 1. Create a .env file in the project root (if it doesn't exist)
 * 2. Add: VITE_ADMIN_EMAIL=your-email@example.com
 * 3. Restart your development server
 * 
 * For production, you may want to use Firebase Custom Claims or a Firestore admin list
 * for better security and scalability.
 */
export const isAdmin = (user: User | null): boolean => {
  if (!user || !user.email) return false;
  
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('VITE_ADMIN_EMAIL not set in environment variables');
    return false;
  }
  
  return user.email.toLowerCase() === adminEmail.toLowerCase();
};
