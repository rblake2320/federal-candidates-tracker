-- ── Seed: 2026 Midterm Elections ──────────────────────────
-- Class II Senate seats + all House seats

-- ── Senate Class II (33 seats) ───────────────────────────
INSERT INTO elections (state, office, district, senate_class, election_type, election_date, filing_deadline, primary_date)
VALUES
  ('AL', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-06-01', '2026-06-02'),
  ('AK', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-06-01', '2026-08-18'),
  ('AR', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-03-01', '2026-05-26'),
  ('CO', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-03-12', '2026-06-30'),
  ('DE', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-07-10', '2026-09-08'),
  ('GA', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-03-06', '2026-05-19'),
  ('ID', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-03-13', '2026-05-19'),
  ('IL', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-12-01', '2026-03-17'),
  ('IA', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-03-13', '2026-06-02'),
  ('KS', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-06-01', '2026-08-04'),
  ('KY', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-01-26', '2026-05-19'),
  ('LA', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-07-24', '2026-11-03'),
  ('ME', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-03-15', '2026-06-09'),
  ('MA', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-06-02', '2026-09-01'),
  ('MI', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-04-21', '2026-08-04'),
  ('MN', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-05-26', '2026-08-11'),
  ('MS', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-03-01', '2026-06-02'),
  ('MT', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-03-09', '2026-06-02'),
  ('NE', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-03-01', '2026-05-12'),
  ('NH', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-06-12', '2026-09-08'),
  ('NJ', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-04-06', '2026-06-09'),
  ('NM', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-02-03', '2026-06-02'),
  ('NC', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-12-15', '2026-03-03'),
  ('OK', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-04-08', '2026-06-30'),
  ('OR', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-03-10', '2026-05-19'),
  ('RI', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-06-24', '2026-09-08'),
  ('SC', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-03-30', '2026-06-09'),
  ('SD', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-03-31', '2026-06-02'),
  ('TN', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-04-02', '2026-08-06'),
  ('TX', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-12-08', '2026-03-03'),
  ('VA', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-03-26', '2026-06-09'),
  ('WV', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-01-24', '2026-05-12'),
  ('WY', 'senate', NULL, 2, 'regular', '2026-11-03', '2026-05-29', '2026-08-18')
ON CONFLICT DO NOTHING;

-- ── Note: House elections ────────────────────────────────
-- All 435 House seats are up every 2 years.
-- House election records are generated per-state by the seed script
-- based on each state's house_seats count, rather than listing all 435 here.
