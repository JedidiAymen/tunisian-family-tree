-- ============================================================
-- Migration 001: Add Progress & Insights Features
-- Adds: gender, photo, occupation, events, location history
-- ============================================================

-- 1. Add new columns to people table
ALTER TABLE people ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female', 'other'));
ALTER TABLE people ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE people ADD COLUMN IF NOT EXISTS birthplace text;
ALTER TABLE people ADD COLUMN IF NOT EXISTS occupation_title text;
ALTER TABLE people ADD COLUMN IF NOT EXISTS occupation_sector text;
ALTER TABLE people ADD COLUMN IF NOT EXISTS occupation_company text;
ALTER TABLE people ADD COLUMN IF NOT EXISTS occupation_start_year integer;
ALTER TABLE people ADD COLUMN IF NOT EXISTS occupation_end_year integer;

-- 2. Create event types enum
DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'BIRTH', 'DEATH', 'MARRIAGE', 'DIVORCE', 
    'MOVE', 'IMMIGRATION', 'EMIGRATION',
    'EDUCATION', 'GRADUATION', 'JOB_START', 'JOB_END', 'RETIREMENT',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Create person_events table (for timeline, moves, life events)
CREATE TABLE IF NOT EXISTS person_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id uuid REFERENCES people(id) ON DELETE CASCADE NOT NULL,
  family_id uuid REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  type event_type NOT NULL,
  title text,
  description text,
  event_date date,
  event_year integer, -- for when exact date is unknown
  city text,
  country text DEFAULT 'Tunisia',
  related_person_id uuid REFERENCES people(id) ON DELETE SET NULL, -- for marriages, etc.
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_person_events_person ON person_events(person_id);
CREATE INDEX IF NOT EXISTS idx_person_events_family ON person_events(family_id);
CREATE INDEX IF NOT EXISTS idx_person_events_type ON person_events(type);
CREATE INDEX IF NOT EXISTS idx_person_events_year ON person_events(event_year);

-- 4. Create location_history table (where they lived)
CREATE TABLE IF NOT EXISTS location_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id uuid REFERENCES people(id) ON DELETE CASCADE NOT NULL,
  family_id uuid REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  city text NOT NULL,
  country text DEFAULT 'Tunisia',
  from_year integer,
  to_year integer, -- null = current
  is_current boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_location_history_person ON location_history(person_id);
CREATE INDEX IF NOT EXISTS idx_location_history_city ON location_history(city);

-- 5. Create occupation sectors lookup table
CREATE TABLE IF NOT EXISTS occupation_sectors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  name_ar text, -- Arabic name
  icon text, -- emoji or icon class
  color text, -- for charts
  created_at timestamptz DEFAULT now()
);

-- Insert default sectors
INSERT INTO occupation_sectors (id, name, name_ar, icon, color) VALUES
  (uuid_generate_v4(), 'Education', 'تعليم', '📚', '#3b82f6'),
  (uuid_generate_v4(), 'Healthcare', 'صحة', '🏥', '#ef4444'),
  (uuid_generate_v4(), 'Agriculture', 'فلاحة', '🌾', '#22c55e'),
  (uuid_generate_v4(), 'Trade & Commerce', 'تجارة', '🏪', '#f97316'),
  (uuid_generate_v4(), 'Government', 'حكومة', '🏛️', '#6366f1'),
  (uuid_generate_v4(), 'Military & Police', 'أمن', '🎖️', '#64748b'),
  (uuid_generate_v4(), 'Technology', 'تكنولوجيا', '💻', '#8b5cf6'),
  (uuid_generate_v4(), 'Construction', 'بناء', '🏗️', '#eab308'),
  (uuid_generate_v4(), 'Transportation', 'نقل', '🚗', '#14b8a6'),
  (uuid_generate_v4(), 'Arts & Culture', 'فنون', '🎨', '#ec4899'),
  (uuid_generate_v4(), 'Legal', 'قانون', '⚖️', '#0ea5e9'),
  (uuid_generate_v4(), 'Finance', 'مالية', '💰', '#10b981'),
  (uuid_generate_v4(), 'Hospitality', 'سياحة', '🏨', '#f472b6'),
  (uuid_generate_v4(), 'Manufacturing', 'صناعة', '🏭', '#78716c'),
  (uuid_generate_v4(), 'Religious', 'دين', '🕌', '#a855f7'),
  (uuid_generate_v4(), 'Homemaker', 'ربة بيت', '🏠', '#fbbf24'),
  (uuid_generate_v4(), 'Student', 'طالب', '🎓', '#06b6d4'),
  (uuid_generate_v4(), 'Retired', 'متقاعد', '🌴', '#84cc16'),
  (uuid_generate_v4(), 'Other', 'أخرى', '💼', '#94a3b8')
