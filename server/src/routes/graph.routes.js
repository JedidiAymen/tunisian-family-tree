const express = require('express');
const router = express.Router();
const authRequired = require('../middleware/authRequired');
const {
  findPath,
  getFocusGraph,
  searchPeople,
  getSavedViews,
  createSavedView,
  deleteSavedView,
  getGraphStats
} = require('../controllers/graph.controller');

// All routes require authentication
router.use(authRequired);

// Path finding - relationship finder
router.get('/path', findPath);

// Focus mode - get subgraph around a person
router.get('/focus/:personId', getFocusGraph);

// Command palette search
router.get('/search', searchPeople);

// Saved views CRUD
router.get('/views', getSavedViews);
router.post('/views', createSavedView);
router.delete('/views/:id', deleteSavedView);

// Graph statistics
router.get('/stats', getGraphStats);

module.exports = router;
