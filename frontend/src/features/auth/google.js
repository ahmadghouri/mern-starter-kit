import { useEffect, useState } from 'react';
import { env } from '@/config/env';
import { authService } from '@/services/auth.service';

/** Full-page navigations (not fetch): the backend redirects to Google and back. */
export const googleSignInUrl = `${env.apiBaseUrl}/auth/google`;
export const googleConnectUrl = `${env.apiBaseUrl}/auth/google?intent=link`;

/** Readable messages for the `?error=` codes the backend redirects with. */
const GOOGLE_ERROR_MESSAGES = {
  google_cancelled: 'Google sign-in was cancelled.',
  google_state_invalid:
    'Your Google sign-in expired or was started in another tab. Please try again.',
  google_account_exists:
    'An account with this email already exists. Sign in with your password, then connect Google from your profile.',
  google_email_unverified: 'Your Google email address is not verified.',
  google_unavailable: 'Could not reach Google. Please try again.',
  google_failed: 'Google sign-in failed. Please try again.',
  google_link_signin: 'Please sign in first, then connect Google from your profile.',
  google_already_linked: 'This Google account is already connected to another user.',
  google_other_linked: 'A different Google account is already connected. Disconnect it first.',
};

export function getGoogleErrorMessage(code) {
  if (!code || !code.startsWith('google_')) return null;
  return GOOGLE_ERROR_MESSAGES[code] ?? GOOGLE_ERROR_MESSAGES.google_failed;
}

let providersPromise = null;

/** Loads enabled sign-in providers once per page load. */
function loadProviders() {
  providersPromise ??= authService.getProviders().then(
    (data) => data.providers,
    (error) => {
      providersPromise = null;
      throw error;
    },
  );
  return providersPromise;
}

/** Test helper: forget the cached providers. */
export function resetProvidersCache() {
  providersPromise = null;
}

/** `{ google: boolean }`. Everything is hidden until the backend answers. */
export function useAuthProviders() {
  const [providers, setProviders] = useState({ google: false });

  useEffect(() => {
    let active = true;
    loadProviders()
      .then((result) => {
        if (active) setProviders(result);
      })
      .catch(() => {
        // Optional feature: if the request fails, just do not show the Google button.
      });
    return () => {
      active = false;
    };
  }, []);

  return providers;
}
