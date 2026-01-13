const express = require('express');
const router = express.Router();
const authRequired = require('../middleware/authRequired');
const collab = require('../controllers/collaboration.controller');

// Activity Feed / Audit Log
router.get('/activity', authRequired, collab.getActivityFeed);
router.get('/activity/stats', authRequired, collab.getActivityStats);

// Duplicate Detection & Merge
router.get('/duplicates/find', authRequired, collab.findDuplicates);
router.get('/duplicates/candidates', authRequired, collab.getDuplicateCandidates);
router.post('/duplicates/:id/dismiss', authRequired, collab.dismissDuplicate);
router.post('/duplicates/merge', authRequired, collab.mergePeople);

// Change Requests (cross-family approvals)
router.get('/requests', authRequired, collab.getChangeRequests);
router.post('/requests', authRequired, collab.createChangeRequest);
router.post('/requests/:id/respond', authRequired, collab.respondToChangeRequest);

module.exports = router;
