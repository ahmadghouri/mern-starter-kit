import { screen, within } from '@testing-library/react';
import { authResponse, mockApi, testUser } from '@/test/mock-api';
import { renderApp } from '@/test/render';

const adminUser = { ...testUser, id: 'admin-1', name: 'Admin User', role: 'admin' };

const stats = { totalUsers: 2, admins: 1, newUsersLast7Days: 1, activeSessions: 3 };

const users = [
  { ...adminUser, activeSessions: 2 },
  {
    id: 'user-2',
    name: 'Sara Khan',
    email: 'sara@example.com',
    role: 'user',
    createdAt: '2026-02-01T00:00:00.000Z',
    activeSessions: 1,
  },
];

const usersResponse = (list = users, pagination = { page: 1, limit: 10, total: list.length, totalPages: 1 }) => ({
  status: 200,
  body: { data: { users: list, pagination } },
});

const adminRoutes = {
  'POST /api/auth/refresh': authResponse(adminUser),
  'GET /api/auth/sessions': { status: 200, body: { data: { sessions: [] } } },
  'GET /api/admin/stats': { status: 200, body: { data: { stats } } },
  'GET /api/admin/users?page=1&limit=10': usersResponse(),
};

describe('AdminPage', () => {
  it('redirects non-admin users to the dashboard', async () => {
    mockApi({ ...adminRoutes, 'POST /api/auth/refresh': authResponse(testUser) });
    renderApp('/admin');

    expect(
      await screen.findByRole('heading', { name: `Welcome, ${testUser.name}` }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('shows the admin link in the header for admins', async () => {
    mockApi(adminRoutes);
    const { user } = renderApp('/');

    await user.click(await screen.findByRole('link', { name: /admin/i }));

    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  });

  it('shows stats and the user list', async () => {
    mockApi(adminRoutes);
    renderApp('/admin');

    const totalUsers = await screen.findByRole('group', { name: 'Total users' });
    expect(await within(totalUsers).findByText('2')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Active sessions' })).getByText('3')).toBeInTheDocument();

    const table = await screen.findByRole('table', { name: 'Users' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);

    // The signed-in admin cannot act on their own account.
    expect(within(rows[0]).getByText('You')).toBeInTheDocument();
    expect(within(rows[0]).queryByRole('button')).not.toBeInTheDocument();
    expect(within(rows[1]).getByRole('button', { name: 'Make admin: sara@example.com' })).toBeInTheDocument();
  });

  it('promotes a user and reloads the data', async () => {
    const promoted = [users[0], { ...users[1], role: 'admin', activeSessions: 0 }];
    let promotedYet = false;
    const fetchMock = mockApi({
      ...adminRoutes,
      'PATCH /api/admin/users/user-2/role': () => {
        promotedYet = true;
        return { status: 200, body: { data: { user: promoted[1] } } };
      },
      'GET /api/admin/users?page=1&limit=10': () => usersResponse(promotedYet ? promoted : users),
    });
    const { user } = renderApp('/admin');

    await user.click(await screen.findByRole('button', { name: 'Make admin: sara@example.com' }));

    expect(
      await screen.findByRole('button', { name: 'Remove admin: sara@example.com' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users/user-2/role',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ role: 'admin' }) }),
    );
  });

  it('shows an error on the row when an action fails', async () => {
    mockApi({
      ...adminRoutes,
      'DELETE /api/admin/users/user-2/sessions': {
        status: 404,
        body: { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
      },
    });
    const { user } = renderApp('/admin');

    await user.click(
      await screen.findByRole('button', { name: 'Sign out everywhere: sara@example.com' }),
    );
    const dialog = await screen.findByRole('alertdialog', { name: 'Sign out this user?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sign out user' }));

    expect(await screen.findByText('User not found')).toBeInTheDocument();
  });

  it('searches and filters by role', async () => {
    const fetchMock = mockApi({
      ...adminRoutes,
      'GET /api/admin/users?page=1&limit=10&search=sara': usersResponse([users[1]]),
      'GET /api/admin/users?page=1&limit=10&search=sara&role=admin': usersResponse([]),
    });
    const { user } = renderApp('/admin');

    await user.type(await screen.findByRole('searchbox', { name: 'Search users' }), 'sara');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    const table = await screen.findByRole('table', { name: 'Users' });
    await within(table).findByText('Sara Khan');
    expect(within(table).queryByText('Admin User')).not.toBeInTheDocument();

    const roleFilter = screen.getByRole('combobox', { name: 'Filter by role' });
    expect(roleFilter).toHaveTextContent('All roles');
    await user.click(roleFilter);
    await user.click(await screen.findByRole('option', { name: 'Admins' }));
    expect(roleFilter).toHaveTextContent('Admins');

    expect(await screen.findByText('No users match your filters.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/users?page=1&limit=10&search=sara&role=admin',
      expect.anything(),
    );
  });

  it('paginates', async () => {
    mockApi({
      ...adminRoutes,
      'GET /api/admin/users?page=1&limit=10': usersResponse(users, {
        page: 1,
        limit: 10,
        total: 12,
        totalPages: 2,
      }),
      'GET /api/admin/users?page=2&limit=10': usersResponse([users[1]], {
        page: 2,
        limit: 10,
        total: 12,
        totalPages: 2,
      }),
    });
    const { user } = renderApp('/admin');

    await user.click(await screen.findByRole('button', { name: /next/i }));

    expect(await screen.findByText('Page 2 of 2 (12 users)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });
});
