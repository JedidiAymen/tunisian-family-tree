const pool = require('../db/pool');

// Get all events for the family (timeline)
exports.getFamilyTimeline = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const { type, personId, startYear, endYear, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        e.id, e.type, e.title, e.description,
        e.event_date, e.event_year, e.city, e.country,
        e.created_at,
        p.id as person_id,
        p.first_name || ' ' || COALESCE(p.last_name_raw, '') as person_name,
        p.gender,
        rp.id as related_person_id,
        rp.first_name || ' ' || COALESCE(rp.last_name_raw, '') as related_person_name
      FROM person_events e
      JOIN people p ON e.person_id = p.id
      LEFT JOIN people rp ON e.related_person_id = rp.id
      WHERE e.family_id = $1
    `;
    
    const params = [familyId];
    let paramIndex = 2;
    
    if (type) {
      query += ` AND e.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    if (personId) {
      query += ` AND (e.person_id = $${paramIndex} OR e.related_person_id = $${paramIndex})`;
      params.push(personId);
      paramIndex++;
    }
    
    if (startYear) {
      query += ` AND e.event_year >= $${paramIndex}`;
      params.push(parseInt(startYear));
      paramIndex++;
    }
    
    if (endYear) {
      query += ` AND e.event_year <= $${paramIndex}`;
      params.push(parseInt(endYear));
      paramIndex++;
    }
    
    query += ` ORDER BY e.event_year ASC, e.event_date ASC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching family timeline:', err);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
};

// Get timeline grouped by decade
exports.getTimelineByDecade = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    
    const result = await pool.query(`
      SELECT 
        (e.event_year / 10) * 10 as decade,
        e.type,
        COUNT(*) as count
      FROM person_events e
      WHERE e.family_id = $1 AND e.event_year IS NOT NULL
      GROUP BY decade, e.type
      ORDER BY decade, e.type
    `, [familyId]);
    
    // Group by decade
    const byDecade = {};
    result.rows.forEach(row => {
      const decade = row.decade + 's';
      if (!byDecade[decade]) {
        byDecade[decade] = { decade, events: {} };
      }
      byDecade[decade].events[row.type] = parseInt(row.count);
    });
    
    res.json(Object.values(byDecade));
  } catch (err) {
    console.error('Error fetching timeline by decade:', err);
    res.status(500).json({ error: 'Failed to fetch timeline by decade' });
  }
};

// Get migration routes (from birthplace to current city)
exports.getMigrationRoutes = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    
    const result = await pool.query(`
      SELECT 
        p.birthplace as from_city,
        p.current_city as to_city,
        COUNT(*) as count,
        array_agg(p.first_name || ' ' || COALESCE(p.last_name_raw, '')) as people
      FROM people p
      WHERE p.family_id = $1 
        AND p.birthplace IS NOT NULL 
        AND p.current_city IS NOT NULL
        AND p.birthplace != p.current_city
      GROUP BY p.birthplace, p.current_city
      ORDER BY count DESC
      LIMIT 20
    `, [familyId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching migration routes:', err);
    res.status(500).json({ error: 'Failed to fetch migration routes' });
  }
};

// Get city heat map (people per city per decade)
exports.getCityHeatMap = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    
    // Current cities
    const currentResult = await pool.query(`
      SELECT current_city as city, COUNT(*) as count
      FROM people
      WHERE family_id = $1 AND current_city IS NOT NULL
      GROUP BY current_city
      ORDER BY count DESC
    `, [familyId]);
    
    // Birthplaces
    const birthResult = await pool.query(`
      SELECT birthplace as city, COUNT(*) as count
      FROM people
      WHERE family_id = $1 AND birthplace IS NOT NULL
      GROUP BY birthplace
      ORDER BY count DESC
    `, [familyId]);
    
    // MOVE events by decade
    const movesResult = await pool.query(`
      SELECT 
        (event_year / 10) * 10 as decade,
        city,
        COUNT(*) as count
      FROM person_events
      WHERE family_id = $1 AND type = 'MOVE' AND city IS NOT NULL
      GROUP BY decade, city
      ORDER BY decade, count DESC
    `, [familyId]);
    
    res.json({
      currentCities: currentResult.rows,
      birthplaces: birthResult.rows,
      movesByDecade: movesResult.rows
    });
  } catch (err) {
    console.error('Error fetching city heat map:', err);
    res.status(500).json({ error: 'Failed to fetch city heat map' });
  }
};

// Get family hub city (most connections)
exports.getFamilyHub = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    
    // City with most marriages
    const marriageCityResult = await pool.query(`
      SELECT city, COUNT(*) as marriage_count
      FROM person_events
      WHERE family_id = $1 AND type = 'MARRIAGE' AND city IS NOT NULL
      GROUP BY city
      ORDER BY marriage_count DESC
      LIMIT 1
    `, [familyId]);
    
    // City with most people born
    const birthCityResult = await pool.query(`
      SELECT birthplace as city, COUNT(*) as birth_count
      FROM people
      WHERE family_id = $1 AND birthplace IS NOT NULL
      GROUP BY birthplace
      ORDER BY birth_count DESC
      LIMIT 1
    `, [familyId]);
    
    // City with most current residents
    const residentCityResult = await pool.query(`
      SELECT current_city as city, COUNT(*) as resident_count
      FROM people
      WHERE family_id = $1 AND current_city IS NOT NULL
      GROUP BY current_city
      ORDER BY resident_count DESC
      LIMIT 1
    `, [familyId]);
    
    res.json({
      marriageHub: marriageCityResult.rows[0] || null,
      birthHub: birthCityResult.rows[0] || null,
      currentHub: residentCityResult.rows[0] || null
    });
  } catch (err) {
    console.error('Error fetching family hub:', err);
    res.status(500).json({ error: 'Failed to fetch family hub' });
  }
};

// Get generation stats (births by decade)
exports.getGenerationStats = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    
    const result = await pool.query(`
      SELECT 
        (EXTRACT(YEAR FROM p.birth_date) / 10)::int * 10 as decade,
        COUNT(*) as count,
        COUNT(CASE WHEN p.gender = 'M' THEN 1 END) as male_count,
        COUNT(CASE WHEN p.gender = 'F' THEN 1 END) as female_count,
        array_agg(DISTINCT p.occupation_sector) FILTER (WHERE p.occupation_sector IS NOT NULL) as sectors
      FROM people p
      WHERE p.family_id = $1 AND p.birth_date IS NOT NULL
      GROUP BY decade
      ORDER BY decade
    `, [familyId]);
    
    res.json(result.rows.map(row => ({
      decade: row.decade + 's',
      count: parseInt(row.count),
      maleCount: parseInt(row.male_count),
      femaleCount: parseInt(row.female_count),
      sectors: row.sectors || []
    })));
  } catch (err) {
    console.error('Error fetching generation stats:', err);
    res.status(500).json({ error: 'Failed to fetch generation stats' });
  }
};

// Create a new event
exports.createEvent = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const { personId, type, title, description, eventDate, eventYear, city, country, relatedPersonId, metadata } = req.body;
    
    // Validate person belongs to family
    const personCheck = await pool.query(
      'SELECT id FROM people WHERE id = $1 AND family_id = $2',
      [personId, familyId]
    );
    
    if (personCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found in your family' });
    }
    
    const result = await pool.query(`
      INSERT INTO person_events (person_id, family_id, type, title, description, event_date, event_year, city, country, related_person_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [personId, familyId, type, title, description, eventDate, eventYear, city, country || 'Tunisia', relatedPersonId, metadata || {}]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

// Update an event
exports.updateEvent = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const { id } = req.params;
    const { title, description, eventDate, eventYear, city, country, relatedPersonId, metadata } = req.body;
    
    const result = await pool.query(`
      UPDATE person_events 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          event_date = COALESCE($3, event_date),
          event_year = COALESCE($4, event_year),
          city = COALESCE($5, city),
          country = COALESCE($6, country),
          related_person_id = COALESCE($7, related_person_id),
          metadata = COALESCE($8, metadata),
          updated_at = NOW()
      WHERE id = $9 AND family_id = $10
      RETURNING *
    `, [title, description, eventDate, eventYear, city, country, relatedPersonId, metadata, id, familyId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

// Delete an event
exports.deleteEvent = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM person_events WHERE id = $1 AND family_id = $2 RETURNING id',
      [id, familyId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

// Get person's timeline
exports.getPersonTimeline = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const { personId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        e.id, e.type, e.title, e.description,
        e.event_date, e.event_year, e.city, e.country,
        rp.id as related_person_id,
        rp.first_name || ' ' || COALESCE(rp.last_name_raw, '') as related_person_name
      FROM person_events e
      LEFT JOIN people rp ON e.related_person_id = rp.id
      WHERE (e.person_id = $1 OR e.related_person_id = $1)
        AND e.family_id = $2
      ORDER BY e.event_year ASC, e.event_date ASC
    `, [personId, familyId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching person timeline:', err);
    res.status(500).json({ error: 'Failed to fetch person timeline' });
  }
};
