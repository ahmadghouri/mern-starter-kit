import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

/**
 * Returns `{ status, user, login, register, logout, logoutAll, updateUser }`.
 * `status` is "loading", "authenticated", or "unauthenticated".
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
