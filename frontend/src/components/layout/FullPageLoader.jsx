import { Spinner } from '@/components/ui/spinner';

export function FullPageLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" label="Loading application" />
    </div>
  );
}
