import { CircleAlert, CircleCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/** Form-level success or error message. Renders nothing without a message. */
export function FormAlert({ variant = 'destructive', message }) {
  if (!message) {
    return null;
  }

  const Icon = variant === 'success' ? CircleCheck : CircleAlert;

  return (
    <Alert variant={variant}>
      <Icon aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
