const { z } = require('zod');
const { USER_ROLES } = require('../models/User');

const objectId = (label) => z.string().regex(/^[a-f\d]{24}$/i, `Invalid ${label}`);

const listUsersQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    role: z.enum(USER_ROLES).optional(),
  })
  .strict();

const userIdParams = z.object({ userId: objectId('user id') });

const updateRoleBody = z
  .object({ role: z.enum(USER_ROLES, { error: 'Role must be user or admin' }) })
  .strict();

module.exports = { listUsersQuery, userIdParams, updateRoleBody };
