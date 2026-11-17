const { Router } = require('express');
const healthRoutes = require('./health.routes');
const productRoutes = require('./product.routes');
const returnRoutes = require('./return.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/products', productRoutes);
router.use('/returns', returnRoutes);

module.exports = router;
