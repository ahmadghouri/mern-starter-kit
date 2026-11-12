import { Link } from 'react-router';
import { Fingerprint, KeyRound, MonitorSmartphone } from 'lucide-react';
import illustrationUrl from '@/assets/auth-illustration.svg';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

const HIGHLIGHTS = [
  { icon: Fingerprint, text: 'Short-lived access tokens kept in memory' },
  { icon: KeyRound, text: 'Rotating refresh tokens in httpOnly cookies' },
  { icon: MonitorSmartphone, text: 'See and sign out of every device' },
];

/** Split layout used by login, register, and password pages. */
export function AuthLayout({ title, description, children, footer }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between bg-muted p-10 lg:flex">
        <Link to="/" aria-label="Starter Kit home">
          <Logo />
        </Link>
        <img
          src={illustrationUrl}
          alt=""
          width={400}
          height={320}
          className="mx-auto w-full max-w-sm dark:invert"
          decoding="async"
        />
        <ul className="space-y-3 text-sm text-muted-foreground">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <Icon className="size-4 text-foreground" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex flex-col p-6 md:p-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Link to="/" className="lg:hidden" aria-label="Starter Kit home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-xl">
                <h1>{title}</h1>
              </CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className="grid gap-6">
              {children}
              {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
