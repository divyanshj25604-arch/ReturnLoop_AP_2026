const { Router } = require('express');
const { login, me, changePassword } = require('../controllers/auth.controller');

const router = Router();

router.post('/login', login);
router.get('/me', me);
router.patch('/password', changePassword);

module.exports = router;
