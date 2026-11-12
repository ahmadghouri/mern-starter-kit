const { Router } = require('express');
const controller = require('../controllers/health.controller');

const healthRouter = Router();

healthRouter.get('/live', controller.live);
healthRouter.get('/ready', controller.ready);

module.exports = { healthRouter };
