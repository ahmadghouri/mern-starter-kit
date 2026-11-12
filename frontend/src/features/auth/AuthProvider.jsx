import { useCallback, useEffect, useMemo, useState } from 'react';
import { onSessionExpired, setAccessToken } from '@/lib/api-client';
import { authService } from '@/services/auth.service';
import { AuthContext } from './auth-context';

const SIGNED_OUT = { status: 'unauthenticated', user: null };

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null });

  // Restore the session from the refresh cookie on first load.
  useEffect(() => {
    let active = true;

    authService
      .refresh()
      .then((data) => {
        if (active) setState({ status: 'authenticated', user: data.user });
      })
      .catch(() => {
        if (active) setState(SIGNED_OUT);
      });

    const unsubscribe = onSessionExpired(() => {
      setAccessToken(null);
      setState(SIGNED_OUT);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const startSession = useCallback((data) => {
    setAccessToken(data.accessToken);
    setState({ status: 'authenticated', user: data.user });
    return data.user;
  }, []);

  const login = useCallback(
    async (credentials) => startSession(await authService.login(credentials)),
    [startSession],
  );

  const register = useCallback(
    async (input) => startSession(await authService.register(input)),
    [startSession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setAccessToken(null);
      setState(SIGNED_OUT);
    }
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await authService.logoutAll();
    } finally {
      setAccessToken(null);
      setState(SIGNED_OUT);
    }
  }, []);

  /** Replaces the signed-in user after a profile change. */
  const updateUser = useCallback((user) => {
    setState((current) =>
      current.status === 'authenticated' ? { ...current, user } : current,
    );
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, logout, logoutAll, updateUser }),
    [state, login, register, logout, logoutAll, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
