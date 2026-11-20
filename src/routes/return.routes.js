const { Router } = require('express');
const {
  getAllReturns,
  getReturnById,
  createReturn,
} = require('../controllers/return.controller');
const { startInspection, recordInspection } = require('../controllers/inspection.controller');

const router = Router();

router.get('/', getAllReturns);
router.get('/:id', getReturnById);
router.post('/', createReturn);

// Workflow (docs/api.md section 3). Any logged-in role (INSPECTOR and up).
router.post('/:id/start-inspection', startInspection);
router.post('/:id/inspections', recordInspection);

module.exports = router;
