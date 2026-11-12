// Only VITE_* variables are exposed to the browser. Never put secrets here.
export const env = Object.freeze({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
});
