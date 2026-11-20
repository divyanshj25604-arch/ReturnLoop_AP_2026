const { Router } = require('express');
const {
  getAllOperators,
  createOperator,
  updateOperator,
} = require('../controllers/operator.controller');
const { requireRole } = require('../middleware/auth');

const router = Router();

// Every operator endpoint is ADMIN only.
router.use(requireRole('ADMIN'));

router.get('/', getAllOperators);
router.post('/', createOperator);
router.patch('/:id', updateOperator);

module.exports = router;
