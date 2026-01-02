const express = require('express');
const router = express.Router();
const authRequired = require('../middleware/authRequired');
const requireRole = require('../middleware/requireRole');
const tree = require('../controllers/tree.controller');

router.post('/edges', authRequired, requireRole(['ADMIN','EDITOR']), tree.createEdge);
router.get('/edges', authRequired, tree.listEdges);
router.delete('/edges/:id', authRequired, requireRole(['ADMIN']), tree.deleteEdge);

router.get('/graph', authRequired, tree.graph);
router.get('/person/:id', authRequired, tree.personSubgraph);

module.exports = router;
