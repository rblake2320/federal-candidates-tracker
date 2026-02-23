-- 005_analytics.sql — Analytics data capture tables
-- Captures all user events (frontend + backend) and API request logs.

-- ── All user events (page views, clicks, searches, engagement) ──────────
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  properties JSONB,
  page_url TEXT,
  referrer TEXT,
  cf_country VARCHAR(2),
  cf_region VARCHAR(50),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duration_ms INT
);

CREATE INDEX idx_analytics_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX idx_analytics_type ON analytics_events(event_type, event_name);

-- ── API request log (every backend request) ─────────────────────────────
CREATE TABLE api_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method VARCHAR(10) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status_code INT NOT NULL,
  response_time_ms INT NOT NULL,
  cf_country VARCHAR(2),
  cf_ray_id VARCHAR(50),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_request_log_timestamp ON api_request_log(timestamp DESC);
