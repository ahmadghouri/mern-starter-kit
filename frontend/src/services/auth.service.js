import { apiRequest, refreshSession } from '@/lib/api-client';

/** All auth-related API calls. Components should use these, not fetch. */
export const authService = {
  register: (input) => apiRequest('/auth/register', { method: 'POST', body: input, auth: false }),

  login: (credentials) =>
    apiRequest('/auth/login', { method: 'POST', body: credentials, auth: false }),

  refresh: () => refreshSession(),

  logout: () => apiRequest('/auth/logout', { method: 'POST', auth: false }),

  logoutAll: () => apiRequest('/auth/logout-all', { method: 'POST' }),

  getCurrentUser: () => apiRequest('/auth/me'),

  forgotPassword: (email) =>
    apiRequest('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),

  resetPassword: ({ token, password }) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
      auth: false,
    }),

  listSessions: ({ signal } = {}) => apiRequest('/auth/sessions', { signal }),

  revokeSession: (sessionId) =>
    apiRequest(`/auth/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
};
