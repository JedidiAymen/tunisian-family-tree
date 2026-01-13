const pool = require('../db/pool');

/**
 * Find shortest path between two people using BFS
 */
async function findPath(req, res, next) {
  try {
    const { fromId, toId } = req.query;
    if (!fromId || !toId) {
      return res.status(400).json({ error: 'fromId and toId are required' });
    }

    // Get all edges
    const edgesResult = await pool.query(`
      SELECT from_person_id, to_person_id, type FROM family_tree_edges
    `);
    
    // Build adjacency list (bidirectional)
    const graph = {};
    for (const edge of edgesResult.rows) {
      if (!graph[edge.from_person_id]) graph[edge.from_person_id] = [];
      if (!graph[edge.to_person_id]) graph[edge.to_person_id] = [];
      graph[edge.from_person_id].push({ to: edge.to_person_id, type: edge.type, direction: 'forward' });
      graph[edge.to_person_id].push({ to: edge.from_person_id, type: edge.type, direction: 'reverse' });
    }

    // BFS to find shortest path
    const queue = [{ id: fromId, path: [fromId], edges: [] }];
    const visited = new Set([fromId]);

    while (queue.length > 0) {
      const { id, path, edges } = queue.shift();
      
      if (id === toId) {
        // Found the path! Get person details
        const peopleResult = await pool.query(`
          SELECT p.id, p.first_name || ' ' || COALESCE(p.last_name_raw, '') as name,
                 p.family_id, f.name as family_name, p.current_city
          FROM people p
          LEFT JOIN families f ON p.family_id = f.id
          WHERE p.id = ANY($1)
        `, [path]);

        const peopleMap = {};
        peopleResult.rows.forEach(p => peopleMap[p.id] = p);

        // Build path with relationship descriptions
        const pathDetails = path.map((personId, idx) => {
          const person = peopleMap[personId];
          let relationship = null;
          if (idx > 0) {
            const edge = edges[idx - 1];
            relationship = getRelationshipLabel(edge.type, edge.direction);
          }
          return { ...person, relationship };
        });

        return res.json({
          found: true,
          degrees: path.length - 1,
          path: pathDetails,
          edges: edges
        });
      }

      const neighbors = graph[id] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.to)) {
          visited.add(neighbor.to);
          queue.push({
            id: neighbor.to,
            path: [...path, neighbor.to],
            edges: [...edges, { from: id, to: neighbor.to, type: neighbor.type, direction: neighbor.direction }]
          });
        }
      }
    }

    res.json({ found: false, message: 'No path found between these people' });
  } catch (err) {
    next(err);
  }
}

function getRelationshipLabel(type, direction) {
  if (type === 'SPOUSE_OF') {
    return 'spouse of';
  }
  if (type === 'PARENT_OF') {
    return direction === 'forward' ? 'child of' : 'parent of';
  }
  return type.toLowerCase().replace('_', ' ');
}

/**
 * Get subgraph within N hops of a person (focus mode)
 */
