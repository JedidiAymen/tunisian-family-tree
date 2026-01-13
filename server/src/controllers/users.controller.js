const pool = require('../db/pool');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const SALT_ROUNDS = 10;

// Get all users in the family (admin only)
async function listFamilyUsers(req, res, next) {
  const { familyId } = req.user;
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.current_city, 
        u.role, u.created_at,
        p.id as person_id
      FROM users u
      LEFT JOIN people p ON (
        p.family_id = u.family_id 
        AND LOWER(p.first_name) = LOWER(u.first_name) 
        AND LOWER(COALESCE(p.last_name_raw, '')) = LOWER(COALESCE(u.last_name, ''))
      )
      WHERE u.family_id = $1
      ORDER BY 
        CASE u.role WHEN 'ADMIN' THEN 1 WHEN 'EDITOR' THEN 2 ELSE 3 END,
        u.created_at ASC
    `, [familyId]);
    
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// Update user role (admin only)
async function updateUserRole(req, res, next) {
  const { familyId, role: currentUserRole, userId: currentUserId } = req.user;
  const { id } = req.params;
  const { role: newRole } = req.body;
  
  // Only admins can change roles
  if (currentUserRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admins can change user roles' });
  }
  
  // Can't change your own role
  if (id === currentUserId) {
    return res.status(400).json({ error: 'You cannot change your own role' });
  }
  
  // Validate role
  if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(newRole)) {
    return res.status(400).json({ error: 'Invalid role. Must be ADMIN, EDITOR, or VIEWER' });
  }
  
  try {
    // Make sure user belongs to same family
    const userCheck = await pool.query(
      'SELECT id, family_id FROM users WHERE id = $1',
      [id]
    );
    
    if (!userCheck.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userCheck.rows[0].family_id !== familyId) {
      return res.status(403).json({ error: 'Cannot modify users from other families' });
    }
    
    // Check there will be at least one admin remaining
    if (userCheck.rows[0].role === 'ADMIN' && newRole !== 'ADMIN') {
      const adminCount = await pool.query(
        'SELECT COUNT(*) FROM users WHERE family_id = $1 AND role = $2',
        [familyId, 'ADMIN']
      );
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last admin. Promote another user first.' });
      }
    }
    
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role',
      [newRole, id]
    );
    
    res.json({ 
      message: `User role updated to ${newRole}`,
      user: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

// Remove user from family (admin only)
async function removeUser(req, res, next) {
  const { familyId, role: currentUserRole, userId: currentUserId } = req.user;
  const { id } = req.params;
  
  if (currentUserRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admins can remove users' });
  }
  
  if (id === currentUserId) {
    return res.status(400).json({ error: 'You cannot remove yourself' });
  }
  
  try {
    // Make sure user belongs to same family
    const userCheck = await pool.query(
      'SELECT id, family_id, role, email FROM users WHERE id = $1',
      [id]
    );
    
    if (!userCheck.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userCheck.rows[0].family_id !== familyId) {
      return res.status(403).json({ error: 'Cannot remove users from other families' });
    }
    
    // Prevent removing the last admin
    if (userCheck.rows[0].role === 'ADMIN') {
      const adminCount = await pool.query(
        'SELECT COUNT(*) FROM users WHERE family_id = $1 AND role = $2',
        [familyId, 'ADMIN']
      );
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin' });
      }
    }
    
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    res.json({ message: 'User removed successfully' });
  } catch (err) {
    next(err);
  }
}

// Create invite link / add user directly (admin only)
async function inviteUser(req, res, next) {
  const { familyId, role: currentUserRole } = req.user;
  const { email, firstName, lastName, role = 'VIEWER', password } = req.body;
  
  if (currentUserRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admins can invite users' });
  }
  
  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: 'Email, firstName, and lastName are required' });
  }
  
  if (!['EDITOR', 'VIEWER'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role for invite. Use EDITOR or VIEWER' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if email already exists
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }
    
    // Get family name
    const family = await client.query('SELECT name FROM families WHERE id = $1', [familyId]);
    
    // Create user with temporary password or provided password
    const userId = uuidv4();
    const tempPassword = password || Math.random().toString(36).slice(-8) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    
    await client.query(`
      INSERT INTO users(id, family_id, email, password_hash, first_name, last_name, role, created_at)
      VALUES($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [userId, familyId, email.toLowerCase(), passwordHash, firstName.trim(), lastName.trim(), role]);
    
    // Also create a person record
    const personId = uuidv4();
    await client.query(`
      INSERT INTO people(id, family_id, first_name, last_name_raw, notes, created_at)
      VALUES($1, $2, $3, $4, $5, NOW())
    `, [personId, familyId, firstName.trim(), lastName.trim(), 'Invited by admin']);
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: userId,
        email: email.toLowerCase(),
        firstName,
        lastName,
        role,
        tempPassword: password ? undefined : tempPassword // Only return temp password if we generated it
      },
      instructions: password 
        ? 'User can now log in with the provided credentials'
        : `User can log in with email "${email}" and temporary password "${tempPassword}". They should change it after first login.`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// Get family stats for admin dashboard
async function getFamilyStats(req, res, next) {
  const { familyId } = req.user;
  
  try {
    const [users, people, edges, family] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE role = 'ADMIN') as admins,
          COUNT(*) FILTER (WHERE role = 'EDITOR') as editors,
          COUNT(*) FILTER (WHERE role = 'VIEWER') as viewers,
          COUNT(*) as total
        FROM users WHERE family_id = $1
      `, [familyId]),
      pool.query('SELECT COUNT(*) FROM people WHERE family_id = $1', [familyId]),
      pool.query('SELECT COUNT(*) FROM family_tree_edges WHERE family_id = $1', [familyId]),
      pool.query('SELECT name, created_at FROM families WHERE id = $1', [familyId])
    ]);
    
    res.json({
      family: family.rows[0],
      users: {
        total: parseInt(users.rows[0].total),
        admins: parseInt(users.rows[0].admins),
        editors: parseInt(users.rows[0].editors),
        viewers: parseInt(users.rows[0].viewers)
      },
      people: parseInt(people.rows[0].count),
      relationships: parseInt(edges.rows[0].count)
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listFamilyUsers,
  updateUserRole,
  removeUser,
  inviteUser,
  getFamilyStats
};
