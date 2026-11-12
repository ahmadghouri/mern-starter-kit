import { screen, within } from '@testing-library/react';
import { resizeImageForAvatar } from '@/lib/image';
import { setTheme } from '@/lib/theme';
import { authResponse, mockApi, testUser } from '@/test/mock-api';
import { renderApp } from '@/test/render';

// jsdom has no canvas, so image resizing is mocked.
jest.mock('@/lib/image', () => ({
  ...jest.requireActual('@/lib/image'),
  resizeImageForAvatar: jest.fn(),
}));

const userWithAvatar = { ...testUser, avatarVersion: 1700000000000 };

const signedInRoutes = {
  'POST /api/auth/refresh': authResponse({ ...testUser, avatarVersion: null }),
  'GET /api/auth/sessions': { status: 200, body: { data: { sessions: [] } } },
};

const ok = (data) => ({ status: 200, body: { data } });

async function openProfile(routes = {}) {
  const fetchMock = mockApi({ ...signedInRoutes, ...routes });
  const utils = renderApp('/profile');
  await screen.findByRole('heading', { name: 'Profile', level: 1 });
  return { fetchMock, ...utils };
}

const getForm = (name) => screen.getByRole('form', { name });

afterEach(() => {
  setTheme('system');
});

describe('ProfilePage', () => {
  it('is reachable from the header', async () => {
    mockApi(signedInRoutes);
    const { user } = renderApp('/');

    await user.click(await screen.findByRole('link', { name: 'Profile' }));

    expect(await screen.findByRole('heading', { name: 'Profile', level: 1 })).toBeInTheDocument();
  });

  it('updates the name and the header', async () => {
    const { user, fetchMock } = await openProfile({
      'PATCH /api/profile': ok({ user: { ...testUser, name: 'Jane Smith' } }),
    });
    const form = getForm('Personal information');

    await user.clear(within(form).getByLabelText('Name'));
    await user.type(within(form).getByLabelText('Name'), 'Jane Smith');
    await user.click(within(form).getByRole('button', { name: 'Save name' }));

    expect(await within(form).findByText('Your name has been updated.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveTextContent('Jane Smith');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Jane Smith' }) }),
    );
  });

  it('requires the current password to change the email', async () => {
    const { user, fetchMock } = await openProfile();
    const form = getForm('Change email');

    await user.clear(within(form).getByLabelText('Email'));
    await user.type(within(form).getByLabelText('Email'), 'new@example.com');
    await user.click(within(form).getByRole('button', { name: 'Change email' }));

    expect(await within(form).findByText('Current password is required')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/profile/email', expect.anything());
  });

  it('shows the API error on the current password field', async () => {
    const { user } = await openProfile({
      'PATCH /api/profile/email': {
        status: 400,
        body: {
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'Current password is incorrect',
            details: [{ field: 'currentPassword', message: 'Current password is incorrect' }],
          },
        },
      },
    });
    const form = getForm('Change email');

    await user.clear(within(form).getByLabelText('Email'));
    await user.type(within(form).getByLabelText('Email'), 'new@example.com');
    await user.type(within(form).getByLabelText('Current password'), 'WrongPass1');
    await user.click(within(form).getByRole('button', { name: 'Change email' }));

    expect(await within(form).findByRole('alert')).toHaveTextContent('Current password is incorrect');
    expect(within(form).getByLabelText('Current password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('changes the password and clears the form', async () => {
    const { user, fetchMock } = await openProfile({
      'PUT /api/profile/password': ok({
        message: 'Your password has been changed. Other devices were signed out.',
      }),
    });
    const form = getForm('Change password');

    await user.type(within(form).getByLabelText('Current password'), 'Password123');
    await user.type(within(form).getByLabelText('New password'), 'BrandNew123');
    await user.type(within(form).getByLabelText('Confirm new password'), 'BrandNew123');
    await user.click(within(form).getByRole('button', { name: 'Change password' }));

    expect(await within(form).findByText(/other devices were signed out/i)).toBeInTheDocument();
    expect(within(form).getByLabelText('New password')).toHaveValue('');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile/password',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ currentPassword: 'Password123', newPassword: 'BrandNew123' }),
      }),
    );
  });

  it('validates the new password on the client', async () => {
    const { user } = await openProfile();
    const form = getForm('Change password');

    await user.type(within(form).getByLabelText('Current password'), 'Password123');
    await user.type(within(form).getByLabelText('New password'), 'Password123');
    await user.type(within(form).getByLabelText('Confirm new password'), 'Different123');
    await user.click(within(form).getByRole('button', { name: 'Change password' }));

    expect(
      await within(form).findByText('New password must be different from the current password'),
    ).toBeInTheDocument();
    expect(within(form).getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('uploads a resized photo as raw image bytes, then removes it', async () => {
    const resized = new Blob(['webp-bytes'], { type: 'image/webp' });
    resizeImageForAvatar.mockResolvedValue(resized);
    const { user, fetchMock } = await openProfile({
      'PUT /api/profile/avatar': ok({ user: userWithAvatar }),
      'DELETE /api/profile/avatar': ok({ user: { ...testUser, avatarVersion: null } }),
    });

    const file = new File(['raw'], 'me.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Choose profile picture'), file);

    const images = await screen.findAllByRole('img', { name: `${testUser.name} profile picture` });
    expect(images[0]).toHaveAttribute('src', `/api/avatars/${testUser.id}?v=1700000000000`);
    expect(resizeImageForAvatar).toHaveBeenCalledWith(file);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile/avatar',
      expect.objectContaining({
        method: 'PUT',
        body: resized,
        headers: expect.objectContaining({ 'Content-Type': 'image/webp' }),
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Remove photo' }));
    expect(await screen.findByRole('button', { name: 'Upload photo' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /profile picture/ })).not.toBeInTheDocument();
  });

  it('shows an error when the image cannot be processed', async () => {
    resizeImageForAvatar.mockRejectedValue(new Error('This image could not be read'));
    const { user } = await openProfile();

    await user.upload(
      screen.getByLabelText('Choose profile picture'),
      new File(['x'], 'broken.png', { type: 'image/png' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('This image could not be read');
  });

  it('switches between light, dark, and system themes', async () => {
    const { user } = await openProfile();

    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('light');

    await user.click(screen.getByRole('radio', { name: 'System' }));
    expect(localStorage.getItem('theme')).toBeNull();
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
  });
});
