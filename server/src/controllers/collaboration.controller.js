const pool = require('../db/pool');

// ==================== AUDIT LOG ====================

// Get activity feed for family
exports.getActivityFeed = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const { limit = 50, offset = 0, entityType, action } = req.query;
    
    let query = `
      SELECT 
        a.id, a.action, a.entity_type, a.entity_id, a.entity_name,
        a.changes, a.created_at,
        u.email as user_email,
        u.first_name as user_first_name
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.family_id = $1
    `;
    
    const params = [familyId];
    let paramIndex = 2;
    
    if (entityType) {
      query += ` AND a.entity_type = $${paramIndex}`;
      params.push(entityType);
      paramIndex++;
    }
    
    if (action) {
      query += ` AND a.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }
    
    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    // Format for display
    const activities = result.rows.map(row => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityName: row.entity_name,
      changes: row.changes,
      createdAt: row.created_at,
      user: row.user_email ? {
        email: row.user_email,
        firstName: row.user_first_name
      } : null,
      message: formatActivityMessage(row)
    }));
    
    res.json(activities);
  } catch (err) {
    console.error('Error fetching activity feed:', err);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
};

function formatActivityMessage(row) {
  const userName = row.user_first_name || row.user_email?.split('@')[0] || 'Someone';
  const entityName = row.entity_name || 'a person';
  
  switch (row.action) {
    case 'CREATE':
      return `${userName} added ${entityName}`;
    case 'UPDATE':
      const field = row.changes?.field || 'info';
      return `${userName} updated ${field} for ${entityName}`;
    case 'DELETE':
      return `${userName} removed ${entityName}`;
    case 'LINK_PARENT':
      return `${userName} linked parent for ${entityName}`;
    case 'LINK_SPOUSE':
      return `${userName} linked spouse for ${entityName}`;
    case 'UNLINK':
      return `${userName} unlinked a relationship for ${entityName}`;
    default:
      return `${userName} modified ${entityName}`;
  }
}

// Log an action (internal helper, also exported for other controllers)
exports.logAction = async (familyId, userId, action, entityType, entityId, entityName, changes = {}) => {
  try {
    await pool.query(`
      INSERT INTO audit_log (family_id, user_id, action, entity_type, entity_id, entity_name, changes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [familyId, userId, action, entityType, entityId, entityName, changes]);
  } catch (err) {
    console.error('Error logging action:', err);
  }
};

// Get activity stats
exports.getActivityStats = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    
    const result = await pool.query(`
      SELECT 
        action,
        COUNT(*) as count,
        MAX(created_at) as last_activity
      FROM audit_log
      WHERE family_id = $1
      GROUP BY action
      ORDER BY count DESC
    `, [familyId]);
    
    // Get top contributors
    const contributors = await pool.query(`
      SELECT 
        u.email,
        u.first_name,
        COUNT(*) as action_count
      FROM audit_log a
      JOIN users u ON a.user_id = u.id
      WHERE a.family_id = $1
      GROUP BY u.id, u.email, u.first_name
      ORDER BY action_count DESC
      LIMIT 5
    `, [familyId]);
    
    // Get activity by day (last 30 days)
    const byDay = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM audit_log
      WHERE family_id = $1 AND created_at > NOW() - interval '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [familyId]);
    
    res.json({
      byAction: result.rows,
      topContributors: contributors.rows,
      byDay: byDay.rows
    });
  } catch (err) {
    console.error('Error fetching activity stats:', err);
    res.status(500).json({ error: 'Failed to fetch activity stats' });
  }
};

// ==================== DUPLICATE DETECTION ====================

// Find potential duplicates
exports.findDuplicates = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    
    // Find people with similar names and/or birth dates
    const result = await pool.query(`
      WITH potential_matches AS (
        SELECT 
          p1.id as person1_id,
          p1.first_name as p1_first,
          p1.last_name_raw as p1_last,
          p1.birth_date as p1_birth,
          p1.birthplace as p1_birthplace,
          p2.id as person2_id,
          p2.first_name as p2_first,
          p2.last_name_raw as p2_last,
          p2.birth_date as p2_birth,
          p2.birthplace as p2_birthplace,
          -- Calculate similarity score
          CASE WHEN LOWER(p1.first_name) = LOWER(p2.first_name) THEN 40 ELSE 0 END +
          CASE WHEN LOWER(COALESCE(p1.last_name_raw,'')) = LOWER(COALESCE(p2.last_name_raw,'')) THEN 30 ELSE 0 END +
          CASE WHEN p1.birth_date = p2.birth_date AND p1.birth_date IS NOT NULL THEN 20 ELSE 0 END +
          CASE WHEN LOWER(COALESCE(p1.birthplace,'')) = LOWER(COALESCE(p2.birthplace,'')) AND p1.birthplace IS NOT NULL THEN 10 ELSE 0 END
          as score
        FROM people p1
        JOIN people p2 ON p1.family_id = p2.family_id AND p1.id < p2.id
        WHERE p1.family_id = $1
          AND (
            LOWER(p1.first_name) = LOWER(p2.first_name)
            OR (p1.birth_date = p2.birth_date AND p1.birth_date IS NOT NULL)
          )
      )
      SELECT * FROM potential_matches
      WHERE score >= 40
      ORDER BY score DESC
      LIMIT 20
    `, [familyId]);
    
    const duplicates = result.rows.map(row => ({
      person1: {
        id: row.person1_id,
        firstName: row.p1_first,
        lastName: row.p1_last,
        birthDate: row.p1_birth,
        birthplace: row.p1_birthplace
      },
      person2: {
        id: row.person2_id,
        firstName: row.p2_first,
        lastName: row.p2_last,
        birthDate: row.p2_birth,
        birthplace: row.p2_birthplace
      },
      confidence: row.score,
      matchReasons: getMatchReasons(row)
    }));
    
    res.json(duplicates);
  } catch (err) {
    console.error('Error finding duplicates:', err);
    res.status(500).json({ error: 'Failed to find duplicates' });
  }
};

