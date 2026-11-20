const { Router } = require('express');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
} = require('../controllers/product.controller');
const { requireRole } = require('../middleware/auth');

const router = Router();

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', requireRole('ADMIN'), createProduct);
router.patch('/:id', requireRole('ADMIN'), updateProduct);

module.exports = router;
