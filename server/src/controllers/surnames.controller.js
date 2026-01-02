const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

async function listSurnames(req, res, next) {
  try {
    const q = req.query.query ? `%${req.query.query}%` : '%';
    const r = await pool.query('SELECT id, canonical_name, aliases, notes, created_at FROM surnames WHERE canonical_name ILIKE $1 ORDER BY canonical_name LIMIT 100', [q]);
    res.json(r.rows);
  } catch (err) { next(err); }
}

async function createSurname(req, res, next) {
  try {
    const { canonical_name, aliases = [], notes = null } = req.body;
    if (!canonical_name) return res.status(400).json({ error: 'Missing canonical_name' });
    const id = uuidv4();
    const r = await pool.query('INSERT INTO surnames(id,canonical_name,aliases,notes,created_at) VALUES($1,$2,$3,$4,NOW()) RETURNING id,canonical_name,aliases,notes,created_at', [id, canonical_name, aliases, notes]);
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
}

module.exports = { listSurnames, createSurname };
