const pool = require('../db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const SALT_ROUNDS = 10;

async function register(req, res, next) {
  const { familyName, firstName, lastName, email, password, currentCity } = req.body;
  
  // Validate required fields
  if (!familyName || !firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields: familyName, firstName, lastName, email, password' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if family already exists
    const existingFamily = await client.query(
      'SELECT id FROM families WHERE LOWER(name) = LOWER($1)',
      [familyName.trim()]
    );
    
    let familyId;
    let role;
    
    if (existingFamily.rows.length > 0) {
      // Family exists - add user to existing family as VIEWER
      familyId = existingFamily.rows[0].id;
      role = 'VIEWER';
    } else {
      // Create new family - user becomes ADMIN
      familyId = uuidv4();
      await client.query(
        'INSERT INTO families(id,name,created_at) VALUES($1,$2,NOW())',
        [familyId, familyName.trim()]
      );
      role = 'ADMIN';
    }
    
    // Create user with name and city
    const userId = uuidv4();
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    await client.query(
      'INSERT INTO users(id,family_id,email,password_hash,first_name,last_name,current_city,role,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW())',
      [userId, familyId, email.toLowerCase(), password_hash, firstName.trim(), lastName.trim(), currentCity?.trim() || null, role]
    );
    
    // Also add this person to the people table so they appear in the family tree
    const personId = uuidv4();
    await client.query(
      'INSERT INTO people(id,family_id,first_name,last_name_raw,current_city,notes,created_at) VALUES($1,$2,$3,$4,$5,$6,NOW())',
      [personId, familyId, firstName.trim(), lastName.trim(), currentCity?.trim() || null, 'Registered user']
    );
    
    await client.query('COMMIT');
    
    const token = jwt.sign({ sub: userId, familyId, role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ 
      accessToken: token, 
      user: { 
        id: userId, 
        email, 
        firstName, 
        lastName, 
        currentCity: currentCity || null,
        role, 
        familyId,
        isNewFamily: role === 'ADMIN'
      },
      message: role === 'ADMIN' 
        ? `New family "${familyName}" created. You are the admin.`
        : `You have been added to the "${familyName}" family as a viewer.`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    next(err);
  } finally {
    client.release();
  }
}

async function login(req, res, next) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const result = await pool.query('SELECT id,family_id,password_hash,role,email FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!result.rows.length) return res.status(400).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ sub: user.id, familyId: user.family_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ accessToken: token, user: { id: user.id, email: user.email, role: user.role, familyId: user.family_id } });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  const { userId, familyId, role } = req.user;
  res.json({ id: userId, familyId, role });
}

module.exports = { register, login, me };
