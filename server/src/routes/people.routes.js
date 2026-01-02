const express = require('express');
const router = express.Router();
const authRequired = require('../middleware/authRequired');
const requireRole = require('../middleware/requireRole');
const people = require('../controllers/people.controller');

// List all families (for filter dropdown)
router.get('/families', authRequired, people.listFamilies);

// List all cities (for filter dropdown)
router.get('/cities', authRequired, people.listCities);

// People CRUD
router.get('/', authRequired, people.listPeople);
router.post('/', authRequired, requireRole(['ADMIN','EDITOR']), people.createPerson);
router.get('/:id', authRequired, people.getPerson);
router.patch('/:id', authRequired, requireRole(['ADMIN','EDITOR']), people.patchPerson);
router.put('/:id', authRequired, requireRole(['ADMIN','EDITOR']), people.putPerson);
router.delete('/:id', authRequired, requireRole(['ADMIN']), people.deletePerson);

module.exports = router;
