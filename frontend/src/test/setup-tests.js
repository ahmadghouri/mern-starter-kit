import '@testing-library/jest-dom';
import { setAccessToken } from '@/lib/api-client';

afterEach(() => {
  setAccessToken(null);
  jest.restoreAllMocks();
  delete globalThis.fetch;
});
