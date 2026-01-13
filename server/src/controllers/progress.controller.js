const pool = require('../db/pool');

// Get family progress/completion stats
exports.getFamilyProgress = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    
    // Get basic counts
    const statsQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_people,
        COUNT(CASE WHEN gender IS NOT NULL THEN 1 END) as with_gender,
        COUNT(CASE WHEN photo_url IS NOT NULL THEN 1 END) as with_photo,
        COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as with_first_name,
        COUNT(CASE WHEN last_name_raw IS NOT NULL OR surname_id IS NOT NULL THEN 1 END) as with_last_name,
        COUNT(CASE WHEN notes IS NOT NULL AND notes != '' THEN 1 END) as with_notes,
        COUNT(CASE WHEN birth_date IS NOT NULL THEN 1 END) as with_birth_date,
        COUNT(CASE WHEN death_date IS NOT NULL THEN 1 END) as with_death_date,
        COUNT(CASE WHEN birthplace IS NOT NULL THEN 1 END) as with_birthplace,
        COUNT(CASE WHEN current_city IS NOT NULL THEN 1 END) as with_current_city,
        COUNT(CASE WHEN occupation_title IS NOT NULL THEN 1 END) as with_occupation,
        COUNT(CASE WHEN occupation_sector IS NOT NULL THEN 1 END) as with_occupation_sector
      FROM people WHERE family_id = $1
    `, [familyId]);

    const stats = statsQuery.rows[0];
    const total = parseInt(stats.total_people) || 1;

    // Get edge stats
    const edgeQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_edges,
        COUNT(CASE WHEN type = 'PARENT_OF' THEN 1 END) as parent_edges,
        COUNT(CASE WHEN type = 'SPOUSE_OF' THEN 1 END) as spouse_edges
      FROM family_tree_edges WHERE family_id = $1
    `, [familyId]);

    const edges = edgeQuery.rows[0];

    // Get people with parents linked
    const parentsQuery = await pool.query(`
      SELECT COUNT(DISTINCT to_person_id) as with_parents
      FROM family_tree_edges 
      WHERE family_id = $1 AND type = 'PARENT_OF'
    `, [familyId]);

    // Get people with spouse linked (simpler query)
    const spouseQuery = await pool.query(`
      SELECT COUNT(DISTINCT p.id) as with_spouse
      FROM people p
      WHERE p.family_id = $1 AND EXISTS (
        SELECT 1 FROM family_tree_edges e 
        WHERE (e.from_person_id = p.id OR e.to_person_id = p.id) 
        AND e.type = 'SPOUSE_OF'
      )
    `, [familyId]);

    // Get location history count
    const locationQuery = await pool.query(`
      SELECT COUNT(DISTINCT person_id) as with_location_history
      FROM location_history WHERE family_id = $1
    `, [familyId]);

    // Get events count
    const eventsQuery = await pool.query(`
      SELECT 
        COUNT(DISTINCT person_id) as people_with_events,
        COUNT(*) as total_events,
        COUNT(CASE WHEN type = 'MARRIAGE' THEN 1 END) as marriage_events,
        COUNT(CASE WHEN type = 'MOVE' THEN 1 END) as move_events
      FROM person_events WHERE family_id = $1
    `, [familyId]);

    // Calculate max generation depth
    const genQuery = await pool.query(`
      SELECT MAX(get_generation_depth(id)) as max_depth
      FROM people WHERE family_id = $1
    `, [familyId]);

    // Calculate progress percentages
    const progress = {
      identity: {
        fullName: Math.round((parseInt(stats.with_first_name) + parseInt(stats.with_last_name)) / (total * 2) * 100),
        gender: Math.round(parseInt(stats.with_gender) / total * 100),
        photo: Math.round(parseInt(stats.with_photo) / total * 100),
        notes: Math.round(parseInt(stats.with_notes) / total * 100),
        overall: 0
      },
      timeline: {
        birthDate: Math.round(parseInt(stats.with_birth_date) / total * 100),
        deathDate: Math.round(parseInt(stats.with_death_date) / total * 100), // Not all should have this
        marriage: Math.round(parseInt(eventsQuery.rows[0].marriage_events) / total * 100),
        overall: 0
      },
      location: {
        birthplace: Math.round(parseInt(stats.with_birthplace) / total * 100),
        currentCity: Math.round(parseInt(stats.with_current_city) / total * 100),
        locationHistory: Math.round(parseInt(locationQuery.rows[0].with_location_history) / total * 100),
        overall: 0
      },
      occupation: {
        title: Math.round(parseInt(stats.with_occupation) / total * 100),
        sector: Math.round(parseInt(stats.with_occupation_sector) / total * 100),
        overall: 0
      },
      tree: {
        parentsLinked: Math.round(parseInt(parentsQuery.rows[0].with_parents) / total * 100),
        spouseLinked: Math.round(parseInt(spouseQuery.rows[0].with_spouse) / total * 100),
        maxGenerationDepth: parseInt(genQuery.rows[0].max_depth) || 0,
        overall: 0
      }
    };

    // Calculate overall for each category
    progress.identity.overall = Math.round(
      (progress.identity.fullName + progress.identity.gender + progress.identity.photo + progress.identity.notes) / 4
    );
    progress.timeline.overall = Math.round(
      (progress.timeline.birthDate + progress.timeline.marriage) / 2
    );
    progress.location.overall = Math.round(
      (progress.location.birthplace + progress.location.currentCity + progress.location.locationHistory) / 3
    );
    progress.occupation.overall = Math.round(
      (progress.occupation.title + progress.occupation.sector) / 2
    );
    progress.tree.overall = Math.round(
      (progress.tree.parentsLinked + progress.tree.spouseLinked) / 2
    );

    // Calculate family score (weighted average)
    const familyScore = Math.round(
      progress.identity.overall * 0.25 +
      progress.timeline.overall * 0.2 +
      progress.location.overall * 0.15 +
      progress.occupation.overall * 0.15 +
      progress.tree.overall * 0.25
    );

    res.json({
      familyScore,
      totalPeople: total,
      totalEdges: parseInt(edges.total_edges),
      maxGenerationDepth: progress.tree.maxGenerationDepth,
      progress
    });
  } catch (err) {
    console.error('getFamilyProgress error:', err);
    res.status(500).json({ error: 'Failed to get family progress' });
  }
};

