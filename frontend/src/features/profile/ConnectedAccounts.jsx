import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Unlink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormAlert } from '@/components/form/FormAlert';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { useAuth } from '@/features/auth/auth-context';
import { getGoogleErrorMessage, googleConnectUrl } from '@/features/auth/google';
import { profileService } from '@/services/profile.service';

/** Google connection status. Hidden when Google is off and not connected. */
export function ConnectedAccounts({ googleEnabled }) {
  const { user, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  // Messages from the Google redirect (?google=linked or ?error=google_...).
  const linkedNotice =
    searchParams.get('google') === 'linked' && user.googleLinked
      ? 'Google account connected. You can now sign in with Google.'
      : null;
  const redirectError = getGoogleErrorMessage(searchParams.get('error'));

  async function handleDisconnect() {
    setPending(true);
    setError(null);
    try {
      const data = await profileService.disconnectGoogle();
      updateUser(data.user);
    } catch (disconnectError) {
      setError(disconnectError.message);
    } finally {
      setPending(false);
    }
  }

  if (!googleEnabled && !user.googleLinked) {
    return <p className="text-sm text-muted-foreground">No sign-in providers are enabled.</p>;
  }

  return (
    <div className="grid gap-4">
      <FormAlert variant="success" message={linkedNotice} />
      <FormAlert message={error ?? redirectError} />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <GoogleIcon className="size-5" />
          </span>
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              Google
              {user.googleLinked && <Badge variant="secondary">Connected</Badge>}
            </p>
            <p className="text-sm text-muted-foreground">
              {user.googleLinked
                ? 'You can sign in with your Google account.'
                : 'Connect to sign in with one click.'}
            </p>
          </div>
        </div>

        {user.googleLinked ? (
          <ConfirmDialog
            title="Disconnect Google?"
            description="You will no longer be able to sign in with Google. Make sure you know your password."
            confirmLabel="Disconnect"
            destructive
            onConfirm={handleDisconnect}
          >
            <Button variant="outline" size="sm" disabled={pending}>
              {pending ? <Spinner label="Disconnecting" /> : <Unlink aria-hidden="true" />}
              Disconnect
            </Button>
          </ConfirmDialog>
        ) : (
          <Button asChild variant="outline" size="sm">
            <a href={googleConnectUrl}>
              <GoogleIcon className="size-4" />
              Connect Google
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
