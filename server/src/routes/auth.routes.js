const express = require('express');
const router = express.Router();
const { register, login, me } = require('../controllers/auth.controller');
const authRequired = require('../middleware/authRequired');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authRequired, me);

module.exports = router;