ON CONFLICT (name) DO NOTHING;

-- 6. Create stories/memories table
CREATE TABLE IF NOT EXISTS person_stories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id uuid REFERENCES people(id) ON DELETE CASCADE NOT NULL,
  family_id uuid REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL,
  story_type text DEFAULT 'memory' CHECK (story_type IN ('memory', 'biography', 'anecdote', 'tradition', 'recipe', 'other')),
  tags text[] DEFAULT ARRAY[]::text[],
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_person_stories_person ON person_stories(person_id);
CREATE INDEX IF NOT EXISTS idx_person_stories_family ON person_stories(family_id);

-- 7. Create media/documents table
CREATE TABLE IF NOT EXISTS person_media (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id uuid REFERENCES people(id) ON DELETE CASCADE,
  family_id uuid REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES person_events(id) ON DELETE SET NULL,
  story_id uuid REFERENCES person_stories(id) ON DELETE SET NULL,
  uploader_id uuid REFERENCES users(id) ON DELETE SET NULL,
  url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'document', 'video', 'audio')),
  title text,
  description text,
  year integer,
  tags text[] DEFAULT ARRAY[]::text[],
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_person_media_person ON person_media(person_id);
CREATE INDEX IF NOT EXISTS idx_person_media_family ON person_media(family_id);

