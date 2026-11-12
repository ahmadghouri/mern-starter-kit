const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { requireTrustedOrigin } = require('../middleware/requireTrustedOrigin');
const {
  registerBody,
  loginBody,
  forgotPasswordBody,
  resetPasswordBody,
  sessionIdParams,
} = require('../validators/auth.validators');

function createAuthRouter({ limiters, isTrustedOrigin, google = { enabled: false } }) {
  const router = Router();
  const trustedOrigin = requireTrustedOrigin(isTrustedOrigin);

  // Tells the web app which sign-in options to show (driven by backend .env).
  router.get('/providers', (req, res) => {
    res.json({ data: { providers: { google: google.enabled } } });
  });

  router.post('/register', limiters.auth, validate({ body: registerBody }), controller.register);
  router.post('/login', limiters.auth, validate({ body: loginBody }), controller.login);
  router.post('/refresh', limiters.refresh, trustedOrigin, controller.refresh);
  router.post('/logout', trustedOrigin, controller.logout);
  router.post('/logout-all', authenticate, controller.logoutAll);

  router.post(
    '/forgot-password',
    limiters.auth,
    validate({ body: forgotPasswordBody }),
    controller.forgotPassword,
  );
  router.post(
    '/reset-password',
    limiters.auth,
    validate({ body: resetPasswordBody }),
    controller.resetPassword,
  );

  router.get('/me', authenticate, controller.me);
  router.get('/sessions', authenticate, controller.listSessions);
  router.delete(
    '/sessions/:sessionId',
    authenticate,
    validate({ params: sessionIdParams }),
    controller.revokeSession,
  );

  return router;
}

module.exports = { createAuthRouter };
