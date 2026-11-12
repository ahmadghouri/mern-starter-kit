const adminService = require('../services/admin.service');

async function getStats(req, res) {
  const stats = await adminService.getStats();
  res.json({ data: { stats } });
}

async function listUsers(req, res) {
  const result = await adminService.listUsers(req.validated.query);
  res.json({ data: result });
}

async function updateUserRole(req, res) {
  const user = await adminService.updateUserRole({
    actorId: req.auth.userId,
    userId: req.validated.params.userId,
    role: req.validated.body.role,
  });
  res.json({ data: { user } });
}

async function revokeUserSessions(req, res) {
  await adminService.revokeUserSessions({
    actorId: req.auth.userId,
    userId: req.validated.params.userId,
  });
  res.status(204).end();
}

module.exports = { getStats, listUsers, updateUserRole, revokeUserSessions };
