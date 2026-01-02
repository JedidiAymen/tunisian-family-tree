const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

// List people - can see ALL families, but we mark which ones are editable
async function listPeople(req, res, next) {
  try {
    const { search, surnameId, regionId, expertiseId, familyId, cityId } = req.query;
    const params = [];
    let idx = 1;
    let where = 'WHERE 1=1';
    
    // If familyId filter provided, use it; otherwise show all
    if (familyId) {
      where += ` AND p.family_id = $${idx}`;
      params.push(familyId);
      idx++;
    }
    
    if (search) {
      where += ` AND (p.first_name ILIKE $${idx} OR p.last_name_raw ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (surnameId) { where += ` AND p.surname_id = $${idx}`; params.push(surnameId); idx++; }
    if (regionId) { where += ` AND p.region_id = $${idx}`; params.push(regionId); idx++; }
    if (expertiseId) { where += ` AND p.expertise_id = $${idx}`; params.push(expertiseId); idx++; }
    if (cityId) { where += ` AND LOWER(p.current_city) = LOWER($${idx})`; params.push(cityId); idx++; }
    
    const q = `
      SELECT p.id, p.family_id, p.first_name, p.last_name_raw, p.surname_id, p.region_id, p.expertise_id, 
             p.birth_date, p.death_date, p.notes, p.created_at, p.current_city,
             f.name as family_name,
             s.canonical_name as surname,
             r.name as region,
             e.name as expertise
      FROM people p
      LEFT JOIN families f ON p.family_id = f.id
      LEFT JOIN surnames s ON p.surname_id = s.id
      LEFT JOIN regions r ON p.region_id = r.id
      LEFT JOIN expertise_fields e ON p.expertise_id = e.id
      ${where} 
      ORDER BY f.name, p.last_name_raw NULLS LAST, p.first_name 
      LIMIT 500`;
    const r = await pool.query(q, params);
    
    // Mark editable (only if person belongs to user's family)
    const result = r.rows.map(p => ({
      ...p,
      canEdit: p.family_id === req.user.familyId
    }));
    
    res.json(result);
  } catch (err) { next(err); }
}

// Get all distinct cities (for filtering dropdown)
async function listCities(req, res, next) {
  try {
    const r = await pool.query(`
      SELECT DISTINCT current_city as city 
      FROM people 
      WHERE current_city IS NOT NULL AND current_city != '' 
      ORDER BY current_city
    `);
    res.json(r.rows.map(row => row.city));
  } catch (err) { next(err); }
}

// Get all families (for filtering dropdown)
async function listFamilies(req, res, next) {
  try {
    const r = await pool.query('SELECT id, name FROM families ORDER BY name');
    res.json(r.rows);
  } catch (err) { next(err); }
}

async function createPerson(req, res, next) {
  try {
    const family_id = req.user.familyId; // enforce server-side
    const id = uuidv4();
    const { first_name, last_name_raw = null, surname_id = null, region_id = null, expertise_id = null, current_city = null, birth_date = null, death_date = null, notes = null } = req.body;
    if (!first_name) return res.status(400).json({ error: 'Missing first_name' });
    const q = `INSERT INTO people(id,family_id,first_name,last_name_raw,surname_id,region_id,expertise_id,current_city,birth_date,death_date,notes,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()) RETURNING *`;
    const params = [id,family_id,first_name,last_name_raw,surname_id,region_id,expertise_id,current_city,birth_date,death_date,notes];
    const r = await pool.query(q, params);
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
}

async function getPerson(req, res, next) {
  try {
    const id = req.params.id;
    const r = await pool.query(`
      SELECT p.*, f.name as family_name,
             s.canonical_name as surname,
             r.name as region,
             e.name as expertise
      FROM people p
      LEFT JOIN families f ON p.family_id = f.id
      LEFT JOIN surnames s ON p.surname_id = s.id
      LEFT JOIN regions r ON p.region_id = r.id
      LEFT JOIN expertise_fields e ON p.expertise_id = e.id
      WHERE p.id=$1`, [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    const person = r.rows[0];
    // Anyone can view, but mark if editable
    person.canEdit = person.family_id === req.user.familyId;
    res.json(person);
  } catch (err) { next(err); }
}

async function patchPerson(req, res, next) {
  try {
    const id = req.params.id;
    const r0 = await pool.query('SELECT * FROM people WHERE id=$1', [id]);
    if (!r0.rows.length) return res.status(404).json({ error: 'Not found' });
    const person = r0.rows[0];
    // Only owner family can modify
    if (person.family_id !== req.user.familyId) return res.status(403).json({ error: 'You can only edit your own family members' });
    const fields = ['first_name','last_name_raw','surname_id','region_id','expertise_id','birth_date','death_date','notes','current_city'];
    const updates = [];
    const params = [];
    let idx = 1;
    for (const f of fields) {
      if (f in req.body) {
        updates.push(`${f} = $${idx}`);
        params.push(req.body[f]);
        idx++;
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    const q = `UPDATE people SET ${updates.join(',')} WHERE id=$${idx} RETURNING *`;
    const r = await pool.query(q, params);
    res.json(r.rows[0]);
  } catch (err) { next(err); }
}

async function putPerson(req, res, next) {
  try {
    const id = req.params.id;
    const r0 = await pool.query('SELECT * FROM people WHERE id=$1', [id]);
    if (!r0.rows.length) return res.status(404).json({ error: 'Not found' });
    const person = r0.rows[0];
    // Only owner family can modify
    if (person.family_id !== req.user.familyId) return res.status(403).json({ error: 'You can only edit your own family members' });
    // Full replace: required first_name, others may be null / cleared
    const { first_name, last_name_raw = null, surname_id = null, region_id = null, expertise_id = null, current_city = null, birth_date = null, death_date = null, notes = null } = req.body;
    if (!first_name) return res.status(400).json({ error: 'Missing first_name' });
    const q = `UPDATE people SET first_name=$1,last_name_raw=$2,surname_id=$3,region_id=$4,expertise_id=$5,current_city=$6,birth_date=$7,death_date=$8,notes=$9 WHERE id=$10 RETURNING *`;
    const params = [first_name,last_name_raw,surname_id,region_id,expertise_id,current_city,birth_date,death_date,notes,id];
    const r = await pool.query(q, params);
    res.json(r.rows[0]);
  } catch (err) { next(err); }
}

async function deletePerson(req, res, next) {
  try {
    const id = req.params.id;
    const r0 = await pool.query('SELECT * FROM people WHERE id=$1', [id]);
    if (!r0.rows.length) return res.status(404).json({ error: 'Not found' });
    const person = r0.rows[0];
    // Only owner family can delete
    if (person.family_id !== req.user.familyId) return res.status(403).json({ error: 'You can only delete your own family members' });
    await pool.query('DELETE FROM people WHERE id=$1', [id]);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { listPeople, listFamilies, listCities, createPerson, getPerson, patchPerson, putPerson, deletePerson };
