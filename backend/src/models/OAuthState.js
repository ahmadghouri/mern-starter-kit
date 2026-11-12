const { Schema, model } = require('mongoose');

/**
 * One pending OAuth sign-in. Created when the user is sent to Google and
 * deleted (single use) when Google redirects back. Only the state hash is
 * stored; the raw state lives in the browser cookie and the redirect URL.
 */
const oauthStateSchema = new Schema({
  stateHash: { type: String, required: true, unique: true },
  codeVerifier: { type: String, required: true },
  // Set when a signed-in user is connecting Google to their account.
  linkUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  expiresAt: { type: Date, required: true },
});

oauthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OAuthState = model('OAuthState', oauthStateSchema);

module.exports = { OAuthState };
