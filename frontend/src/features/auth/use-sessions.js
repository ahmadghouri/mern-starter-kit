import { useCallback, useEffect, useState } from 'react';
import { authService } from '@/services/auth.service';

/** Loads the signed-in user's active sessions and exposes a revoke action. */
export function useSessions() {
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    authService
      .listSessions({ signal: controller.signal })
      .then((data) => {
        setSessions(data.sessions);
        setError(null);
        setStatus('success');
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return;
        setError(requestError.message);
        setStatus('error');
      });

    return () => controller.abort();
  }, [reloadKey]);

  const reload = useCallback(() => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  }, []);

  const revoke = useCallback(async (sessionId) => {
    await authService.revokeSession(sessionId);
    setSessions((current) => current.filter((session) => session.id !== sessionId));
  }, []);

  return { sessions, status, error, reload, revoke };
}
