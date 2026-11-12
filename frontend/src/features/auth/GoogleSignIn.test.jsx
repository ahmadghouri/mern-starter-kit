import { screen, waitFor, within } from '@testing-library/react';
import { authResponse, mockApi, testUser, unauthorized } from '@/test/mock-api';
import { renderApp } from '@/test/render';

const providers = (google) => ({ status: 200, body: { data: { providers: { google } } } });

const signedOut = { 'POST /api/auth/refresh': unauthorized() };

describe('Google sign-in button', () => {
  it.each(['/login', '/register'])('shows "Continue with Google" on %s when enabled', async (path) => {
    mockApi({ ...signedOut, 'GET /api/auth/providers': providers(true) });
    renderApp(path);

    const link = await screen.findByRole('link', { name: 'Continue with Google' });
    expect(link).toHaveAttribute('href', '/api/auth/google');
  });

  it('is hidden when Google is disabled in the backend .env', async () => {
    const fetchMock = mockApi({ ...signedOut, 'GET /api/auth/providers': providers(false) });
    renderApp('/login');

    await screen.findByRole('heading', { name: 'Sign in' });
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/providers', expect.anything()),
    );
    expect(screen.queryByRole('link', { name: 'Continue with Google' })).not.toBeInTheDocument();
  });

  it('shows a readable message when Google redirects back with an error', async () => {
    mockApi({ ...signedOut, 'GET /api/auth/providers': providers(true) });
    renderApp('/login?error=google_account_exists');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists. Sign in with your password, then connect Google from your profile.',
    );
  });

  it('ignores unrelated error codes', async () => {
    mockApi({ ...signedOut, 'GET /api/auth/providers': providers(true) });
    renderApp('/login?error=<script>');

    await screen.findByRole('link', { name: 'Continue with Google' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Connected accounts on the profile page', () => {
  const signedIn = (user) => ({
    'POST /api/auth/refresh': authResponse(user),
    'GET /api/auth/providers': providers(true),
  });

  it('offers to connect Google', async () => {
    mockApi(signedIn({ ...testUser, googleLinked: false }));
    renderApp('/profile');

    const link = await screen.findByRole('link', { name: 'Connect Google' });
    expect(link).toHaveAttribute('href', '/api/auth/google?intent=link');
  });

  it('confirms the connection after Google redirects back', async () => {
    mockApi(signedIn({ ...testUser, googleLinked: true }));
    renderApp('/profile?google=linked');

    expect(await screen.findByText(/Google account connected/)).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('disconnects Google after confirmation', async () => {
    const fetchMock = mockApi({
      ...signedIn({ ...testUser, googleLinked: true }),
      'DELETE /api/profile/google': {
        status: 200,
        body: { data: { user: { ...testUser, googleLinked: false } } },
      },
    });
    const { user } = renderApp('/profile');

    await user.click(await screen.findByRole('button', { name: 'Disconnect' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Disconnect Google?' });
    await user.click(within(dialog).getByRole('button', { name: 'Disconnect' }));

    expect(await screen.findByRole('link', { name: 'Connect Google' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile/google',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('shows why disconnecting is blocked for accounts without a password', async () => {
    mockApi({
      ...signedIn({ ...testUser, googleLinked: true }),
      'DELETE /api/profile/google': {
        status: 400,
        body: { error: { code: 'NO_PASSWORD_SET', message: 'Set a password first.' } },
      },
    });
    const { user } = renderApp('/profile');

    await user.click(await screen.findByRole('button', { name: 'Disconnect' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Disconnect' }));

    expect(await screen.findByText('Set a password first.')).toBeInTheDocument();
  });

  it('hides the section when Google is disabled and not connected', async () => {
    mockApi({ ...signedIn(testUser), 'GET /api/auth/providers': providers(false) });
    renderApp('/profile');

    await screen.findByRole('heading', { name: 'Profile', level: 1 });
    expect(screen.queryByRole('heading', { name: 'Connected accounts' })).not.toBeInTheDocument();
  });
});
