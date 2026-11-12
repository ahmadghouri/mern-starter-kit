import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isDarkActive, setTheme, useTheme } from '@/lib/theme';

/** Quick light/dark switch. The profile page also offers "system". */
export function ThemeToggle() {
  // Subscribing re-renders this button when the theme changes elsewhere.
  useTheme();
  const isDark = isDarkActive();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
