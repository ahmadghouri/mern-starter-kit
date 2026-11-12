import { useState } from 'react';
import { LogOut, RefreshCw, ShieldMinus, ShieldPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { FormAlert } from '@/components/form/FormAlert';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { UserAvatar } from '@/components/UserAvatar';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function UserRow({ user, isCurrentUser, onChangeRole, onRevokeSessions }) {
  const [pendingAction, setPendingAction] = useState(null);
  const [error, setError] = useState(null);
  const nextRole = user.role === 'admin' ? 'user' : 'admin';

  async function run(action, callback) {
    setPendingAction(action);
    setError(null);
    try {
      await callback();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <tr className="border-b last:border-0">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} className="hidden sm:inline-flex" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium">
              {user.name}
              {isCurrentUser && <Badge variant="secondary">You</Badge>}
            </p>
            <p className="text-muted-foreground">{user.email}</p>
            {error && <p className="text-destructive">{error}</p>}
          </div>
        </div>
      </td>
      <td className="py-3 pr-4">
        <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>{user.role}</Badge>
      </td>
      <td className="hidden py-3 pr-4 tabular-nums md:table-cell">{user.activeSessions}</td>
      <td className="hidden py-3 pr-4 text-muted-foreground md:table-cell">
        {dateFormatter.format(new Date(user.createdAt))}
      </td>
      <td className="py-3 text-right">
        {!isCurrentUser && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pendingAction !== null}
              onClick={() => run('role', () => onChangeRole(user.id, nextRole))}
              aria-label={`${nextRole === 'admin' ? 'Make admin' : 'Remove admin'}: ${user.email}`}
            >
              {pendingAction === 'role' ? (
                <Spinner label="Updating role" />
              ) : nextRole === 'admin' ? (
                <ShieldPlus aria-hidden="true" />
              ) : (
                <ShieldMinus aria-hidden="true" />
              )}
              {nextRole === 'admin' ? 'Make admin' : 'Remove admin'}
            </Button>
            <ConfirmDialog
              title="Sign out this user?"
              description={`${user.name} (${user.email}) will be signed out on every device.`}
              confirmLabel="Sign out user"
              destructive
              onConfirm={() => run('sessions', () => onRevokeSessions(user.id))}
            >
              <Button
                variant="ghost"
                size="sm"
                disabled={pendingAction !== null || user.activeSessions === 0}
                aria-label={`Sign out everywhere: ${user.email}`}
              >
                {pendingAction === 'sessions' ? (
                  <Spinner label="Signing out user" />
                ) : (
                  <LogOut aria-hidden="true" />
                )}
                Sign out
              </Button>
            </ConfirmDialog>
          </div>
        )}
      </td>
    </tr>
  );
}

export function UsersTable({
  users,
  status,
  error,
  currentUserId,
  onChangeRole,
  onRevokeSessions,
  onRetry,
}) {
  if (status === 'error') {
    return (
      <div className="grid gap-3">
        <FormAlert message={error} />
        <Button variant="outline" size="sm" className="w-fit" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      </div>
    );
  }

  if (status === 'loading' && users.length === 0) {
    return (
      <div className="grid gap-3" aria-label="Loading users">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">No users match your filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" aria-label="Users" aria-busy={status === 'loading'}>
        <thead className="border-b text-muted-foreground">
          <tr>
            <th scope="col" className="pb-2 pr-4 font-medium">User</th>
            <th scope="col" className="pb-2 pr-4 font-medium">Role</th>
            <th scope="col" className="hidden pb-2 pr-4 font-medium md:table-cell">Sessions</th>
            <th scope="col" className="hidden pb-2 pr-4 font-medium md:table-cell">Joined</th>
            <th scope="col" className="pb-2 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              isCurrentUser={user.id === currentUserId}
              onChangeRole={onChangeRole}
              onRevokeSessions={onRevokeSessions}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
