import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageLoader } from '@/components/layout/FullPageLoader';
import { useAuth } from './auth-context';

/** Renders child routes only for signed-in users. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <FullPageLoader />;
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/**
 * Use inside `ProtectedRoute`. Renders child routes only for the given role.
 * This only hides UI; the backend enforces the role on every request.
 */
export function RoleRoute({ role }) {
  const { user } = useAuth();

  if (user?.role !== role) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

/** Renders child routes only for signed-out users (login, register, ...). */
export function PublicOnlyRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <FullPageLoader />;
  }
  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
