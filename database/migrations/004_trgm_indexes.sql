-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_candidates_name_trgm
  ON candidates USING GIN (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_elections_desc_trgm
  ON elections USING GIN (description gin_trgm_ops);

-- Index for voter-info lookups (state + district)
CREATE INDEX IF NOT EXISTS idx_candidates_election_party
  ON candidates(election_id, party);
