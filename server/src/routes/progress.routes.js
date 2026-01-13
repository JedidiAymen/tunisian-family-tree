const express = require('express');
const router = express.Router();
const authRequired = require('../middleware/authRequired');
const progress = require('../controllers/progress.controller');

// Family progress dashboard
router.get('/family', authRequired, progress.getFamilyProgress);

// Fix next tasks
router.get('/tasks', authRequired, progress.getFixNextTasks);

// Occupation statistics
router.get('/occupations', authRequired, progress.getOccupationStats);

// Location statistics
router.get('/locations', authRequired, progress.getLocationStats);

// Occupation sectors lookup
router.get('/sectors', authRequired, progress.getOccupationSectors);

module.exports = router;
