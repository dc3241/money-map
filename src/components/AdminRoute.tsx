import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { isAdmin } from '../utils/adminUtils';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuthStore();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!user) {
        if (!cancelled) {
          setHasAdminAccess(false);
          setCheckingAdmin(false);
        }
        return;
      }

      setCheckingAdmin(true);
      try {
        const allowed = await isAdmin(user);
        if (!cancelled) {
          setHasAdminAccess(allowed);
        }
      } catch {
        if (!cancelled) {
          setHasAdminAccess(false);
        }
      } finally {
        if (!cancelled) {
          setCheckingAdmin(false);
        }
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAdminAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
