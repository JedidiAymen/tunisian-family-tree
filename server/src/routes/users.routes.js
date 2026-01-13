const express = require('express');
const router = express.Router();
const authRequired = require('../middleware/authRequired');
const requireRole = require('../middleware/requireRole');
const users = require('../controllers/users.controller');

// Family user management (admin only for write operations)
router.get('/', authRequired, users.listFamilyUsers);
router.get('/stats', authRequired, users.getFamilyStats);
router.post('/invite', authRequired, requireRole(['ADMIN']), users.inviteUser);
router.patch('/:id/role', authRequired, requireRole(['ADMIN']), users.updateUserRole);
router.delete('/:id', authRequired, requireRole(['ADMIN']), users.removeUser);

module.exports = router;
