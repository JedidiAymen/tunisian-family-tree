const express = require('express');
const router = express.Router();
const authRequired = require('../middleware/authRequired');
const requireRole = require('../middleware/requireRole');
const { listExpertise, createExpertise } = require('../controllers/expertise.controller');

router.get('/', listExpertise);
router.post('/', authRequired, requireRole(['ADMIN']), createExpertise);

module.exports = router;
