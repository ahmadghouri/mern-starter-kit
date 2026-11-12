import { useState } from 'react';
import { Link } from 'react-router';
import { LogOut, Mail, ShieldCheck, UserPen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/features/auth/auth-context';
import { SessionList } from '@/features/auth/SessionList';
import { useSessions } from '@/features/auth/use-sessions';

export function DashboardPage() {
  const { user, logoutAll } = useAuth();
  const { sessions, status, error, reload, revoke } = useSessions();
  const [signingOutAll, setSigningOutAll] = useState(false);

  async function handleLogoutAll() {
    setSigningOutAll(true);
    try {
      await logoutAll();
    } catch {
      // logoutAll() always clears local state, even when the request fails.
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h1>
        <p className="text-muted-foreground">You are signed in. Manage your account below.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details.</CardDescription>
          <CardAction>
            <Button asChild variant="outline" size="sm">
              <Link to="/profile">
                <UserPen aria-hidden="true" />
                Edit profile
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
            {user.email}
          </p>
          <p className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            Role <Badge variant="outline">{user.role}</Badge>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
          <CardAction>
            <ConfirmDialog
              title="Sign out everywhere?"
              description="All your devices, including this one, will be signed out."
              confirmLabel="Sign out everywhere"
              destructive
              onConfirm={handleLogoutAll}
            >
              <Button variant="outline" size="sm" disabled={signingOutAll}>
                {signingOutAll ? <Spinner label="Signing out" /> : <LogOut aria-hidden="true" />}
                Sign out everywhere
              </Button>
            </ConfirmDialog>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SessionList
            sessions={sessions}
            status={status}
            error={error}
            onRevoke={revoke}
            onRetry={reload}
          />
        </CardContent>
      </Card>
    </div>
  );
}
