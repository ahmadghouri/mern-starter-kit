import { useCallback, useEffect, useState } from 'react';
import { adminService } from '@/services/admin.service';

/**
 * Runs `load(signal)` whenever `deps` change or `reload()` is called.
 * Follows the same request-state pattern as `useSessions`.
 */
function useAsyncData(load, deps) {
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = JSON.stringify([...deps, reloadKey]);
  // The last finished request. Previous data stays visible while the next one loads.
  const [result, setResult] = useState({ key: null, status: 'loading', data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();

    load(controller.signal)
      .then((data) => setResult({ key: requestKey, status: 'success', data, error: null }))
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return;
        setResult((previous) => ({
          key: requestKey,
          status: 'error',
          data: previous.data,
          error: requestError.message,
        }));
      });

    return () => controller.abort();
    // `load` is recreated on every render; `requestKey` captures what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const status = result.key === requestKey ? result.status : 'loading';

  return { data: result.data, status, error: result.error, reload };
}

/** Dashboard counters: users, admins, new users, active sessions. */
export function useAdminStats() {
  const { data, ...rest } = useAsyncData(
    (signal) => adminService.getStats({ signal }).then((result) => result.stats),
    [],
  );
  return { stats: data, ...rest };
}

/** Paginated, filterable user list. */
export function useAdminUsers({ page, limit, search, role }) {
  const { data, ...rest } = useAsyncData(
    (signal) => adminService.listUsers({ page, limit, search, role }, { signal }),
    [page, limit, search, role],
  );
  return { users: data?.users ?? [], pagination: data?.pagination ?? null, ...rest };
}
