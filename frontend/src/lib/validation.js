// Client-side checks mirror the backend rules for fast feedback.
// The backend remains the source of truth and validates every request.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_MAX_BYTES = 72;

export function validateEmail(value) {
  const email = value.trim();
  if (!email) return 'Email is required';
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Enter a valid email address';
  return null;
}

export function validateName(value) {
  const name = value.trim();
  if (!name) return 'Name is required';
  if (name.length > 80) return 'Name is too long';
  return null;
}

export function validateNewPassword(value) {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (new TextEncoder().encode(value).length > BCRYPT_MAX_BYTES) return 'Password is too long';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Password must include at least one letter and one number';
  }
  return null;
}

export function validatePasswordConfirmation(password, confirmation) {
  if (!confirmation) return 'Please confirm your password';
  if (password !== confirmation) return 'Passwords do not match';
  return null;
}

/** Removes empty entries. Returns null when there are no errors. */
export function collectErrors(errors) {
  const entries = Object.entries(errors).filter(([, message]) => Boolean(message));
  return entries.length ? Object.fromEntries(entries) : null;
}

/** Converts API validation details into `{ field: message }`. */
export function fieldErrorsFromApi(error) {
  if (!Array.isArray(error?.details)) return {};
  return Object.fromEntries(error.details.map((detail) => [detail.field, detail.message]));
}