async function getFocusGraph(req, res, next) {
  try {
    const { personId } = req.params;
    const depth = parseInt(req.query.depth) || 2;
    const showAncestors = req.query.ancestors !== 'false';
    const showDescendants = req.query.descendants !== 'false';

    // Get all edges
    const edgesResult = await pool.query(`
      SELECT from_person_id, to_person_id, type FROM family_tree_edges
    `);

    // Build adjacency list
    const graph = {};
    for (const edge of edgesResult.rows) {
      if (!graph[edge.from_person_id]) graph[edge.from_person_id] = [];
      if (!graph[edge.to_person_id]) graph[edge.to_person_id] = [];
      
      // from_person_id is parent, to_person_id is child
      if (edge.type === 'PARENT_OF') {
        if (showDescendants) {
          graph[edge.from_person_id].push({ to: edge.to_person_id, type: 'child' });
        }
        if (showAncestors) {
          graph[edge.to_person_id].push({ to: edge.from_person_id, type: 'parent' });
        }
      } else if (edge.type === 'SPOUSE_OF') {
        graph[edge.from_person_id].push({ to: edge.to_person_id, type: 'spouse' });
        graph[edge.to_person_id].push({ to: edge.from_person_id, type: 'spouse' });
      }
    }

    // BFS to find all nodes within depth
    const nodeIds = new Set([personId]);
    const queue = [{ id: personId, level: 0 }];
    const nodeLevels = { [personId]: 0 };

    while (queue.length > 0) {
      const { id, level } = queue.shift();
      if (level >= depth) continue;

      const neighbors = graph[id] || [];
      for (const neighbor of neighbors) {
        if (!nodeIds.has(neighbor.to)) {
          nodeIds.add(neighbor.to);
          nodeLevels[neighbor.to] = level + 1;
          queue.push({ id: neighbor.to, level: level + 1 });
        }
      }
    }

    // Get node details
    const nodeIdsArray = Array.from(nodeIds);
    const nodesResult = await pool.query(`
      SELECT p.id, p.first_name || ' ' || COALESCE(p.last_name_raw, '') as label,
             p.family_id, f.name as family_name, p.current_city
      FROM people p
      LEFT JOIN families f ON p.family_id = f.id
      WHERE p.id = ANY($1)
    `, [nodeIdsArray]);

    const nodes = nodesResult.rows.map(n => ({
      ...n,
      level: nodeLevels[n.id],
      isFocus: n.id === personId,
      canEdit: n.family_id === req.user.familyId
    }));

    // Get edges between these nodes
    const edgesInGraph = await pool.query(`
      SELECT id, from_person_id as "from", to_person_id as "to", type
      FROM family_tree_edges
      WHERE from_person_id = ANY($1) AND to_person_id = ANY($1)
    `, [nodeIdsArray]);

    res.json({
      focusPerson: personId,
      depth,
      nodes,
      edges: edgesInGraph.rows
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Search people for command palette
 */
async function searchPeople(req, res, next) {
  try {
    const { q, limit = 10 } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const result = await pool.query(`
      SELECT p.id, p.first_name || ' ' || COALESCE(p.last_name_raw, '') as name,
             p.family_id, f.name as family_name, p.current_city,
             p.birth_date, p.occupation_title
      FROM people p
      LEFT JOIN families f ON p.family_id = f.id
      WHERE 
        LOWER(p.first_name || ' ' || COALESCE(p.last_name_raw, '')) LIKE LOWER($1)
        OR LOWER(p.first_name) LIKE LOWER($1)
        OR LOWER(p.last_name_raw) LIKE LOWER($1)
      ORDER BY 
        CASE WHEN p.family_id = $2 THEN 0 ELSE 1 END,
        p.first_name
      LIMIT $3
    `, [`%${q}%`, req.user.familyId, parseInt(limit)]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

/**
 * Get saved views
 */
async function getSavedViews(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT sv.*, u.email as created_by_email
      FROM saved_views sv
      LEFT JOIN users u ON sv.user_id = u.id
      WHERE sv.user_id = $1 OR (sv.is_shared = true AND sv.family_id = $2)
      ORDER BY sv.created_at DESC
    `, [req.user.userId, req.user.familyId]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

/**
 * Create saved view
 */
async function createSavedView(req, res, next) {
  try {
    const { name, description, filters, isShared } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await pool.query(`
      INSERT INTO saved_views (user_id, family_id, name, description, filters, is_shared)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.user.userId, req.user.familyId, name, description || null, filters || {}, isShared || false]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * Delete saved view
 */
async function deleteSavedView(req, res, next) {
  try {
    const { id } = req.params;
    
    // Check ownership
    const check = await pool.query('SELECT user_id FROM saved_views WHERE id = $1', [id]);
    if (!check.rows.length) {
      return res.status(404).json({ error: 'View not found' });
    }
    if (check.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM saved_views WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

/**
 * Get graph statistics
 */
async function getGraphStats(req, res, next) {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM people WHERE family_id = $1) as family_members,
        (SELECT COUNT(*) FROM people) as total_people,
        (SELECT COUNT(*) FROM family_tree_edges WHERE family_id = $1) as family_edges,
        (SELECT COUNT(*) FROM family_tree_edges) as total_edges,
        (SELECT COUNT(DISTINCT family_id) FROM people) as families_count,
        (SELECT COUNT(*) FROM family_tree_edges WHERE type = 'SPOUSE_OF' 
         AND family_id IN (SELECT id FROM families)) as marriages
    `, [req.user.familyId]);

    res.json(stats.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  findPath,
  getFocusGraph,
  searchPeople,
  getSavedViews,
  createSavedView,
  deleteSavedView,
  getGraphStats
};