-- 8. Create audit log table (for activity feed)
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LINK', 'UNLINK'
  entity_type text NOT NULL, -- 'person', 'edge', 'event', 'story', 'media'
  entity_id uuid NOT NULL,
  entity_name text, -- human readable name for display
  changes jsonb DEFAULT '{}', -- what changed
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_family ON audit_log(family_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- 9. Create saved views table (for graph)
CREATE TABLE IF NOT EXISTS saved_views (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  filters jsonb NOT NULL DEFAULT '{}', -- {familyFilter, cityFilter, yearRange, focusPerson, etc.}
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_user ON saved_views(user_id);

-- 10. Create name variants table (for intelligent search)
CREATE TABLE IF NOT EXISTS name_variants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_name text NOT NULL,
  variant text NOT NULL,
  variant_type text DEFAULT 'spelling' CHECK (variant_type IN ('spelling', 'transliteration', 'nickname', 'formal')),
  language text DEFAULT 'ar', -- 'ar', 'fr', 'en'
  created_at timestamptz DEFAULT now(),
  UNIQUE(canonical_name, variant)
);

-- Insert common Tunisian name variants
INSERT INTO name_variants (id, canonical_name, variant, variant_type, language) VALUES
  (uuid_generate_v4(), 'Ben Ali', 'Benali', 'spelling', 'fr'),
  (uuid_generate_v4(), 'Ben Ali', 'Bin Ali', 'transliteration', 'ar'),
  (uuid_generate_v4(), 'Ben Ali', 'بن علي', 'transliteration', 'ar'),
  (uuid_generate_v4(), 'Mohamed', 'Mohammed', 'spelling', 'en'),
  (uuid_generate_v4(), 'Mohamed', 'Muhammad', 'spelling', 'en'),
  (uuid_generate_v4(), 'Mohamed', 'محمد', 'transliteration', 'ar'),
  (uuid_generate_v4(), 'Ahmed', 'Ahmad', 'spelling', 'en'),
  (uuid_generate_v4(), 'Ahmed', 'أحمد', 'transliteration', 'ar'),
  (uuid_generate_v4(), 'Fatma', 'Fatima', 'spelling', 'en'),
  (uuid_generate_v4(), 'Fatma', 'فاطمة', 'transliteration', 'ar'),
  (uuid_generate_v4(), 'Khadija', 'Khadijah', 'spelling', 'en'),
  (uuid_generate_v4(), 'Khadija', 'خديجة', 'transliteration', 'ar')
ON CONFLICT (canonical_name, variant) DO NOTHING;

-- 11. Add marriage metadata to edges
ALTER TABLE family_tree_edges ADD COLUMN IF NOT EXISTS marriage_date date;
ALTER TABLE family_tree_edges ADD COLUMN IF NOT EXISTS marriage_city text;
ALTER TABLE family_tree_edges ADD COLUMN IF NOT EXISTS divorce_date date;
ALTER TABLE family_tree_edges ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE family_tree_edges ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true;
ALTER TABLE family_tree_edges ADD COLUMN IF NOT EXISTS approval_pending_from uuid REFERENCES families(id);

-- 12. Function to calculate generation depth for a person
CREATE OR REPLACE FUNCTION get_generation_depth(person_uuid uuid) 
RETURNS integer AS $$
DECLARE
  depth integer := 0;
  current_id uuid := person_uuid;
  parent_id uuid;
BEGIN
  LOOP
    SELECT from_person_id INTO parent_id
    FROM family_tree_edges
    WHERE to_person_id = current_id AND type = 'PARENT_OF'
    LIMIT 1;
    
    IF parent_id IS NULL THEN
      RETURN depth;
    END IF;
    
    depth := depth + 1;
    current_id := parent_id;
    
    IF depth > 20 THEN -- prevent infinite loops
      RETURN depth;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 13. View for family statistics
CREATE OR REPLACE VIEW family_stats AS
SELECT 
  f.id as family_id,
  f.name as family_name,
  COUNT(DISTINCT p.id) as total_people,
  COUNT(DISTINCT CASE WHEN p.gender IS NOT NULL THEN p.id END) as with_gender,
  COUNT(DISTINCT CASE WHEN p.photo_url IS NOT NULL THEN p.id END) as with_photo,
  COUNT(DISTINCT CASE WHEN p.birth_date IS NOT NULL THEN p.id END) as with_birth_date,
  COUNT(DISTINCT CASE WHEN p.death_date IS NOT NULL THEN p.id END) as with_death_date,
  COUNT(DISTINCT CASE WHEN p.birthplace IS NOT NULL THEN p.id END) as with_birthplace,
  COUNT(DISTINCT CASE WHEN p.current_city IS NOT NULL THEN p.id END) as with_current_city,
  COUNT(DISTINCT CASE WHEN p.occupation_title IS NOT NULL THEN p.id END) as with_occupation,
  COUNT(DISTINCT CASE WHEN p.notes IS NOT NULL AND p.notes != '' THEN p.id END) as with_notes,
  COUNT(DISTINCT e.id) as total_edges,
  COUNT(DISTINCT CASE WHEN e.type = 'PARENT_OF' THEN e.id END) as parent_edges,
  COUNT(DISTINCT CASE WHEN e.type = 'SPOUSE_OF' THEN e.id END) as spouse_edges
FROM families f
LEFT JOIN people p ON p.family_id = f.id
LEFT JOIN family_tree_edges e ON e.family_id = f.id
GROUP BY f.id, f.name;

COMMENT ON VIEW family_stats IS 'Aggregated statistics for family progress dashboard';
