const express = require('express');
const router = express.Router();
const authRequired = require('../middleware/authRequired');
const requireRole = require('../middleware/requireRole');
const { getMyFamily, updateMyFamily } = require('../controllers/families.controller');

router.get('/me', authRequired, getMyFamily);
router.patch('/me', authRequired, requireRole(['ADMIN']), updateMyFamily);

module.exports = router;