// Get "Fix Next" tasks - people missing data
exports.getFixNextTasks = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const limit = parseInt(req.query.limit) || 10;

    const tasks = [];

    // People missing birth date
    const missingBirth = await pool.query(`
      SELECT id, first_name, last_name_raw, 'missing_birth_date' as task_type
      FROM people 
      WHERE family_id = $1 AND birth_date IS NULL
      ORDER BY created_at DESC
      LIMIT $2
    `, [familyId, limit]);
    
    missingBirth.rows.forEach(p => tasks.push({
      type: 'missing_birth_date',
      priority: 'high',
      personId: p.id,
      personName: `${p.first_name} ${p.last_name_raw || ''}`.trim(),
      message: `Add birth date for ${p.first_name}`,
      category: 'timeline'
    }));

    // People missing parents
    const missingParents = await pool.query(`
      SELECT p.id, p.first_name, p.last_name_raw
      FROM people p
      WHERE p.family_id = $1 
        AND NOT EXISTS (
          SELECT 1 FROM family_tree_edges e 
          WHERE e.to_person_id = p.id AND e.type = 'PARENT_OF'
        )
      ORDER BY p.created_at DESC
      LIMIT $2
    `, [familyId, limit]);

    missingParents.rows.forEach(p => tasks.push({
      type: 'missing_parents',
      priority: 'high',
      personId: p.id,
      personName: `${p.first_name} ${p.last_name_raw || ''}`.trim(),
      message: `Link parents for ${p.first_name}`,
      category: 'tree'
    }));

    // People missing gender
    const missingGender = await pool.query(`
      SELECT id, first_name, last_name_raw
      FROM people 
      WHERE family_id = $1 AND gender IS NULL
      ORDER BY created_at DESC
      LIMIT $2
    `, [familyId, limit]);

    missingGender.rows.forEach(p => tasks.push({
      type: 'missing_gender',
      priority: 'medium',
      personId: p.id,
      personName: `${p.first_name} ${p.last_name_raw || ''}`.trim(),
      message: `Set gender for ${p.first_name}`,
      category: 'identity'
    }));

    // People missing current city
    const missingCity = await pool.query(`
      SELECT id, first_name, last_name_raw
      FROM people 
      WHERE family_id = $1 AND current_city IS NULL
      ORDER BY created_at DESC
      LIMIT $2
    `, [familyId, limit]);

    missingCity.rows.forEach(p => tasks.push({
      type: 'missing_city',
      priority: 'low',
      personId: p.id,
      personName: `${p.first_name} ${p.last_name_raw || ''}`.trim(),
      message: `Add current city for ${p.first_name}`,
      category: 'location'
    }));

    // People missing occupation
    const missingOccupation = await pool.query(`
      SELECT id, first_name, last_name_raw
      FROM people 
      WHERE family_id = $1 AND occupation_title IS NULL
      ORDER BY created_at DESC
      LIMIT $2
    `, [familyId, limit]);

    missingOccupation.rows.forEach(p => tasks.push({
      type: 'missing_occupation',
      priority: 'low',
      personId: p.id,
      personName: `${p.first_name} ${p.last_name_raw || ''}`.trim(),
      message: `Add occupation for ${p.first_name}`,
      category: 'occupation'
    }));

    // Sort by priority and limit
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    res.json(tasks.slice(0, limit * 2));
  } catch (err) {
    console.error('getFixNextTasks error:', err);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
};

