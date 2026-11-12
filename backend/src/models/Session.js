const { Schema, model } = require('mongoose');

const REVOKE_REASONS = Object.freeze([
  'logout',
  'logout_all',
  'user_revoked',
  'password_reset',
  'reuse_detected',
  'user_missing',
  'role_changed',
  'admin_revoked',
  'password_changed',
]);

/**
 * One document per signed-in device. The refresh token rotates on every
 * refresh; only its hash is stored. `previousTokenHash` lets us detect a
 * replayed (stolen) refresh token.
 */
const sessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    previousTokenHash: { type: String, index: true },
    rotatedAt: { type: Date },
    userAgent: { type: String, maxlength: 512, default: '' },
    ip: { type: String, maxlength: 64, default: '' },
    lastUsedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    absoluteExpiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, enum: REVOKE_REASONS },
  },
  { timestamps: true },
);

// MongoDB removes expired sessions automatically.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

function toPublicSession(session, currentSessionId) {
  return {
    id: String(session._id),
    userAgent: session.userAgent,
    ip: session.ip,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    expiresAt: session.expiresAt,
    current: String(session._id) === String(currentSessionId),
  };
}

const Session = model('Session', sessionSchema);

module.exports = { Session, REVOKE_REASONS, toPublicSession };
