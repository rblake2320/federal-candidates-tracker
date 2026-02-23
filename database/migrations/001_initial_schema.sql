-- Federal Candidates Tracker — Initial Schema
-- PostgreSQL 16+
-- Created: 2025-02-21
-- Updated: 2026-02-21 — Security & correctness fixes

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE office_type AS ENUM ('senate', 'house', 'governor');
CREATE TYPE election_type AS ENUM ('regular', 'special');
CREATE TYPE candidate_status AS ENUM ('declared', 'exploratory', 'filed', 'qualified', 'withdrawn', 'won', 'lost', 'runoff');
CREATE TYPE party_affiliation AS ENUM (
  'democratic', 'republican', 'libertarian', 'green',
  'constitution', 'independent', 'no_party', 'other'
);

-- ============================================================
-- STATES (reference table)
-- ============================================================

CREATE TABLE states (
  code         CHAR(2) PRIMARY KEY,
  name         VARCHAR(50) NOT NULL,
  fips_code    CHAR(2) NOT NULL UNIQUE,
  house_seats  INT NOT NULL DEFAULT 1,
  region       VARCHAR(20),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_states_region ON states(region);

-- ============================================================
-- ELECTIONS
-- ============================================================

CREATE TABLE elections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state            CHAR(2) NOT NULL REFERENCES states(code),
  office           office_type NOT NULL,
  district         INT,  -- NULL for Senate
  senate_class     INT CHECK (senate_class IN (1, 2, 3)),  -- NULL for House
  election_type    election_type NOT NULL DEFAULT 'regular',
  election_date    DATE NOT NULL,
  primary_date     DATE,
  filing_deadline  DATE,
  runoff_date      DATE,
  description      TEXT,
  total_candidates INT DEFAULT 0,
  is_competitive   BOOLEAN DEFAULT FALSE,
  cook_rating      VARCHAR(30),  -- e.g., 'Lean D', 'Toss Up', 'Safe R'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_house_district CHECK (
    (office = 'house' AND district IS NOT NULL AND district >= 0)
    OR (office = 'senate' AND district IS NULL)
    OR (office = 'governor' AND district IS NULL)
  ),
  CONSTRAINT chk_senate_class CHECK (
    (office = 'senate' AND senate_class IS NOT NULL)
    OR (office = 'house' AND senate_class IS NULL)
    OR (office = 'governor' AND senate_class IS NULL)
  )
);

CREATE INDEX idx_elections_state ON elections(state);
CREATE INDEX idx_elections_office ON elections(office);
CREATE INDEX idx_elections_date ON elections(election_date);
CREATE INDEX idx_elections_type ON elections(election_type);
CREATE INDEX idx_elections_state_office ON elections(state, office);
CREATE UNIQUE INDEX idx_elections_unique_race ON elections(state, office, district, senate_class, election_date);
-- Governor has NULL district + senate_class; NULLs are not equal in unique indexes,
-- so we need a separate partial index to prevent duplicate governor elections.
CREATE UNIQUE INDEX idx_elections_unique_governor ON elections(state, election_date)
  WHERE office = 'governor';

-- ============================================================
-- CANDIDATES
-- ============================================================

CREATE TABLE candidates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id         UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  full_name           VARCHAR(200) NOT NULL,
  first_name          VARCHAR(100),
  last_name           VARCHAR(100),
  party               party_affiliation NOT NULL,
  state               CHAR(2) NOT NULL REFERENCES states(code),
  office              office_type NOT NULL,
  district            INT,
  senate_class        INT CHECK (senate_class IN (1, 2, 3)),
  incumbent           BOOLEAN NOT NULL DEFAULT FALSE,
  status              candidate_status NOT NULL DEFAULT 'declared',
  election_type       election_type NOT NULL DEFAULT 'regular',
  election_date       DATE NOT NULL,

  -- External identifiers
  fec_candidate_id    VARCHAR(20),
  ballotpedia_id      VARCHAR(200),
  opensecrets_id      VARCHAR(20),

  -- Profile
  website             VARCHAR(500),
  ballotpedia_url     VARCHAR(500),
  photo_url           VARCHAR(500),
  bio                 TEXT,

  -- Campaign finance (from FEC)
  total_raised        DECIMAL(15,2),
  total_spent         DECIMAL(15,2),
  cash_on_hand        DECIMAL(15,2),
  finance_updated_at  TIMESTAMPTZ,

  -- Polling
  latest_poll_pct     DECIMAL(5,2),
  poll_source         VARCHAR(200),
  poll_date           DATE,

  -- FIX: data_confidence DECIMAL(3,2) caps at 9.99 — use NUMERIC(4,3) for 0.000–1.000
  data_confidence     NUMERIC(4,3) DEFAULT 0.500 CHECK (data_confidence >= 0 AND data_confidence <= 1),
  data_sources        TEXT[],  -- Array of source names
  last_verified       TIMESTAMPTZ,
  verification_notes  TEXT,

  -- Timestamps
  filing_date         DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_cand_house_district CHECK (
    (office = 'house' AND district IS NOT NULL)
    OR (office = 'senate' AND district IS NULL)
    OR (office = 'governor' AND district IS NULL)
  )
);

-- Performance indexes
CREATE INDEX idx_candidates_election ON candidates(election_id);
CREATE INDEX idx_candidates_state ON candidates(state);
CREATE INDEX idx_candidates_party ON candidates(party);
CREATE INDEX idx_candidates_office ON candidates(office);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_incumbent ON candidates(incumbent);
CREATE INDEX idx_candidates_state_office ON candidates(state, office);
CREATE INDEX idx_candidates_state_district ON candidates(state, district);
CREATE INDEX idx_candidates_name_search ON candidates USING gin(to_tsvector('english', full_name));
CREATE INDEX idx_candidates_confidence ON candidates(data_confidence);

