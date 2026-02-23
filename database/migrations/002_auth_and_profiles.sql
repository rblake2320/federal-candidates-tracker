-- 002: Auth, Candidate Profiles, and Watchlist
-- Created: 2026-02-21

-- ============================================================
-- USERS (unified — replaces admin_users for new installs)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(300) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  display_name  VARCHAR(100),
  role          VARCHAR(20) NOT NULL DEFAULT 'voter',
  candidate_id  UUID REFERENCES candidates(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_candidate ON users(candidate_id) WHERE candidate_id IS NOT NULL;

-- Migrate existing admin_users into users if any exist
INSERT INTO users (id, email, password_hash, role, is_active, created_at, last_login_at)
SELECT id, email, password_hash, role, is_active, created_at, last_login_at
FROM admin_users
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- CANDIDATE PROFILES (self-managed content)
-- ============================================================

CREATE TABLE candidate_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    UUID NOT NULL UNIQUE REFERENCES candidates(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  claim_status    VARCHAR(20) NOT NULL DEFAULT 'pending',
  headline        VARCHAR(300),
  about           TEXT,
  platform_summary TEXT,
  video_url       VARCHAR(500),
  social_twitter  VARCHAR(200),
  social_facebook VARCHAR(200),
  social_instagram VARCHAR(200),
  social_youtube  VARCHAR(200),
  contact_email   VARCHAR(300),
  contact_phone   VARCHAR(30),
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_candidate_profiles_updated_at
  BEFORE UPDATE ON candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CANDIDATE POSITIONS (platform issues)
-- ============================================================

CREATE TABLE candidate_positions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  stance          VARCHAR(50),
  description     TEXT NOT NULL,
  priority        INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_positions_candidate ON candidate_positions(candidate_id);

CREATE TRIGGER trg_positions_updated_at
  BEFORE UPDATE ON candidate_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CANDIDATE ENDORSEMENTS
-- ============================================================

CREATE TABLE candidate_endorsements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  endorser_name   VARCHAR(200) NOT NULL,
  endorser_title  VARCHAR(200),
  endorser_org    VARCHAR(200),
  quote           TEXT,
  endorsement_date DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_endorsements_candidate ON candidate_endorsements(candidate_id);

-- ============================================================
-- WATCHLIST
-- ============================================================

CREATE TABLE watchlist (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  election_id  UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, election_id)
);

CREATE INDEX idx_watchlist_user ON watchlist(user_id);

-- ============================================================
-- COMPOSITE INDEX for party filter on elections
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_candidates_election_party ON candidates(election_id, party);
