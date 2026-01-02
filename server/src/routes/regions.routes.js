const express = require('express');
const router = express.Router();
const authRequired = require('../middleware/authRequired');
const requireRole = require('../middleware/requireRole');
const { listRegions, createRegion } = require('../controllers/regions.controller');

router.get('/', listRegions);
router.post('/', authRequired, requireRole(['ADMIN']), createRegion);

module.exports = router;
