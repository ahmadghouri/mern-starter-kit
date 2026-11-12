import { screen, within } from '@testing-library/react';
import { authResponse, mockApi, testUser, unauthorized } from '@/test/mock-api';
import { renderApp } from '@/test/render';

const sessions = [
  {
    id: 'session-current',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0',
    ip: '127.0.0.1',
    lastUsedAt: '2026-01-01T10:00:00.000Z',
    current: true,
  },
  {
    id: 'session-phone',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/605.1',
    ip: '10.0.0.2',
    lastUsedAt: '2026-01-01T09:00:00.000Z',
    current: false,
  },
];

const signedInRoutes = {
  'POST /api/auth/refresh': authResponse(),
  'GET /api/auth/sessions': { status: 200, body: { data: { sessions } } },
};

describe('protected routes', () => {
  it('redirects signed-out users to the login page', async () => {
    mockApi({ 'POST /api/auth/refresh': unauthorized() });
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('restores the session from the refresh cookie', async () => {
    mockApi(signedInRoutes);
    renderApp('/');

    expect(
      await screen.findByRole('heading', { name: `Welcome, ${testUser.name}` }),
    ).toBeInTheDocument();
    expect(screen.getByText(testUser.email)).toBeInTheDocument();
  });
});

describe('DashboardPage', () => {
  it('lists sessions and marks the current device', async () => {
    mockApi(signedInRoutes);
    renderApp('/');

    const list = await screen.findByRole('list', { name: 'Active sessions' });
    const items = within(list).getAllByRole('listitem');

    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Chrome on Windows')).toBeInTheDocument();
    expect(within(items[0]).getByText('This device')).toBeInTheDocument();
    expect(within(items[1]).getByText('Safari on iOS')).toBeInTheDocument();
  });

  it('signs out another device', async () => {
    const fetchMock = mockApi({
      ...signedInRoutes,
      'DELETE /api/auth/sessions/session-phone': { status: 204 },
    });
    const { user } = renderApp('/');

    await user.click(await screen.findByRole('button', { name: 'Sign out Safari on iOS' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Sign out this device?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sign out device' }));

    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/sessions/session-phone',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('signs out and returns to the login page', async () => {
    mockApi({ ...signedInRoutes, 'POST /api/auth/logout': { status: 204 } });
    const { user } = renderApp('/');

    await user.click(await screen.findByRole('button', { name: /^sign out$/i }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Sign out?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('stays signed in when sign out is cancelled', async () => {
    const fetchMock = mockApi({ ...signedInRoutes, 'POST /api/auth/logout': { status: 204 } });
    const { user } = renderApp('/');

    await user.click(await screen.findByRole('button', { name: /^sign out$/i }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Sign out?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: `Welcome, ${testUser.name}` })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/auth/logout', expect.anything());
  });

  it('asks before signing out everywhere', async () => {
    mockApi({ ...signedInRoutes, 'POST /api/auth/logout-all': { status: 204 } });
    const { user } = renderApp('/');

    await user.click(await screen.findByRole('button', { name: 'Sign out everywhere' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Sign out everywhere?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sign out everywhere' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows an error with retry when sessions fail to load', async () => {
    mockApi({
      ...signedInRoutes,
      'GET /api/auth/sessions': {
        status: 500,
        body: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
      },
    });
    renderApp('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