// Get occupation sector distribution
exports.getOccupationStats = async (req, res) => {
  try {
    const familyId = req.user.familyId;

    // Get occupation by sector
    const sectorQuery = await pool.query(`
      SELECT 
        COALESCE(p.occupation_sector, 'Unknown') as sector,
        COUNT(*) as count,
        os.icon,
        os.color
      FROM people p
      LEFT JOIN occupation_sectors os ON os.name = p.occupation_sector
      WHERE p.family_id = $1 AND p.occupation_title IS NOT NULL
      GROUP BY p.occupation_sector, os.icon, os.color
      ORDER BY count DESC
    `, [familyId]);

    // Get top occupations
    const topOccupations = await pool.query(`
      SELECT occupation_title, COUNT(*) as count
      FROM people 
      WHERE family_id = $1 AND occupation_title IS NOT NULL
      GROUP BY occupation_title
      ORDER BY count DESC
      LIMIT 10
    `, [familyId]);

    // Get occupation by generation (approximate by birth year decades)
    const byGeneration = await pool.query(`
      SELECT 
        CASE 
          WHEN EXTRACT(YEAR FROM birth_date) >= 2000 THEN '2000s'
          WHEN EXTRACT(YEAR FROM birth_date) >= 1980 THEN '1980s'
          WHEN EXTRACT(YEAR FROM birth_date) >= 1960 THEN '1960s'
          WHEN EXTRACT(YEAR FROM birth_date) >= 1940 THEN '1940s'
          ELSE 'Pre-1940'
        END as generation,
        occupation_sector as sector,
        COUNT(*) as count
      FROM people 
      WHERE family_id = $1 AND occupation_title IS NOT NULL AND birth_date IS NOT NULL
      GROUP BY generation, occupation_sector
      ORDER BY generation, count DESC
    `, [familyId]);

    res.json({
      bySector: sectorQuery.rows,
      topOccupations: topOccupations.rows,
      byGeneration: byGeneration.rows
    });
  } catch (err) {
    console.error('getOccupationStats error:', err);
    res.status(500).json({ error: 'Failed to get occupation stats' });
  }
};

// Get city/location distribution
exports.getLocationStats = async (req, res) => {
  try {
    const familyId = req.user.familyId;

    // Current city distribution
    const currentCities = await pool.query(`
      SELECT current_city as city, COUNT(*) as count
      FROM people 
      WHERE family_id = $1 AND current_city IS NOT NULL
      GROUP BY current_city
      ORDER BY count DESC
    `, [familyId]);

    // Birthplace distribution
    const birthplaces = await pool.query(`
      SELECT birthplace as city, COUNT(*) as count
      FROM people 
      WHERE family_id = $1 AND birthplace IS NOT NULL
      GROUP BY birthplace
      ORDER BY count DESC
    `, [familyId]);

    // Location history (migration patterns)
    const migrations = await pool.query(`
      SELECT city, COUNT(*) as count, 
        MIN(from_year) as earliest_year,
        MAX(to_year) as latest_year
      FROM location_history 
      WHERE family_id = $1
      GROUP BY city
      ORDER BY count DESC
    `, [familyId]);

    // Most common migration routes
    const routes = await pool.query(`
      SELECT 
        p.birthplace as from_city,
        p.current_city as to_city,
        COUNT(*) as count
      FROM people p
      WHERE p.family_id = $1 
        AND p.birthplace IS NOT NULL 
        AND p.current_city IS NOT NULL
        AND p.birthplace != p.current_city
      GROUP BY p.birthplace, p.current_city
      ORDER BY count DESC
      LIMIT 10
    `, [familyId]);

    res.json({
      currentCities: currentCities.rows,
      birthplaces: birthplaces.rows,
      migrations: migrations.rows,
      migrationRoutes: routes.rows
    });
  } catch (err) {
    console.error('getLocationStats error:', err);
    res.status(500).json({ error: 'Failed to get location stats' });
  }
};

// Get all occupation sectors
exports.getOccupationSectors = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, name_ar, icon, color
      FROM occupation_sectors
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('getOccupationSectors error:', err);
    res.status(500).json({ error: 'Failed to get sectors' });
  }
};
