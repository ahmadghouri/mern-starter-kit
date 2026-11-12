const { Schema, model } = require('mongoose');

const AVATAR_CONTENT_TYPES = Object.freeze(['image/webp', 'image/avif', 'image/png', 'image/jpeg']);

/**
 * Profile picture bytes, one per user. Kept out of the User document so
 * user queries stay small. The client uploads an already resized image.
 */
const avatarSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    data: { type: Buffer, required: true },
    contentType: { type: String, enum: AVATAR_CONTENT_TYPES, required: true },
  },
  { timestamps: true },
);

const Avatar = model('Avatar', avatarSchema);

module.exports = { Avatar, AVATAR_CONTENT_TYPES };
