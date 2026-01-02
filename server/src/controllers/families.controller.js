const pool = require('../db/pool');

async function getMyFamily(req, res, next) {
  try {
    const r = await pool.query('SELECT id,name,created_at FROM families WHERE id = $1', [req.user.familyId]);
    if (!r.rows.length) return res.status(404).json({ error: 'Family not found' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function updateMyFamily(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const r = await pool.query('UPDATE families SET name=$1 WHERE id=$2 RETURNING id,name,created_at', [name, req.user.familyId]);
    res.json(r.rows[0]);
  } catch (err) {
    // Handle duplicate family name error
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A family with this name already exists' });
    }
    next(err);
  }
}

module.exports = { getMyFamily, updateMyFamily };
