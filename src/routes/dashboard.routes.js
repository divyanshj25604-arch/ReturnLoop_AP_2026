const { Router } = require('express');
const { getDashboard } = require('../controllers/dashboard.controller');
const { requireRole } = require('../middleware/auth');

const router = Router();

router.get('/', requireRole('SUPERVISOR'), getDashboard);

module.exports = router;
