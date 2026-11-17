const { Router } = require('express');
const {
  getAllReturns,
  getReturnById,
  createReturn,
} = require('../controllers/return.controller');

const router = Router();

router.get('/', getAllReturns);
router.get('/:id', getReturnById);
router.post('/', createReturn);

module.exports = router;
