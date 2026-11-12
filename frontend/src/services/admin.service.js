import { apiRequest } from '@/lib/api-client';

function toQueryString(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

/** Admin-only API calls. The backend rejects them for non-admin users. */
export const adminService = {
  getStats: ({ signal } = {}) => apiRequest('/admin/stats', { signal }),

  listUsers: ({ page, limit, search, role } = {}, { signal } = {}) =>
    apiRequest(`/admin/users${toQueryString({ page, limit, search, role })}`, { signal }),

  updateUserRole: (userId, role) =>
    apiRequest(`/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: { role },
    }),

  revokeUserSessions: (userId) =>
    apiRequest(`/admin/users/${encodeURIComponent(userId)}/sessions`, { method: 'DELETE' }),
};
