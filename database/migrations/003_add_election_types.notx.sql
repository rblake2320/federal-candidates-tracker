-- Add primary and runoff election types (must run outside transaction)
ALTER TYPE election_type ADD VALUE IF NOT EXISTS 'primary';
ALTER TYPE election_type ADD VALUE IF NOT EXISTS 'runoff';
