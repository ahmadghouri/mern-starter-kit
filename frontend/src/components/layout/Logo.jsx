import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold', className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ShieldCheck className="size-4" aria-hidden="true" />
      </span>
      <span>Starter Kit</span>
    </span>
  );
}
