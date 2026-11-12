const crypto = require('node:crypto');
const { generateOpaqueToken, hashToken } = require('../lib/tokens');
const {
  GoogleAuthError,
  createPkcePair,
  buildAuthorizationUrl,
  exchangeCodeForProfile,
} = require('../lib/google');
const { User } = require('../models/User');
const { OAuthState } = require('../models/OAuthState');
const { issueAuthResult } = require('./auth.service');

const STATE_TTL_MS = 10 * 60 * 1000;
const DUPLICATE_KEY_ERROR = 11000;
const NAME_MAX_LENGTH = 80;

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/**
 * Starts a Google sign-in. Returns the raw `state` (for the browser cookie)
 * and the Google URL to redirect to. `linkUserId` connects Google to an
 * existing signed-in account instead of signing in.
 */
async function startGoogleSignIn({ linkUserId = null } = {}) {
  const state = generateOpaqueToken(32);
  const { codeVerifier, codeChallenge } = createPkcePair();

  await OAuthState.create({
    stateHash: hashToken(state),
    codeVerifier,
    linkUserId,
    expiresAt: new Date(Date.now() + STATE_TTL_MS),
  });

  return { state, url: buildAuthorizationUrl({ state, codeChallenge }) };
}

/** Consumes the state once. The cookie check ties the callback to the browser that started it. */
async function consumeState({ state, cookieState }) {
  if (!state || !cookieState || !safeEqual(state, cookieState)) {
    throw new GoogleAuthError('google_state_invalid', 'OAuth state is missing or does not match');
  }

  const record = await OAuthState.findOneAndDelete({
    stateHash: hashToken(state),
    expiresAt: { $gt: new Date() },
  });
  if (!record) {
    throw new GoogleAuthError('google_state_invalid', 'OAuth state is unknown or expired');
  }
  return record;
}

async function linkGoogleAccount(userId, profile) {
  const user = await User.findById(userId);
  if (!user) {
    throw new GoogleAuthError('google_state_invalid', 'User to link no longer exists');
  }
  if (user.googleId === profile.googleId) {
    return;
  }
  if (user.googleId) {
    throw new GoogleAuthError('google_other_linked', 'Another Google account is already connected');
  }

  user.googleId = profile.googleId;
  try {
    await user.save();
  } catch (error) {
    if (error.code === DUPLICATE_KEY_ERROR) {
      throw new GoogleAuthError('google_already_linked', 'Google account belongs to another user');
    }
    throw error;
  }
}

async function findOrCreateGoogleUser(profile) {
  const linked = await User.findOne({ googleId: profile.googleId });
  if (linked) {
    return linked;
  }

  // Never link automatically by email: an account created earlier with this
  // email (and a password someone else may know) must be linked by its owner
  // after signing in with that password.
  if (await User.exists({ email: profile.email })) {
    throw new GoogleAuthError('google_account_exists', 'An account with this email already exists');
  }

  const name = (profile.name ?? profile.email.split('@')[0]).slice(0, NAME_MAX_LENGTH);
  try {
    return await User.create({ name, email: profile.email, googleId: profile.googleId });
  } catch (error) {
    if (error.code === DUPLICATE_KEY_ERROR) {
      throw new GoogleAuthError('google_account_exists', 'An account with this email already exists');
    }
    throw error;
  }
}

/**
 * Handles Google's redirect back. Resolves to
 * `{ type: 'login', result }` (an auth result with tokens) or `{ type: 'linked' }`.
 * Throws GoogleAuthError; `error.linking` tells the caller where to send the user.
 */
async function completeGoogleSignIn({ state, cookieState, code, error, context }) {
  if (error) {
    throw new GoogleAuthError('google_cancelled', 'Google sign-in was cancelled');
  }

  const record = await consumeState({ state, cookieState });
  const linking = Boolean(record.linkUserId);

  try {
    if (!code) {
      throw new GoogleAuthError('google_failed', 'Google did not return an authorization code');
    }
    const profile = await exchangeCodeForProfile({ code, codeVerifier: record.codeVerifier });

    if (linking) {
      await linkGoogleAccount(record.linkUserId, profile);
      return { type: 'linked' };
    }

    const user = await findOrCreateGoogleUser(profile);
    return { type: 'login', result: await issueAuthResult(user, context) };
  } catch (failure) {
    if (failure instanceof GoogleAuthError) {
      failure.linking = linking;
    }
    throw failure;
  }
}

module.exports = { startGoogleSignIn, completeGoogleSignIn };
