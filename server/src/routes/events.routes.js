const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');
const authRequired = require('../middleware/authRequired');

// Timeline endpoints
router.get('/timeline', authRequired, eventsController.getFamilyTimeline);
router.get('/timeline/decades', authRequired, eventsController.getTimelineByDecade);
router.get('/timeline/person/:personId', authRequired, eventsController.getPersonTimeline);

// Atlas/Geography endpoints
router.get('/atlas/migrations', authRequired, eventsController.getMigrationRoutes);
router.get('/atlas/cities', authRequired, eventsController.getCityHeatMap);
router.get('/atlas/hub', authRequired, eventsController.getFamilyHub);

// Generation stats
router.get('/generations', authRequired, eventsController.getGenerationStats);

// CRUD for events
router.post('/', authRequired, eventsController.createEvent);
router.patch('/:id', authRequired, eventsController.updateEvent);
router.delete('/:id', authRequired, eventsController.deleteEvent);

module.exports = router;
