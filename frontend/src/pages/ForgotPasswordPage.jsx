import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { SubmitButton } from '@/components/form/SubmitButton';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { useFormState } from '@/hooks/use-form-state';
import { fieldErrorsFromApi, validateEmail } from '@/lib/validation';
import { authService } from '@/services/auth.service';

export function ForgotPasswordPage() {
  const { values, errors, setErrors, handleChange } = useFormState({ email: '' });
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    const emailError = validateEmail(values.email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setPending(true);
    try {
      const data = await authService.forgotPassword(values.email.trim());
      setSuccessMessage(data.message);
    } catch (error) {
      setErrors(fieldErrorsFromApi(error));
      setFormError(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      description="Enter your email and we will send you a reset link."
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to sign in
        </Link>
      }
    >
      {successMessage ? (
        <FormAlert variant="success" message={successMessage} />
      ) : (
        <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
          <FormAlert message={formError} />

          <FormField label="Email" error={errors.email}>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={handleChange}
              autoFocus
            />
          </FormField>

          <SubmitButton pending={pending} icon={Mail} pendingLabel="Sending...">
            Send reset link
          </SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}
