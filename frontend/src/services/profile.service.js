import { apiRequest } from '@/lib/api-client';

/** The signed-in user's own profile. */
export const profileService = {
  updateProfile: ({ name }) => apiRequest('/profile', { method: 'PATCH', body: { name } }),

  changeEmail: ({ email, currentPassword }) =>
    apiRequest('/profile/email', { method: 'PATCH', body: { email, currentPassword } }),

  changePassword: ({ currentPassword, newPassword }) =>
    apiRequest('/profile/password', { method: 'PUT', body: { currentPassword, newPassword } }),

  /** `image` is a Blob (already resized), sent as raw bytes. */
  uploadAvatar: (image) => apiRequest('/profile/avatar', { method: 'PUT', body: image }),

  removeAvatar: () => apiRequest('/profile/avatar', { method: 'DELETE' }),
};
