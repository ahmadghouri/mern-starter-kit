import { useState } from 'react';
import { Monitor, RefreshCw, Smartphone, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { FormAlert } from '@/components/form/FormAlert';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const MOBILE_PATTERN = /android|iphone|ipad|mobile/i;
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function describeDevice(userAgent) {
  if (!userAgent) return 'Unknown device';
  const browser = /edg\//i.test(userAgent)
    ? 'Edge'
    : /chrome\//i.test(userAgent)
      ? 'Chrome'
      : /firefox\//i.test(userAgent)
        ? 'Firefox'
        : /safari\//i.test(userAgent)
          ? 'Safari'
          : null;
  const os = /windows/i.test(userAgent)
    ? 'Windows'
    : /android/i.test(userAgent)
      ? 'Android'
      : /iphone|ipad/i.test(userAgent)
        ? 'iOS'
        : /mac os/i.test(userAgent)
          ? 'macOS'
          : /linux/i.test(userAgent)
            ? 'Linux'
            : null;

  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? userAgent.slice(0, 40);
}

function SessionRow({ session, onRevoke }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const DeviceIcon = MOBILE_PATTERN.test(session.userAgent) ? Smartphone : Monitor;

  async function handleRevoke() {
    setPending(true);
    setError(null);
    try {
      await onRevoke(session.id);
    } catch (revokeError) {
      setError(revokeError.message);
      setPending(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-4 py-4">
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
        <DeviceIcon className="size-5 text-muted-foreground" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          {describeDevice(session.userAgent)}
          {session.current && <Badge variant="secondary">This device</Badge>}
        </p>
        <p className="text-sm text-muted-foreground">
          Last active {dateFormatter.format(new Date(session.lastUsedAt))}
          {session.ip && ` · ${session.ip}`}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      {!session.current && (
        <ConfirmDialog
          title="Sign out this device?"
          description={`${describeDevice(session.userAgent)} will be signed out and must sign in again.`}
          confirmLabel="Sign out device"
          onConfirm={handleRevoke}
        >
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            aria-label={`Sign out ${describeDevice(session.userAgent)}`}
          >
            {pending ? <Spinner label="Signing out device" /> : <Trash2 aria-hidden="true" />}
            Sign out
          </Button>
        </ConfirmDialog>
      )}
    </li>
  );
}

export function SessionList({ sessions, status, error, onRevoke, onRetry }) {
  if (status === 'loading') {
    return (
      <div className="grid gap-3" aria-label="Loading sessions">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

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

  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No active sessions.</p>;
  }

  return (
    <ul className="divide-y" aria-label="Active sessions">
      {sessions.map((session) => (
        <SessionRow key={session.id} session={session} onRevoke={onRevoke} />
      ))}
    </ul>
  );
}
