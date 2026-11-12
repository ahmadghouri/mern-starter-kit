import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setTheme, useTheme } from '@/lib/theme';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/** Light, dark, or follow the operating system. Saved in this browser. */
export function AppearanceSection() {
  const theme = useTheme();

  return (
    <fieldset className="grid gap-3">
      <legend className="sr-only">Theme</legend>
      <div className="grid grid-cols-3 gap-3">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors hover:bg-accent has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
              theme === value && 'border-primary bg-accent',
            )}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value)}
              className="sr-only"
            />
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
