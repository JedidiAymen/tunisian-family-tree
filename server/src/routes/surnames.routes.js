const express = require('express');
const router = express.Router();
const { listSurnames, createSurname } = require('../controllers/surnames.controller');
const authRequired = require('../middleware/authRequired');
const requireRole = require('../middleware/requireRole');

router.get('/', listSurnames);
router.post('/', authRequired, requireRole(['ADMIN']), createSurname);

module.exports = router;
