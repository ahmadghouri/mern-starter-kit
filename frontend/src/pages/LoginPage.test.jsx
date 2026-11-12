import { screen } from '@testing-library/react';
import { authResponse, mockApi, testUser, unauthorized } from '@/test/mock-api';
import { renderApp } from '@/test/render';

const signedOutRoutes = {
  'POST /api/auth/refresh': unauthorized(),
  'GET /api/auth/sessions': { status: 200, body: { data: { sessions: [] } } },
};

describe('LoginPage', () => {
  it('shows field errors without calling the API', async () => {
    const fetchMock = mockApi(signedOutRoutes);
    const { user } = renderApp('/login');

    await user.click(await screen.findByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalledWith('/api/auth/login', expect.anything());
  });

  it('signs in and opens the dashboard', async () => {
    const fetchMock = mockApi({ ...signedOutRoutes, 'POST /api/auth/login': authResponse() });
    const { user } = renderApp('/login');

    await user.type(await screen.findByLabelText('Email'), ' Jane@Example.com ');
    await user.type(screen.getByLabelText('Password'), 'Password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByRole('heading', { name: `Welcome, ${testUser.name}` }),
    ).toBeInTheDocument();
    const loginCall = fetchMock.mock.calls.find(([url]) => url === '/api/auth/login');
    expect(JSON.parse(loginCall[1].body)).toEqual({
      email: 'Jane@Example.com',
      password: 'Password123',
    });
  });

  it('shows the server error for invalid credentials', async () => {
    mockApi({
      ...signedOutRoutes,
      'POST /api/auth/login': {
        status: 401,
        body: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
      },
    });
    const { user } = renderApp('/login');

    await user.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('redirects a signed-in user away from the login page', async () => {
    mockApi({ ...signedOutRoutes, 'POST /api/auth/refresh': authResponse() });
    renderApp('/login');

    expect(await screen.findByRole('heading', { name: /welcome/i })).toBeInTheDocument();
  });
});
