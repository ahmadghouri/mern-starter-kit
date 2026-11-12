const { z } = require('zod');
const { registerBody } = require('./auth.validators');

// Reuse the exact rules from registration so both stay in sync.
const { name, email, password: newPassword } = registerBody.shape;

const currentPassword = z
  .string({ error: 'Current password is required' })
  .min(1, 'Current password is required')
  .max(256);

const updateProfileBody = z.object({ name }).strict();

const changeEmailBody = z.object({ email, currentPassword }).strict();

const changePasswordBody = z
  .object({ currentPassword, newPassword })
  .strict()
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current password',
  });

const avatarParams = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user id'),
});

module.exports = { updateProfileBody, changeEmailBody, changePasswordBody, avatarParams };
