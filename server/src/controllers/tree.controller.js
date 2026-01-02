const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

async function createEdge(req, res, next) {
  try {
    const { fromPersonId, toPersonId, type } = req.body;
    if (!fromPersonId || !toPersonId || !type) return res.status(400).json({ error: 'Missing fields' });
    
    // Get both people
    const r1 = await pool.query('SELECT id, family_id FROM people WHERE id IN ($1, $2)', [fromPersonId, toPersonId]);
    if (r1.rows.length !== 2) return res.status(400).json({ error: 'Person(s) not found' });
    
    const person1 = r1.rows.find(p => p.id === fromPersonId);
    const person2 = r1.rows.find(p => p.id === toPersonId);
    
    // For SPOUSE_OF: At least one person must be from your family
    // For PARENT_OF: The parent (from_person) must be from your family
    if (type === 'SPOUSE_OF') {
      // Allow cross-family marriages: at least one spouse must be from your family
      if (person1.family_id !== req.user.familyId && person2.family_id !== req.user.familyId) {
        return res.status(403).json({ error: 'At least one spouse must be from your family' });
      }
    } else if (type === 'PARENT_OF') {
      // Parent must be from your family, child will be added to parent's family
      if (person1.family_id !== req.user.familyId) {
        return res.status(403).json({ error: 'The parent must be from your family' });
      }
    }
    
    // Use the "from" person's family for the edge (husband/parent's family)
    const edgeFamilyId = person1.family_id;
    
    const id = uuidv4();
    const q = 'INSERT INTO family_tree_edges(id, family_id, from_person_id, to_person_id, type, created_at) VALUES($1, $2, $3, $4, $5, NOW()) RETURNING *';
    const r = await pool.query(q, [id, edgeFamilyId, fromPersonId, toPersonId, type]);
    res.status(201).json(r.rows[0]);
  } catch (err) { 
    if (err.code === '23505') return res.status(400).json({ error: 'This relationship already exists' });
    next(err); 
  }
}

async function listEdges(req, res, next) {
  try {
    const { familyId } = req.query;
    let q, params;
    if (familyId) {
      q = 'SELECT id, family_id, from_person_id as "from", to_person_id as "to", type, created_at FROM family_tree_edges WHERE family_id=$1';
      params = [familyId];
    } else {
      // Return all edges (for viewing all families)
      q = 'SELECT id, family_id, from_person_id as "from", to_person_id as "to", type, created_at FROM family_tree_edges';
      params = [];
    }
    const r = await pool.query(q, params);
    // Mark which edges user can edit
    const result = r.rows.map(e => ({
      ...e,
      canEdit: e.family_id === req.user.familyId
    }));
    res.json(result);
  } catch (err) { next(err); }
}

async function deleteEdge(req, res, next) {
  try {
    const id = req.params.id;
    const r0 = await pool.query('SELECT family_id FROM family_tree_edges WHERE id=$1', [id]);
    if (!r0.rows.length) return res.status(404).json({ error: 'Not found' });
    if (r0.rows[0].family_id !== req.user.familyId) return res.status(403).json({ error: 'You can only delete edges from your own family' });
    await pool.query('DELETE FROM family_tree_edges WHERE id=$1', [id]);
    res.status(204).end();
  } catch (err) { next(err); }
}

async function graph(req, res, next) {
  try {
    const { familyId, city } = req.query;
    let whereConditions = [];
    let params = [];
    let idx = 1;
    
    if (familyId) {
      whereConditions.push(`p.family_id = $${idx}`);
      params.push(familyId);
      idx++;
    }
    
    if (city) {
      whereConditions.push(`LOWER(p.current_city) = LOWER($${idx})`);
      params.push(city);
      idx++;
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    const nodesQ = `
      SELECT p.id, p.family_id, f.name as family_name, p.current_city,
             p.first_name || ' ' || coalesce(p.last_name_raw,'') as label, 
             s.canonical_name as surname, r.name as region, e.name as expertise
      FROM people p
      LEFT JOIN families f ON p.family_id = f.id
      LEFT JOIN surnames s ON p.surname_id = s.id
      LEFT JOIN regions r ON p.region_id = r.id
      LEFT JOIN expertise_fields e ON p.expertise_id = e.id
      ${whereClause}
      ORDER BY f.name, p.first_name`;
    
    const nodes = (await pool.query(nodesQ, params)).rows.map(n => ({
      ...n,
      canEdit: n.family_id === req.user.familyId
    }));
    
    // Get node IDs for filtering edges
    const nodeIds = nodes.map(n => n.id);
    
    // Only return edges where both nodes are in the filtered set
    let edges = [];
    if (nodeIds.length > 0) {
      const edgesQ = `SELECT id, family_id, from_person_id as "from", to_person_id as "to", type FROM family_tree_edges 
                      WHERE from_person_id = ANY($1) AND to_person_id = ANY($1)`;
      edges = (await pool.query(edgesQ, [nodeIds])).rows.map(e => ({
        ...e,
        canEdit: e.family_id === req.user.familyId
      }));
    }
    
    res.json({ nodes, edges });
  } catch (err) { next(err); }
}

async function personSubgraph(req, res, next) {
  try {
    const id = req.params.id;
    // Get person info
    const r0 = await pool.query('SELECT id, family_id FROM people WHERE id=$1', [id]);
    if (!r0.rows.length) return res.status(404).json({ error: 'Not found' });
    const personFamilyId = r0.rows[0].family_id;
    
    const nodesQ = `SELECT p.id, p.family_id, p.first_name || ' ' || coalesce(p.last_name_raw,'') as label FROM people p WHERE p.family_id=$1 AND p.id IN (
      SELECT from_person_id FROM family_tree_edges WHERE family_id=$1 AND (from_person_id=$2 OR to_person_id=$2)
      UNION
      SELECT to_person_id FROM family_tree_edges WHERE family_id=$1 AND (from_person_id=$2 OR to_person_id=$2)
      UNION SELECT $2
    )`;
    const edgesQ = `SELECT id, family_id, from_person_id as "from", to_person_id as "to", type FROM family_tree_edges WHERE family_id=$1 AND (from_person_id=$2 OR to_person_id=$2)`;
    
    const nodes = (await pool.query(nodesQ, [personFamilyId, id])).rows.map(n => ({
      ...n,
      canEdit: n.family_id === req.user.familyId
    }));
    const edges = (await pool.query(edgesQ, [personFamilyId, id])).rows.map(e => ({
      ...e,
      canEdit: e.family_id === req.user.familyId
    }));
    
    res.json({ nodes, edges });
  } catch (err) { next(err); }
}

module.exports = { createEdge, listEdges, deleteEdge, graph, personSubgraph };
