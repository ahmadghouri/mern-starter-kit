import { useState } from 'react';
import { KeyRound, Mail, Save } from 'lucide-react';
import { FormAlert } from '@/components/form/FormAlert';
import { FormField } from '@/components/form/FormField';
import { PasswordInput } from '@/components/form/PasswordInput';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Input } from '@/components/ui/input';
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
import { profileService } from '@/services/profile.service';

/**
 * Shared submit flow: client validation, request, field errors from the API,
 * and a success message. `submit` resolves to an optional success message.
 */
function useProfileForm(initialValues, { validate, submit }) {
  const form = useFormState(initialValues);
  const [status, setStatus] = useState({ pending: false, error: null, success: null });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ pending: false, error: null, success: null });

    const clientErrors = collectErrors(validate(form.values));
    if (clientErrors) {
      form.setErrors(clientErrors);
      return;
    }

    setStatus({ pending: true, error: null, success: null });
    try {
      const success = await submit(form.values, form);
      setStatus({ pending: false, error: null, success });
    } catch (error) {
      form.setErrors(fieldErrorsFromApi(error));
      setStatus({ pending: false, error: error.message, success: null });
    }
  }

  return { ...form, ...status, handleSubmit };
}

function FormMessages({ error, success }) {
  return (
    <>
      <FormAlert message={error} />
      <FormAlert variant="success" message={success} />
    </>
  );
}

export function PersonalInfoForm() {
  const { user, updateUser } = useAuth();
  const form = useProfileForm(
    { name: user.name },
    {
      validate: (values) => ({ name: validateName(values.name) }),
      submit: async (values) => {
        const data = await profileService.updateProfile({ name: values.name.trim() });
        updateUser(data.user);
        return 'Your name has been updated.';
      },
    },
  );

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit} noValidate aria-label="Personal information">
      <FormMessages error={form.error} success={form.success} />
      <FormField label="Name" error={form.errors.name}>
        <Input name="name" autoComplete="name" value={form.values.name} onChange={form.handleChange} />
      </FormField>
      <SubmitButton pending={form.pending} icon={Save} pendingLabel="Saving..." className="w-fit">
        Save name
      </SubmitButton>
    </form>
  );
}

export function EmailForm() {
  const { user, updateUser } = useAuth();
  const form = useProfileForm(
    { email: user.email, currentPassword: '' },
    {
      validate: (values) => ({
        email:
          validateEmail(values.email) ??
          (values.email.trim().toLowerCase() === user.email ? 'This is already your email' : null),
        currentPassword: values.currentPassword ? null : 'Current password is required',
      }),
      submit: async (values, { setValues }) => {
        const data = await profileService.changeEmail({
          email: values.email.trim(),
          currentPassword: values.currentPassword,
        });
        updateUser(data.user);
        setValues({ email: data.user.email, currentPassword: '' });
        return 'Your email has been updated. Use it the next time you sign in.';
      },
    },
  );

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit} noValidate aria-label="Change email">
      <FormMessages error={form.error} success={form.success} />
      <FormField label="Email" error={form.errors.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          value={form.values.email}
          onChange={form.handleChange}
        />
      </FormField>
      <FormField
        label="Current password"
        error={form.errors.currentPassword}
        hint="Required to change your email."
      >
        <PasswordInput
          name="currentPassword"
          autoComplete="current-password"
          value={form.values.currentPassword}
          onChange={form.handleChange}
        />
      </FormField>
      <SubmitButton pending={form.pending} icon={Mail} pendingLabel="Saving..." className="w-fit">
        Change email
      </SubmitButton>
    </form>
  );
}

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function PasswordForm() {
  const form = useProfileForm(EMPTY_PASSWORDS, {
    validate: (values) => ({
      currentPassword: values.currentPassword ? null : 'Current password is required',
      newPassword:
        validateNewPassword(values.newPassword) ??
        (values.newPassword === values.currentPassword
          ? 'New password must be different from the current password'
          : null),
      confirmPassword: validatePasswordConfirmation(values.newPassword, values.confirmPassword),
    }),
    submit: async (values, { setValues }) => {
      const data = await profileService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setValues(EMPTY_PASSWORDS);
      return data.message;
    },
  });

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit} noValidate aria-label="Change password">
      <FormMessages error={form.error} success={form.success} />
      <FormField label="Current password" error={form.errors.currentPassword}>
        <PasswordInput
          name="currentPassword"
          autoComplete="current-password"
          value={form.values.currentPassword}
          onChange={form.handleChange}
        />
      </FormField>
      <FormField
        label="New password"
        error={form.errors.newPassword}
        hint="At least 8 characters, with a letter and a number."
      >
        <PasswordInput
          name="newPassword"
          autoComplete="new-password"
          value={form.values.newPassword}
          onChange={form.handleChange}
        />
      </FormField>
      <FormField label="Confirm new password" error={form.errors.confirmPassword}>
        <PasswordInput
          name="confirmPassword"
          autoComplete="new-password"
          value={form.values.confirmPassword}
          onChange={form.handleChange}
        />
      </FormField>
      <SubmitButton pending={form.pending} icon={KeyRound} pendingLabel="Updating..." className="w-fit">
        Change password
      </SubmitButton>
    </form>
  );
}
