import { useSyncExternalStore } from 'react';

/**
 * Theme preference: "light", "dark", or "system" (follow the OS).
 * Stored per browser in localStorage under "theme"; "system" removes the key.
 * index.html applies the same logic before first paint to avoid a flash.
 */
export const THEMES = Object.freeze(['light', 'dark', 'system']);

const STORAGE_KEY = 'theme';
const listeners = new Set();

function readStoredTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark() {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

let currentTheme = typeof window === 'undefined' ? 'system' : readStoredTheme();

function applyTheme(theme) {
  const dark = theme === 'dark' || (theme === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

export function getTheme() {
  return currentTheme;
}

export function setTheme(theme) {
  if (!THEMES.includes(theme)) return;

  currentTheme = theme;
  try {
    if (theme === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode). The theme still applies to this page.
  }
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

/** Whether the page is currently dark (resolves "system"). */
export function isDarkActive() {
  return document.documentElement.classList.contains('dark');
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current theme preference; re-renders when it changes anywhere in the app. */
export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, getTheme);
}
