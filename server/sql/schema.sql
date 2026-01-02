-- PostgreSQL schema for Tunisian Family Names & Family Tree
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE families (
  id uuid PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TYPE user_role AS ENUM ('ADMIN','EDITOR','VIEWER');

CREATE TABLE users (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  first_name text,
  last_name text,
  current_city text,
  role user_role NOT NULL DEFAULT 'VIEWER',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE surnames (
  id uuid PRIMARY KEY,
  canonical_name text NOT NULL,
  aliases text[] DEFAULT ARRAY[]::text[],
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE regions (
  id uuid PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE expertise_fields (
  id uuid PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE people (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name_raw text,
  surname_id uuid REFERENCES surnames(id),
  region_id uuid REFERENCES regions(id),
  expertise_id uuid REFERENCES expertise_fields(id),
  current_city text,
  birth_date date,
  death_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TYPE edge_type AS ENUM ('PARENT_OF','SPOUSE_OF');

CREATE TABLE family_tree_edges (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  from_person_id uuid REFERENCES people(id) ON DELETE CASCADE,
  to_person_id uuid REFERENCES people(id) ON DELETE CASCADE,
  type edge_type NOT NULL,
  -- For SPOUSE_OF, this can link people from different families
  -- For PARENT_OF, both people should be in the same family (father's family)
  created_at timestamptz DEFAULT now(),
  CONSTRAINT one_edge_per_relation UNIQUE (from_person_id, to_person_id, type)
);
