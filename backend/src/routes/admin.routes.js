const { Router } = require('express');
const controller = require('../controllers/admin.controller');
const { authenticate, requireRole } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const {
  listUsersQuery,
  userIdParams,
  updateRoleBody,
} = require('../validators/admin.validators');

/** Admin-only endpoints. Every route requires an active admin session. */
function createAdminRouter() {
  const router = Router();

  router.use(authenticate, requireRole('admin'));

  router.get('/stats', controller.getStats);
  router.get('/users', validate({ query: listUsersQuery }), controller.listUsers);
  router.patch(
    '/users/:userId/role',
    validate({ params: userIdParams, body: updateRoleBody }),
    controller.updateUserRole,
  );
  router.delete(
    '/users/:userId/sessions',
    validate({ params: userIdParams }),
    controller.revokeUserSessions,
  );

  return router;
}

module.exports = { createAdminRouter };
