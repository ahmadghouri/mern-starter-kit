import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/** Full-width submit button that shows a spinner and disables itself while pending. */
export function SubmitButton({ pending, icon: Icon, pendingLabel, children, className, ...props }) {
  return (
    <Button
      type="submit"
      className={cn('w-full', className)}
      disabled={pending}
      aria-busy={pending}
      {...props}
    >
      {pending ? <Spinner label={pendingLabel ?? 'Submitting'} /> : Icon && <Icon aria-hidden="true" />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
