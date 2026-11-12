const express = require('express');
const controller = require('../controllers/profile.controller');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { AVATAR_CONTENT_TYPES } = require('../models/Avatar');
const {
  updateProfileBody,
  changeEmailBody,
  changePasswordBody,
  avatarParams,
} = require('../validators/profile.validators');

// The client resizes images before upload, so real avatars are far smaller.
const AVATAR_MAX_BYTES = '512kb';

/** Signed-in user's own profile: /api/profile */
function createProfileRouter({ limiters }) {
  const router = express.Router();

  router.use(authenticate);

  router.patch('/', validate({ body: updateProfileBody }), controller.updateProfile);
  // These check the current password, so they share the login rate limit.
  router.patch('/email', limiters.auth, validate({ body: changeEmailBody }), controller.changeEmail);
  router.put(
    '/password',
    limiters.auth,
    validate({ body: changePasswordBody }),
    controller.changePassword,
  );
  router.put(
    '/avatar',
    express.raw({ type: AVATAR_CONTENT_TYPES, limit: AVATAR_MAX_BYTES }),
    controller.uploadAvatar,
  );
  router.delete('/avatar', controller.removeAvatar);

  return router;
}

/** Public avatar images: /api/avatars/:userId */
function createAvatarRouter() {
  const router = express.Router();
  router.get('/:userId', validate({ params: avatarParams }), controller.getAvatar);
  return router;
}

module.exports = { createProfileRouter, createAvatarRouter };
