import '@testing-library/jest-dom';
import { resetProvidersCache } from '@/features/auth/google';
import { setAccessToken } from '@/lib/api-client';

afterEach(() => {
  setAccessToken(null);
  resetProvidersCache();
  jest.restoreAllMocks();
  delete globalThis.fetch;
});
