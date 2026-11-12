import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { LogIn } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { PasswordInput } from '@/components/form/PasswordInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { useAuth } from '@/features/auth/auth-context';
import { GoogleSignIn } from '@/features/auth/GoogleSignIn';
import { getGoogleErrorMessage } from '@/features/auth/google';
import { useFormState } from '@/hooks/use-form-state';
import { collectErrors, fieldErrorsFromApi, validateEmail } from '@/lib/validation';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { values, errors, setErrors, handleChange } = useFormState({ email: '', password: '' });
  const [formError, setFormError] = useState(null);
  const [pending, setPending] = useState(false);

  const notice = location.state?.notice;
  // Set when the Google sign-in flow redirects back with an error.
  const googleError = getGoogleErrorMessage(searchParams.get('error'));
  const redirectTo = location.state?.from?.pathname ?? '/';

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    const clientErrors = collectErrors({
      email: validateEmail(values.email),
      password: values.password ? null : 'Password is required',
    });
    if (clientErrors) {
      setErrors(clientErrors);
      return;
    }

    setPending(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrors(fieldErrorsFromApi(error));
      setFormError(error.message);
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Enter your email and password to continue."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <FormAlert message={googleError} />
      <GoogleSignIn />
      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        <FormAlert variant="success" message={notice} />
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

        <FormField
          label="Password"
          error={errors.password}
          labelAction={
            <Link
              to="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            name="password"
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange}
          />
        </FormField>

        <SubmitButton pending={pending} icon={LogIn} pendingLabel="Signing in...">
          Sign in
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
