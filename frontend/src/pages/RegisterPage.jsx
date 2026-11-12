import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { PasswordInput } from '@/components/form/PasswordInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { GoogleSignIn } from '@/features/auth/GoogleSignIn';
import { useAuth } from '@/features/auth/auth-context';
import { useFormState } from '@/hooks/use-form-state';
import {
  collectErrors,
  fieldErrorsFromApi,
  validateEmail,
  validateName,
  validateNewPassword,
  validatePasswordConfirmation,
} from '@/lib/validation';

const INITIAL_VALUES = { name: '', email: '', password: '', confirmPassword: '' };

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { values, errors, setErrors, handleChange } = useFormState(INITIAL_VALUES);
  const [formError, setFormError] = useState(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    const clientErrors = collectErrors({
      name: validateName(values.name),
      email: validateEmail(values.email),
      password: validateNewPassword(values.password),
      confirmPassword: validatePasswordConfirmation(values.password, values.confirmPassword),
    });
    if (clientErrors) {
      setErrors(clientErrors);
      return;
    }

    setPending(true);
    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      navigate('/', { replace: true });
    } catch (error) {
      setErrors(fieldErrorsFromApi(error));
      setFormError(error.message);
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Create an account"
      description="It only takes a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleSignIn />
      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        <FormAlert message={formError} />

        <FormField label="Name" error={errors.name}>
          <Input
            name="name"
            autoComplete="name"
            placeholder="Jane Doe"
            value={values.name}
            onChange={handleChange}
            autoFocus
          />
        </FormField>

        <FormField label="Email" error={errors.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={handleChange}
          />
        </FormField>

        <FormField
          label="Password"
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        >
          <PasswordInput
            name="password"
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange}
          />
        </FormField>

        <FormField label="Confirm password" error={errors.confirmPassword}>
          <PasswordInput
            name="confirmPassword"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={handleChange}
          />
        </FormField>

        <SubmitButton pending={pending} icon={UserPlus} pendingLabel="Creating account...">
          Create account
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
