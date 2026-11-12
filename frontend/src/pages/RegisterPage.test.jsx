import { screen } from '@testing-library/react';
import { authResponse, mockApi, unauthorized } from '@/test/mock-api';
import { renderApp } from '@/test/render';

const routes = {
  'POST /api/auth/refresh': unauthorized(),
  'GET /api/auth/sessions': { status: 200, body: { data: { sessions: [] } } },
};

async function fillForm(user, overrides = {}) {
  const values = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Password123',
    confirm: 'Password123',
    ...overrides,
  };
  await user.type(await screen.findByLabelText('Name'), values.name);
  await user.type(screen.getByLabelText('Email'), values.email);
  await user.type(screen.getByLabelText('Password'), values.password);
  await user.type(screen.getByLabelText('Confirm password'), values.confirm);
  await user.click(screen.getByRole('button', { name: /create account/i }));
}

describe('RegisterPage', () => {
  it('validates the password policy and confirmation', async () => {
    mockApi(routes);
    const { user } = renderApp('/register');

    await fillForm(user, { password: 'short', confirm: 'different' });

    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('creates the account and opens the dashboard', async () => {
    const fetchMock = mockApi({ ...routes, 'POST /api/auth/register': authResponse() });
    const { user } = renderApp('/register');

    await fillForm(user);

    expect(await screen.findByRole('heading', { name: /welcome/i })).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/auth/register');
    // confirmPassword stays on the client.
    expect(JSON.parse(call[1].body)).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Password123',
    });
  });

  it('shows a duplicate email error from the server', async () => {
    mockApi({
      ...routes,
      'POST /api/auth/register': {
        status: 409,
        body: { error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists' } },
      },
    });
    const { user } = renderApp('/register');

    await fillForm(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists',
    );
  });
});
