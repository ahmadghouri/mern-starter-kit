import { MonitorSmartphone, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FormAlert } from '@/components/form/FormAlert';

const STAT_ITEMS = [
  { key: 'totalUsers', label: 'Total users', icon: Users },
  { key: 'admins', label: 'Admins', icon: ShieldCheck },
  { key: 'newUsersLast7Days', label: 'New this week', icon: UserPlus },
  { key: 'activeSessions', label: 'Active sessions', icon: MonitorSmartphone },
];

const numberFormatter = new Intl.NumberFormat();

export function AdminStats({ stats, status, error }) {
  if (status === 'error') {
    return <FormAlert message={error} />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STAT_ITEMS.map(({ key, label, icon: Icon }) => (
        <Card key={key} className="gap-2 py-4" role="group" aria-label={label}>
          <CardHeader className="flex items-center justify-between px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent className="px-4">
            {stats ? (
              <p className="text-2xl font-semibold tabular-nums">
                {numberFormatter.format(stats[key])}
              </p>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
