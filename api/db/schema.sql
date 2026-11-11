-- NETLAB ACADEMY — schema idempotente, reaplicado em cada arranque.
-- Remove as tabelas da versão anterior (NetSim) que já não fazem parte da app.
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS links;
DROP TABLE IF EXISTS devices;

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id integer PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  level integer NOT NULL DEFAULT 1,
  xp integer NOT NULL DEFAULT 0,
  minutes_learning integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  token text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS projects (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  share_slug text UNIQUE,
  share_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_devices (
  id serial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  x real NOT NULL,
  y real NOT NULL,
  powered boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (project_id, name)
);

CREATE TABLE IF NOT EXISTS project_links (
  id serial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  a_id integer NOT NULL REFERENCES project_devices (id) ON DELETE CASCADE,
  b_id integer NOT NULL REFERENCES project_devices (id) ON DELETE CASCADE,
  a_port text,
  b_port text,
  cable text NOT NULL DEFAULT 'straight',
  CONSTRAINT project_links_distinct CHECK (a_id <> b_id),
  CONSTRAINT project_links_unique UNIQUE (project_id, a_id, b_id)
);

CREATE TABLE IF NOT EXISTS project_annotations (
  id serial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  text text NOT NULL,
  x real NOT NULL,
  y real NOT NULL
);

CREATE TABLE IF NOT EXISTS network_events (
  id serial PRIMARY KEY,
  project_id integer REFERENCES projects (id) ON DELETE CASCADE,
  user_id integer REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  level integer NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'book'
);

CREATE TABLE IF NOT EXISTS lessons (
  id serial PRIMARY KEY,
  course_id integer NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  minutes integer NOT NULL DEFAULT 10,
  position integer NOT NULL DEFAULT 1,
  summary text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  quiz jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (course_id, slug)
);

-- "Aprender na prática": laboratório rápido associado a cada lição.
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS practice jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS labs (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  level integer NOT NULL DEFAULT 1,
  objective text NOT NULL,
  brief text NOT NULL DEFAULT '',
  instructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  starter jsonb NOT NULL DEFAULT '[]'::jsonb,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  points integer NOT NULL DEFAULT 20,
  active boolean NOT NULL DEFAULT true,
  created_by integer REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_submissions (
  id serial PRIMARY KEY,
  lab_id integer NOT NULL REFERENCES labs (id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  project_id integer REFERENCES projects (id) ON DELETE SET NULL,
  score real NOT NULL DEFAULT 0,
  max_score real NOT NULL DEFAULT 20,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessments (
  id serial PRIMARY KEY,
  course_id integer REFERENCES courses (id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id serial PRIMARY KEY,
  assessment_id integer NOT NULL REFERENCES assessments (id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  score real NOT NULL DEFAULT 0,
  max_score real NOT NULL DEFAULT 20,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS progress_records (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('lesson', 'lab', 'assessment')),
  ref_id integer NOT NULL,
  score real,
  status text NOT NULL DEFAULT 'completed',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref_id)
);
