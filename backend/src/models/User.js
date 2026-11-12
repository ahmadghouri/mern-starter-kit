const { Schema, model } = require('mongoose');

const USER_ROLES = Object.freeze(['user', 'admin']);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // Missing for accounts created with Google sign-in until they set a password.
    passwordHash: { type: String, select: false },
    // Google account id (the `sub` claim). Unique when present.
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: USER_ROLES, default: 'user' },
    passwordChangedAt: { type: Date },
    // Set when a profile picture exists. Also used as a cache-busting version.
    avatarUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/** Public representation. Never includes the password hash. */
function toPublicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    googleLinked: Boolean(user.googleId),
    avatarVersion: user.avatarUpdatedAt ? new Date(user.avatarUpdatedAt).getTime() : null,
    createdAt: user.createdAt,
  };
}

const User = model('User', userSchema);

module.exports = { User, USER_ROLES, toPublicUser };
