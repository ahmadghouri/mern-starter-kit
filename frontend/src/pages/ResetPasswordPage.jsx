import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { KeyRound } from 'lucide-react';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { PasswordInput } from '@/components/form/PasswordInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { useFormState } from '@/hooks/use-form-state';
import {
  collectErrors,
  fieldErrorsFromApi,
  validateNewPassword,
  validatePasswordConfirmation,
} from '@/lib/validation';
import { authService } from '@/services/auth.service';

const requestNewLink = (
  <Link to="/forgot-password" className="font-medium text-foreground underline-offset-4 hover:underline">
    Request a new reset link
  </Link>
);

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { values, errors, setErrors, handleChange } = useFormState({
    password: '',
    confirmPassword: '',
  });
  const [formError, setFormError] = useState(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    const clientErrors = collectErrors({
      password: validateNewPassword(values.password),
      confirmPassword: validatePasswordConfirmation(values.password, values.confirmPassword),
    });
    if (clientErrors) {
      setErrors(clientErrors);
      return;
    }

    setPending(true);
    try {
      const data = await authService.resetPassword({ token, password: values.password });
      navigate('/login', { replace: true, state: { notice: data.message } });
    } catch (error) {
      setErrors(fieldErrorsFromApi(error));
      setFormError(error.message);
      setPending(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Reset password" footer={requestNewLink}>
        <FormAlert message="This reset link is invalid or incomplete." />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      description="You will be signed out of all devices after the reset."
      footer={requestNewLink}
    >
      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        <FormAlert message={formError} />

        <FormField
          label="New password"
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        >
          <PasswordInput
            name="password"
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange}
            autoFocus
          />
        </FormField>

        <FormField label="Confirm new password" error={errors.confirmPassword}>
          <PasswordInput
            name="confirmPassword"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={handleChange}
          />
        </FormField>

        <SubmitButton pending={pending} icon={KeyRound} pendingLabel="Updating...">
          Update password
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
