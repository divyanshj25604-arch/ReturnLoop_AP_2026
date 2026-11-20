const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const returnRoutes = require('./return.routes');
const warehouseRoutes = require('./warehouse.routes');
const operatorRoutes = require('./operator.routes');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// Public: /health and /auth/login (auth.routes protects /me and /password itself).
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Everything below needs a valid token.
router.use('/products', requireAuth, productRoutes);
router.use('/warehouses', requireAuth, warehouseRoutes);
router.use('/operators', requireAuth, operatorRoutes);
router.use('/returns', requireAuth, returnRoutes);

module.exports = router;
