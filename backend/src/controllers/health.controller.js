const { isDatabaseReady } = require('../config/db');

/** Liveness: the process is running. */
function live(req, res) {
  res.json({ data: { status: 'ok' } });
}

/** Readiness: the API can serve traffic (database connected). */
function ready(req, res) {
  const databaseReady = isDatabaseReady();
  res.status(databaseReady ? 200 : 503).json({
    data: { status: databaseReady ? 'ok' : 'unavailable', database: databaseReady ? 'up' : 'down' },
  });
}

module.exports = { live, ready };