function getMatchReasons(row) {
  const reasons = [];
  if (row.p1_first?.toLowerCase() === row.p2_first?.toLowerCase()) {
    reasons.push('Same first name');
  }
  if (row.p1_last?.toLowerCase() === row.p2_last?.toLowerCase() && row.p1_last) {
    reasons.push('Same last name');
  }
  if (row.p1_birth && row.p1_birth === row.p2_birth) {
    reasons.push('Same birth date');
  }
  if (row.p1_birthplace?.toLowerCase() === row.p2_birthplace?.toLowerCase() && row.p1_birthplace) {
    reasons.push('Same birthplace');
  }
  return reasons;
}

// Get pending duplicate candidates
exports.getDuplicateCandidates = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const { status = 'pending' } = req.query;
    
    const result = await pool.query(`
      SELECT 
        dc.id, dc.confidence, dc.match_reasons, dc.status, dc.created_at,
        p1.id as p1_id, p1.first_name as p1_first, p1.last_name_raw as p1_last,
        p1.birth_date as p1_birth, p1.birthplace as p1_birthplace, p1.current_city as p1_city,
        p2.id as p2_id, p2.first_name as p2_first, p2.last_name_raw as p2_last,
        p2.birth_date as p2_birth, p2.birthplace as p2_birthplace, p2.current_city as p2_city
      FROM duplicate_candidates dc
      JOIN people p1 ON dc.person1_id = p1.id
      JOIN people p2 ON dc.person2_id = p2.id
      WHERE dc.family_id = $1 AND dc.status = $2
      ORDER BY dc.confidence DESC, dc.created_at DESC
    `, [familyId, status]);
    
    res.json(result.rows.map(row => ({
      id: row.id,
      confidence: parseFloat(row.confidence),
      matchReasons: row.match_reasons,
      status: row.status,
      createdAt: row.created_at,
      person1: {
        id: row.p1_id,
        firstName: row.p1_first,
        lastName: row.p1_last,
        birthDate: row.p1_birth,
        birthplace: row.p1_birthplace,
        currentCity: row.p1_city
      },
      person2: {
        id: row.p2_id,
        firstName: row.p2_first,
        lastName: row.p2_last,
        birthDate: row.p2_birth,
        birthplace: row.p2_birthplace,
        currentCity: row.p2_city
      }
    })));
  } catch (err) {
    console.error('Error fetching duplicate candidates:', err);
    res.status(500).json({ error: 'Failed to fetch duplicate candidates' });
  }
};

