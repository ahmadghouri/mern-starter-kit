const { Schema, model } = require('mongoose');

const passwordResetTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// MongoDB removes expired reset tokens automatically.
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetToken = model('PasswordResetToken', passwordResetTokenSchema);

module.exports = { PasswordResetToken };
