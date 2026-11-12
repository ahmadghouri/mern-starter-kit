import { cloneElement, isValidElement, useId } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Label + control + hint/error, with accessible wiring
 * (htmlFor, aria-invalid, aria-describedby) applied to the child control.
 */
export function FormField({ label, error, hint, labelAction, className, children }) {
  const generatedId = useId();
  const controlId = children.props.id ?? generatedId;
  const messageId = `${controlId}-message`;
  const message = error || hint;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })
    : children;

  return (
    <div className={cn('grid gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={controlId}>{label}</Label>
        {labelAction}
      </div>
      {control}
      {message && (
        <p
          id={messageId}
          className={cn('text-sm', error ? 'text-destructive' : 'text-muted-foreground')}
        >
          {message}
        </p>
      )}
    </div>
  );
}
