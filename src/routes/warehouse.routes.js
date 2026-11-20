const { Router } = require('express');
const {
  getAllWarehouses,
  createWarehouse,
  updateWarehouse,
} = require('../controllers/warehouse.controller');
const { requireRole } = require('../middleware/auth');

const router = Router();

router.get('/', getAllWarehouses);
router.post('/', requireRole('ADMIN'), createWarehouse);
router.patch('/:id', requireRole('ADMIN'), updateWarehouse);

module.exports = router;
