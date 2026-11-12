const bcrypt = require('bcryptjs');
const { config } = require('../config/env');
const { AppError, badRequest, conflict, notFound, unauthorized } = require('../lib/errors');
const { detectImageType } = require('../lib/image');
const { User, toPublicUser } = require('../models/User');
const { Avatar } = require('../models/Avatar');
const { PasswordResetToken } = require('../models/PasswordResetToken');
const sessionService = require('./session.service');

const DUPLICATE_KEY_ERROR = 11000;

async function findUserOrFail(userId, { withPassword = false } = {}) {
  const query = User.findById(userId);
  const user = await (withPassword ? query.select('+passwordHash') : query);
  if (!user) {
    throw unauthorized('USER_NOT_FOUND', 'Please sign in again.');
  }
  return user;
}

/** Sensitive changes require the current password, even with a valid session. */
async function verifyCurrentPassword(user, currentPassword) {
  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    throw badRequest('INVALID_CURRENT_PASSWORD', 'Current password is incorrect', [
      { field: 'currentPassword', message: 'Current password is incorrect' },
    ]);
  }
}

async function updateProfile(userId, { name }) {
  const user = await findUserOrFail(userId);
  user.name = name;
  await user.save();
  return toPublicUser(user);
}

async function changeEmail(userId, { email, currentPassword }) {
  const user = await findUserOrFail(userId, { withPassword: true });
  await verifyCurrentPassword(user, currentPassword);

  if (user.email === email) {
    return toPublicUser(user);
  }

  user.email = email;
  try {
    await user.save();
  } catch (error) {
    if (error.code === DUPLICATE_KEY_ERROR) {
      throw conflict('EMAIL_TAKEN', 'An account with this email already exists');
    }
    throw error;
  }

  // Reset links already sent to the old address must stop working.
  await PasswordResetToken.deleteMany({ user: user._id });
  return toPublicUser(user);
}

/** Changes the password and signs out every other device. */
async function changePassword(userId, sessionId, { currentPassword, newPassword }) {
  const user = await findUserOrFail(userId, { withPassword: true });
  await verifyCurrentPassword(user, currentPassword);

  user.passwordHash = await bcrypt.hash(newPassword, config.auth.bcryptRounds);
  user.passwordChangedAt = new Date();
  await user.save();

  await PasswordResetToken.deleteMany({ user: user._id });
  await sessionService.revokeOtherUserSessions(user._id, sessionId, 'password_changed');
}

async function setAvatar(userId, data) {
  const contentType = detectImageType(data);
  if (!contentType) {
    throw new AppError(415, 'UNSUPPORTED_IMAGE', 'Upload a WebP, AVIF, PNG, or JPEG image');
  }

  const user = await findUserOrFail(userId);
  await Avatar.findOneAndUpdate(
    { user: user._id },
    { $set: { data, contentType } },
    { upsert: true },
  );

  user.avatarUpdatedAt = new Date();
  await user.save();
  return toPublicUser(user);
}

async function removeAvatar(userId) {
  const user = await findUserOrFail(userId);
  await Avatar.deleteOne({ user: user._id });

  user.avatarUpdatedAt = null;
  await user.save();
  return toPublicUser(user);
}

async function getAvatar(userId) {
  const avatar = await Avatar.findOne({ user: userId });
  if (!avatar) {
    throw notFound('AVATAR_NOT_FOUND', 'Avatar not found');
  }
  return { data: Buffer.from(avatar.data), contentType: avatar.contentType };
}

module.exports = {
  updateProfile,
  changeEmail,
  changePassword,
  setAvatar,
  removeAvatar,
  getAvatar,
};
