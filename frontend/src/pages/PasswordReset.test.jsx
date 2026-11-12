import { screen } from '@testing-library/react';
import { mockApi, unauthorized } from '@/test/mock-api';
import { renderApp } from '@/test/render';

const RESET_MESSAGE = 'If an account exists for this email, a password reset link has been sent.';

describe('ForgotPasswordPage', () => {
  it('shows the generic confirmation after submitting', async () => {
    const fetchMock = mockApi({
      'POST /api/auth/refresh': unauthorized(),
      'POST /api/auth/forgot-password': { status: 200, body: { data: { message: RESET_MESSAGE } } },
    });
    const { user } = renderApp('/forgot-password');

    await user.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(RESET_MESSAGE);
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/auth/forgot-password');
    expect(JSON.parse(call[1].body)).toEqual({ email: 'jane@example.com' });
  });
});

describe('ResetPasswordPage', () => {
  it('explains when the token is missing', async () => {
    mockApi({ 'POST /api/auth/refresh': unauthorized() });
    renderApp('/reset-password');

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or incomplete/i);
    expect(screen.getByRole('link', { name: /request a new reset link/i })).toBeInTheDocument();
  });

  it('resets the password and returns to sign in with a notice', async () => {
    const fetchMock = mockApi({
      'POST /api/auth/refresh': unauthorized(),
      'POST /api/auth/reset-password': {
        status: 200,
        body: { data: { message: 'Your password has been updated. Please sign in.' } },
      },
    });
    const { user } = renderApp('/reset-password?token=reset-token-value');

    await user.type(await screen.findByLabelText('New password'), 'NewPassword456');
    await user.type(screen.getByLabelText('Confirm new password'), 'NewPassword456');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Your password has been updated');
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/auth/reset-password');
    expect(JSON.parse(call[1].body)).toEqual({
      token: 'reset-token-value',
      password: 'NewPassword456',
    });
  });

  it('shows an expired-token error from the server', async () => {
    mockApi({
      'POST /api/auth/refresh': unauthorized(),
      'POST /api/auth/reset-password': {
        status: 400,
        body: {
          error: {
            code: 'INVALID_RESET_TOKEN',
            message: 'This reset link is invalid or has expired.',
          },
        },
      },
    });
    const { user } = renderApp('/reset-password?token=old-token');

    await user.type(await screen.findByLabelText('New password'), 'NewPassword456');
    await user.type(screen.getByLabelText('Confirm new password'), 'NewPassword456');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i);
  });
});
