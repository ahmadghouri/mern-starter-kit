import {
  collectErrors,
  fieldErrorsFromApi,
  validateEmail,
  validateName,
  validateNewPassword,
  validatePasswordConfirmation,
} from './validation';

describe('validation', () => {
  it.each([
    ['', 'Email is required'],
    ['   ', 'Email is required'],
    ['not-an-email', 'Enter a valid email address'],
    ['user@example.com', null],
  ])('validateEmail(%p)', (value, expected) => {
    expect(validateEmail(value)).toBe(expected);
  });

  it.each([
    ['', 'Name is required'],
    ['a'.repeat(81), 'Name is too long'],
    ['Jane', null],
  ])('validateName(%p)', (value, expected) => {
    expect(validateName(value)).toBe(expected);
  });

  it.each([
    ['', 'Password is required'],
    ['abc1', 'Password must be at least 8 characters'],
    ['abcdefgh', 'Password must include at least one letter and one number'],
    ['12345678', 'Password must include at least one letter and one number'],
    [`${'a'.repeat(72)}1`, 'Password is too long'],
    ['Password123', null],
  ])('validateNewPassword(%p)', (value, expected) => {
    expect(validateNewPassword(value)).toBe(expected);
  });

  it('validatePasswordConfirmation', () => {
    expect(validatePasswordConfirmation('a', '')).toBe('Please confirm your password');
    expect(validatePasswordConfirmation('a', 'b')).toBe('Passwords do not match');
    expect(validatePasswordConfirmation('a', 'a')).toBeNull();
  });

  it('collectErrors drops empty values', () => {
    expect(collectErrors({ a: null, b: undefined })).toBeNull();
    expect(collectErrors({ a: 'bad', b: null })).toEqual({ a: 'bad' });
  });

  it('fieldErrorsFromApi maps details to fields', () => {
    expect(fieldErrorsFromApi({ details: [{ field: 'email', message: 'Taken' }] })).toEqual({
      email: 'Taken',
    });
    expect(fieldErrorsFromApi(new Error('x'))).toEqual({});
  });
});
