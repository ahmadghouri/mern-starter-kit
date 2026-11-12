import { Route, Routes } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from '@/features/auth/route-guards';
import { AdminPage } from '@/pages/AdminPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Reachable signed in or out: the link arrives by email. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route element={<RoleRoute role="admin" />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
