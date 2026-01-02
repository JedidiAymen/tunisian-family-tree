const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

async function listExpertise(req, res, next) {
  try {
    const r = await pool.query('SELECT id,name FROM expertise_fields ORDER BY name');
    res.json(r.rows);
  } catch (err) { next(err); }
}

async function createExpertise(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const id = uuidv4();
    const r = await pool.query('INSERT INTO expertise_fields(id,name) VALUES($1,$2) RETURNING id,name', [id, name]);
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
}

module.exports = { listExpertise, createExpertise };
