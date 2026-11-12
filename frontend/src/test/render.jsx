import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '@/App';
import { AuthProvider } from '@/features/auth/AuthProvider';

/** Renders the full app (auth provider + routes) at the given URL. */
export function renderApp(route = '/') {
  const user = userEvent.setup();
  const utils = render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
  return { user, ...utils };
}
