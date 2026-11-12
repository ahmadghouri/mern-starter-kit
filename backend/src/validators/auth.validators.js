const { z } = require('zod');

// bcrypt only uses the first 72 bytes of a password.
const BCRYPT_MAX_BYTES = 72;

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .email('Enter a valid email address');

const newPassword = z
  .string({ error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= BCRYPT_MAX_BYTES, {
    message: 'Password is too long',
  })
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: 'Password must include at least one letter and one number',
  });

const registerBody = z
  .object({
    name: z
      .string({ error: 'Name is required' })
      .trim()
      .min(1, 'Name is required')
      .max(80, 'Name is too long'),
    email,
    password: newPassword,
  })
  .strict();

const loginBody = z
  .object({
    email,
    password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(256),
  })
  .strict();

const forgotPasswordBody = z.object({ email }).strict();

const resetPasswordBody = z
  .object({
    token: z.string({ error: 'Reset token is required' }).min(20).max(200),
    password: newPassword,
  })
  .strict();

const sessionIdParams = z.object({
  sessionId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid session id'),
});

module.exports = {
  registerBody,
  loginBody,
  forgotPasswordBody,
  resetPasswordBody,
  sessionIdParams,
};