// Dismiss a duplicate candidate
exports.dismissDuplicate = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const userId = req.user.sub;
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE duplicate_candidates
      SET status = 'dismissed', reviewed_by = $1, reviewed_at = NOW()
      WHERE id = $2 AND family_id = $3
      RETURNING id
    `, [userId, id, familyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Duplicate candidate not found' });
    }
    
    res.json({ message: 'Duplicate dismissed' });
  } catch (err) {
    console.error('Error dismissing duplicate:', err);
    res.status(500).json({ error: 'Failed to dismiss duplicate' });
  }
};

// Merge two people (keep person1, transfer data from person2)
exports.mergePeople = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const familyId = req.user.familyId;
    const userId = req.user.sub;
    const { person1Id, person2Id, keepFields } = req.body;
    
    await client.query('BEGIN');
    
    // Verify both people belong to this family
    const people = await client.query(
      'SELECT id, first_name, last_name_raw FROM people WHERE id IN ($1, $2) AND family_id = $3',
      [person1Id, person2Id, familyId]
    );
    
    if (people.rows.length !== 2) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'One or both people not found in your family' });
    }
    
    // Transfer relationships from person2 to person1
    await client.query(`
      UPDATE family_tree_edges 
      SET from_person_id = $1 
      WHERE from_person_id = $2 AND family_id = $3
      AND NOT EXISTS (
        SELECT 1 FROM family_tree_edges 
        WHERE from_person_id = $1 AND to_person_id = family_tree_edges.to_person_id AND type = family_tree_edges.type
      )
    `, [person1Id, person2Id, familyId]);
    
    await client.query(`
      UPDATE family_tree_edges 
      SET to_person_id = $1 
      WHERE to_person_id = $2 AND family_id = $3
      AND NOT EXISTS (
        SELECT 1 FROM family_tree_edges 
        WHERE to_person_id = $1 AND from_person_id = family_tree_edges.from_person_id AND type = family_tree_edges.type
      )
    `, [person1Id, person2Id, familyId]);
    
    // Transfer events from person2 to person1
    await client.query(`
      UPDATE person_events SET person_id = $1 WHERE person_id = $2 AND family_id = $3
    `, [person1Id, person2Id, familyId]);
    
    // Merge selected fields from person2 to person1 if specified
    if (keepFields && keepFields.length > 0) {
      const allowedFields = ['birth_date', 'death_date', 'birthplace', 'current_city', 'occupation_title', 'occupation_sector', 'notes', 'photo_url'];
      const fieldsToUpdate = keepFields.filter(f => allowedFields.includes(f));
      
      if (fieldsToUpdate.length > 0) {
        const setClause = fieldsToUpdate.map((f, i) => `${f} = COALESCE((SELECT ${f} FROM people WHERE id = $${i + 3}), ${f})`).join(', ');
        await client.query(
          `UPDATE people SET ${setClause} WHERE id = $1 AND family_id = $2`,
          [person1Id, familyId, person2Id]
        );
      }
    }
    
    // Delete person2
    await client.query('DELETE FROM people WHERE id = $1 AND family_id = $2', [person2Id, familyId]);
    
    // Update any duplicate candidates
    await client.query(`
      UPDATE duplicate_candidates 
      SET status = 'merged', reviewed_by = $1, reviewed_at = NOW()
      WHERE (person1_id = $2 OR person2_id = $2 OR person1_id = $3 OR person2_id = $3)
        AND family_id = $4
    `, [userId, person1Id, person2Id, familyId]);
    
    // Log the merge
    await client.query(`
      INSERT INTO audit_log (family_id, user_id, action, entity_type, entity_id, entity_name, changes)
      VALUES ($1, $2, 'MERGE', 'person', $3, $4, $5)
    `, [familyId, userId, person1Id, people.rows[0].first_name, { mergedFrom: person2Id }]);
    
    await client.query('COMMIT');
    
    res.json({ message: 'People merged successfully', keptPersonId: person1Id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error merging people:', err);
    res.status(500).json({ error: 'Failed to merge people' });
  } finally {
    client.release();
  }
};

// ==================== CHANGE REQUESTS ====================

// Get pending change requests for this family
exports.getChangeRequests = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const { direction = 'incoming', status = 'pending' } = req.query;
    
    let query;
    if (direction === 'incoming') {
      query = `
        SELECT 
          cr.*, 
          f.name as from_family_name,
          u.email as requester_email,
          u.first_name as requester_name
        FROM change_requests cr
        JOIN families f ON cr.from_family_id = f.id
        JOIN users u ON cr.requested_by = u.id
        WHERE cr.to_family_id = $1 AND cr.status = $2
        ORDER BY cr.created_at DESC
      `;
    } else {
      query = `
        SELECT 
          cr.*, 
          f.name as to_family_name
        FROM change_requests cr
        JOIN families f ON cr.to_family_id = f.id
        WHERE cr.from_family_id = $1 AND cr.status = $2
        ORDER BY cr.created_at DESC
      `;
    }
    
    const result = await pool.query(query, [familyId, status]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching change requests:', err);
    res.status(500).json({ error: 'Failed to fetch change requests' });
  }
};

// Create a change request
exports.createChangeRequest = async (req, res) => {
  try {
    const fromFamilyId = req.user.familyId;
    const userId = req.user.sub;
    const { toFamilyId, requestType, entityId, entityData, notes } = req.body;
    
    const result = await pool.query(`
      INSERT INTO change_requests (from_family_id, to_family_id, requested_by, request_type, entity_id, entity_data, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [fromFamilyId, toFamilyId, userId, requestType, entityId, entityData || {}, notes]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating change request:', err);
    res.status(500).json({ error: 'Failed to create change request' });
  }
};

// Respond to a change request
exports.respondToChangeRequest = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const userId = req.user.sub;
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }
    
    const status = action === 'approve' ? 'approved' : 'rejected';
    
    const result = await pool.query(`
      UPDATE change_requests
      SET status = $1, reviewed_by = $2, reviewed_at = NOW()
      WHERE id = $3 AND to_family_id = $4
      RETURNING *
    `, [status, userId, id, familyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }
    
    // If approved and it's a spouse link, create the edge
    if (action === 'approve' && result.rows[0].request_type === 'SPOUSE_LINK') {
      const data = result.rows[0].entity_data;
      if (data.person1Id && data.person2Id) {
        await pool.query(`
          INSERT INTO family_tree_edges (id, from_person_id, to_person_id, type, is_approved)
          VALUES (uuid_generate_v4(), $1, $2, 'SPOUSE_OF', true)
          ON CONFLICT DO NOTHING
        `, [data.person1Id, data.person2Id]);
      }
    }
    
    res.json({ message: `Change request ${status}`, request: result.rows[0] });
  } catch (err) {
    console.error('Error responding to change request:', err);
    res.status(500).json({ error: 'Failed to respond to change request' });
  }
};
