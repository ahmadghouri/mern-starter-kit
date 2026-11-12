import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/features/auth/auth-context';
import { Logo } from './Logo';

/** Layout for signed-in pages: header with user name and sign out. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      // logout() always clears local state, even when the request fails.
    }
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 md:px-6">
          <Link to="/" aria-label="Starter Kit home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {user?.role === 'admin' && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin">
                  <LayoutDashboard aria-hidden="true" />
                  Admin
                </Link>
              </Button>
            )}
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-full pr-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:pr-2"
              aria-label="Profile"
            >
              <UserAvatar user={user} className="size-8 text-xs" />
              <span className="hidden sm:inline">{user?.name}</span>
            </Link>
            <ConfirmDialog
              title="Sign out?"
              description="You will need to sign in again to use your account on this device."
              confirmLabel="Sign out"
              onConfirm={handleLogout}
            >
              <Button variant="outline" size="sm" disabled={signingOut}>
                {signingOut ? <Spinner label="Signing out" /> : <LogOut aria-hidden="true" />}
                Sign out
              </Button>
            </ConfirmDialog>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <Outlet />
      </main>
    </div>
  );
}
