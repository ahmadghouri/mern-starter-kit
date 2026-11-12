const profileService = require('../services/profile.service');

async function updateProfile(req, res) {
  const user = await profileService.updateProfile(req.auth.userId, req.validated.body);
  res.json({ data: { user } });
}

async function changeEmail(req, res) {
  const user = await profileService.changeEmail(req.auth.userId, req.validated.body);
  res.json({ data: { user } });
}

async function changePassword(req, res) {
  await profileService.changePassword(req.auth.userId, req.auth.sessionId, req.validated.body);
  res.json({
    data: { message: 'Your password has been changed. Other devices were signed out.' },
  });
}

async function disconnectGoogle(req, res) {
  const user = await profileService.disconnectGoogle(req.auth.userId);
  res.json({ data: { user } });
}

async function uploadAvatar(req, res) {
  // express.raw() leaves req.body unset for other content types.
  const data = Buffer.isBuffer(req.body) ? req.body : null;
  const user = await profileService.setAvatar(req.auth.userId, data);
  res.json({ data: { user } });
}

async function removeAvatar(req, res) {
  const user = await profileService.removeAvatar(req.auth.userId);
  res.json({ data: { user } });
}

/** Public image endpoint, so <img> tags can load it without a bearer token. */
async function getAvatar(req, res) {
  const { data, contentType } = await profileService.getAvatar(req.validated.params.userId);

  res.set({
    'Content-Type': contentType,
    'Content-Length': String(data.length),
    // URLs carry a `?v=` version, so a new upload always gets a new URL.
    'Cache-Control': 'public, max-age=86400',
    'Content-Security-Policy': "default-src 'none'",
    // The web app may be served from another origin than the API.
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  res.send(data);
}

module.exports = {
  updateProfile,
  changeEmail,
  changePassword,
  disconnectGoogle,
  uploadAvatar,
  removeAvatar,
  getAvatar,
};
