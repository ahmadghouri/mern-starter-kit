const { badRequest, notFound } = require('../lib/errors');
const { User, toPublicUser } = require('../models/User');
const { Session } = require('../models/Session');
const sessionService = require('./session.service');

const DAY_MS = 24 * 60 * 60 * 1000;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function activeSessionFilter(now = new Date()) {
  return { revokedAt: null, expiresAt: { $gt: now } };
}

async function getStats() {
  const weekAgo = new Date(Date.now() - 7 * DAY_MS);

  const [totalUsers, admins, newUsersLast7Days, activeSessions] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    Session.countDocuments(activeSessionFilter()),
  ]);

  return { totalUsers, admins, newUsersLast7Days, activeSessions };
}

/** Counts active sessions per user for the given user ids. */
async function countActiveSessions(userIds) {
  if (userIds.length === 0) {
    return new Map();
  }

  const rows = await Session.aggregate([
    { $match: { user: { $in: userIds }, ...activeSessionFilter() } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

/** Paginated user list with optional name/email search and role filter. */
async function listUsers({ page, limit, search, role }) {
  const filter = {};
  if (role) {
    filter.role = role;
  }
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const sessionCounts = await countActiveSessions(users.map((user) => user._id));

  return {
    users: users.map((user) => ({
      ...toPublicUser(user),
      activeSessions: sessionCounts.get(String(user._id)) ?? 0,
    })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/**
 * Changes another user's role. The role is stored in access tokens, so the
 * user's sessions are revoked to make the change take effect immediately.
 */
async function updateUserRole({ actorId, userId, role }) {
  if (userId === actorId) {
    throw badRequest('CANNOT_CHANGE_OWN_ROLE', 'You cannot change your own role');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw notFound('USER_NOT_FOUND', 'User not found');
  }

  if (user.role !== role) {
    user.role = role;
    await user.save();
    await sessionService.revokeAllUserSessions(user._id, 'role_changed');
  }

  return toPublicUser(user);
}

/** Signs a user out on every device. */
async function revokeUserSessions({ actorId, userId }) {
  if (userId === actorId) {
    throw badRequest(
      'CANNOT_REVOKE_OWN_SESSIONS',
      'Use "Sign out everywhere" on your dashboard to sign yourself out',
    );
  }

  const exists = await User.exists({ _id: userId });
  if (!exists) {
    throw notFound('USER_NOT_FOUND', 'User not found');
  }

  await sessionService.revokeAllUserSessions(userId, 'admin_revoked');
}

module.exports = { getStats, listUsers, updateUserRole, revokeUserSessions };
