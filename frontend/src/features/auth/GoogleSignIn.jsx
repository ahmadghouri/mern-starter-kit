import { Button } from '@/components/ui/button';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { googleSignInUrl, useAuthProviders } from './google';

/**
 * "Continue with Google" plus an "or" divider. Renders nothing unless the
 * backend has Google configured (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).
 */
export function GoogleSignIn() {
  const { google } = useAuthProviders();

  if (!google) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <Button asChild variant="outline" className="w-full">
        <a href={googleSignInUrl}>
          <GoogleIcon className="size-4" />
          Continue with Google
        </a>
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
