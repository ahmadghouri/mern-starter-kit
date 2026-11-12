import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function Spinner({ className, label = 'Loading', ...props }) {
  return (
    <LoaderCircle
      role="status"
      aria-label={label}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