-- FIX: Added UNIQUE index on fec_candidate_id for upsert ON CONFLICT to work
CREATE UNIQUE INDEX idx_candidates_fec_id ON candidates(fec_candidate_id) WHERE fec_candidate_id IS NOT NULL;

-- ============================================================
-- CANDIDATE HISTORY (audit trail)
-- ============================================================

CREATE TABLE candidate_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  field_changed   VARCHAR(100) NOT NULL,
  old_value       TEXT,
  new_value       TEXT,
  changed_by      VARCHAR(100) DEFAULT 'system',
  source          VARCHAR(200),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidate_history_candidate ON candidate_history(candidate_id);
CREATE INDEX idx_candidate_history_date ON candidate_history(changed_at);

-- ============================================================
-- DATA COLLECTION RUNS (scraper tracking)
-- ============================================================

CREATE TABLE collection_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          VARCHAR(100) NOT NULL,  -- 'fec', 'ballotpedia', etc.
  status          VARCHAR(20) NOT NULL DEFAULT 'running',  -- running, completed, failed
  records_found   INT DEFAULT 0,
  records_added   INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  errors          JSONB,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INT
);

CREATE INDEX idx_collection_runs_source ON collection_runs(source);
CREATE INDEX idx_collection_runs_status ON collection_runs(status);
-- FIX: Index for cleanup queries on old runs
CREATE INDEX idx_collection_runs_started_at ON collection_runs(started_at);

-- ============================================================
-- API KEYS (for public API access)
-- ============================================================

CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash        VARCHAR(128) NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  email           VARCHAR(300) NOT NULL,
  tier            VARCHAR(20) NOT NULL DEFAULT 'free',  -- free, pro, enterprise
  rate_limit      INT NOT NULL DEFAULT 100,  -- requests per hour
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  total_requests  BIGINT DEFAULT 0,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- ============================================================
-- ADMIN USERS
-- NOTE: Password hashing MUST use bcrypt or argon2id in the
-- application layer. Never store plaintext passwords.
-- ============================================================

CREATE TABLE admin_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(300) NOT NULL UNIQUE,
  password_hash   VARCHAR(200) NOT NULL,  -- bcrypt/argon2id hash only
  role            VARCHAR(20) NOT NULL DEFAULT 'editor',  -- admin, editor, viewer
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_elections_updated_at
  BEFORE UPDATE ON elections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update election candidate count
CREATE OR REPLACE FUNCTION update_election_candidate_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE elections SET total_candidates = (
    SELECT COUNT(*) FROM candidates
    WHERE election_id = COALESCE(NEW.election_id, OLD.election_id)
    AND status NOT IN ('withdrawn')
  )
  WHERE id = COALESCE(NEW.election_id, OLD.election_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_candidate_count_insert
  AFTER INSERT ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_election_candidate_count();

CREATE TRIGGER trg_candidate_count_update
  AFTER UPDATE OF status ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_election_candidate_count();

CREATE TRIGGER trg_candidate_count_delete
  AFTER DELETE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_election_candidate_count();

-- ============================================================
-- VIEWS
-- ============================================================

-- Candidates with full race context
CREATE VIEW v_candidates_full AS
SELECT
  c.*,
  e.election_date AS race_election_date,
  e.primary_date AS race_primary_date,
  e.election_type AS race_election_type,
  e.cook_rating AS race_cook_rating,
  e.is_competitive AS race_is_competitive,
  s.name AS state_name,
  s.region AS state_region
FROM candidates c
JOIN elections e ON c.election_id = e.id
JOIN states s ON c.state = s.code;

-- State summary dashboard
CREATE VIEW v_state_summary AS
SELECT
  s.code AS state,
  s.name AS state_name,
  COUNT(DISTINCT CASE WHEN c.office = 'senate' THEN c.election_id END) AS senate_races,
  COUNT(DISTINCT CASE WHEN c.office = 'house' THEN c.election_id END) AS house_races,
  COUNT(DISTINCT CASE WHEN c.office = 'governor' THEN c.election_id END) AS governor_races,
  COUNT(c.id) FILTER (WHERE c.status NOT IN ('withdrawn')) AS total_candidates,
  COUNT(c.id) FILTER (WHERE c.party = 'democratic') AS democratic_candidates,
  COUNT(c.id) FILTER (WHERE c.party = 'republican') AS republican_candidates,
  COUNT(c.id) FILTER (WHERE c.party NOT IN ('democratic', 'republican')) AS other_candidates,
  COUNT(c.id) FILTER (WHERE c.incumbent = TRUE) AS incumbents_running,
  AVG(c.data_confidence) AS avg_data_confidence
FROM states s
LEFT JOIN candidates c ON s.code = c.state AND c.status NOT IN ('withdrawn')
GROUP BY s.code, s.name;

-- Party breakdown
CREATE VIEW v_party_breakdown AS
SELECT
  c.party,
  c.office,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE c.incumbent = TRUE) AS incumbents,
  COUNT(*) FILTER (WHERE c.incumbent = FALSE) AS challengers,
  AVG(c.total_raised) AS avg_raised
FROM candidates c
WHERE c.status NOT IN ('withdrawn')
GROUP BY c.party, c.office;