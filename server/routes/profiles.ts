import { Router, Request, Response } from 'express';
import { query, transaction } from '../services/database.js';
import { logger } from '../services/logger.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const profilesRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── GET /api/v1/candidates/:id/profile ──────────────────────
// Public: get published profile + positions + endorsements
profilesRouter.get('/candidates/:id/profile', async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(String(req.params.id))) {
      return res.status(400).json({ error: 'Invalid candidate ID format' });
    }

    const profileResult = await query(
      `SELECT cp.*, u.display_name as user_display_name
       FROM candidate_profiles cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.candidate_id = $1 AND cp.is_published = TRUE AND cp.claim_status = 'approved'`,
      [req.params.id]
    );

    if (profileResult.rows.length === 0) {
      return res.json({ profile: null, positions: [], endorsements: [] });
    }

    const profile = profileResult.rows[0];

    const [positionsResult, endorsementsResult] = await Promise.all([
      query(
        'SELECT * FROM candidate_positions WHERE candidate_id = $1 ORDER BY priority ASC, created_at ASC',
        [req.params.id]
      ),
      query(
        'SELECT * FROM candidate_endorsements WHERE candidate_id = $1 ORDER BY endorsement_date DESC NULLS LAST',
        [req.params.id]
      ),
    ]);

    res.json({
      profile,
      positions: positionsResult.rows,
      endorsements: endorsementsResult.rows,
    });
  } catch (error) {
    logger.error('Error fetching candidate profile:', error);
    res.status(500).json({ error: 'Failed to fetch candidate profile' });
  }
});

// ── POST /api/v1/candidates/:id/claim ───────────────────────
// Submit a claim request for a candidate profile
profilesRouter.post('/candidates/:id/claim', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(String(req.params.id))) {
      return res.status(400).json({ error: 'Invalid candidate ID format' });
    }

    // Check candidate exists
    const candidateResult = await query(
      'SELECT id, full_name FROM candidates WHERE id = $1',
      [req.params.id]
    );
    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Check if already claimed
    const existingClaim = await query(
      'SELECT id, claim_status, user_id FROM candidate_profiles WHERE candidate_id = $1',
      [req.params.id]
    );
    if (existingClaim.rows.length > 0) {
      const claim = existingClaim.rows[0];
      if (claim.user_id === req.user!.userId) {
        return res.status(409).json({ error: 'You have already submitted a claim for this profile', claim_status: claim.claim_status });
      }
      return res.status(409).json({ error: 'This candidate profile has already been claimed' });
    }

    // Create pending claim
    const result = await query(
      `INSERT INTO candidate_profiles (candidate_id, user_id, claim_status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [req.params.id, req.user!.userId]
    );

    logger.info(`Profile claim submitted: candidate=${req.params.id}, user=${req.user!.userId}`);

    res.status(201).json({ profile: result.rows[0] });
  } catch (error) {
    // Handle unique constraint violation (race condition: two claims at once)
    if ((error as any)?.code === '23505') {
      return res.status(409).json({ error: 'This candidate profile has already been claimed' });
    }
    logger.error('Error claiming candidate profile:', error);
    res.status(500).json({ error: 'Failed to submit claim' });
  }
});

// ── Middleware: ensure user is approved candidate ─────────────
function requireApprovedCandidate(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Allow admin or candidate role
  if (req.user.role !== 'candidate' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Candidate or admin role required' });
  }
  next();
}

// ── GET /api/v1/profile ─────────────────────────────────────
// Get own profile + positions + endorsements (includes unpublished)
profilesRouter.get('/profile', requireAuth, requireApprovedCandidate, async (req: Request, res: Response) => {
  try {
    const profileResult = await query(
      `SELECT cp.*, u.display_name as user_display_name
       FROM candidate_profiles cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.user_id = $1 AND cp.claim_status = 'approved'`,
      [req.user!.userId]
    );

    if (profileResult.rows.length === 0) {
      return res.json({ profile: null, positions: [], endorsements: [] });
    }

    const profile = profileResult.rows[0];

    const [positionsResult, endorsementsResult] = await Promise.all([
      query(
        'SELECT * FROM candidate_positions WHERE candidate_id = $1 ORDER BY priority ASC, created_at ASC',
        [profile.candidate_id]
      ),
      query(
        'SELECT * FROM candidate_endorsements WHERE candidate_id = $1 ORDER BY endorsement_date DESC NULLS LAST',
        [profile.candidate_id]
      ),
    ]);

    res.json({
      profile,
      positions: positionsResult.rows,
      endorsements: endorsementsResult.rows,
    });
  } catch (error) {
    logger.error('Error fetching own profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── PUT /api/v1/profile ─────────────────────────────────────
// Update own profile
profilesRouter.put('/profile', requireAuth, requireApprovedCandidate, async (req: Request, res: Response) => {
  try {
    const { headline, about, platform_summary, video_url,
            social_twitter, social_facebook, social_instagram, social_youtube,
            contact_email, contact_phone } = req.body;

    const result = await query(
      `UPDATE candidate_profiles SET
        headline = COALESCE($1, headline),
        about = COALESCE($2, about),
        platform_summary = COALESCE($3, platform_summary),
        video_url = COALESCE($4, video_url),
        social_twitter = COALESCE($5, social_twitter),
        social_facebook = COALESCE($6, social_facebook),
        social_instagram = COALESCE($7, social_instagram),
        social_youtube = COALESCE($8, social_youtube),
        contact_email = COALESCE($9, contact_email),
        contact_phone = COALESCE($10, contact_phone)
       WHERE user_id = $11 AND claim_status = 'approved'
       RETURNING *`,
      [headline, about, platform_summary, video_url,
       social_twitter, social_facebook, social_instagram, social_youtube,
       contact_email, contact_phone, req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No approved profile found for this user' });
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── GET /api/v1/profile/positions ───────────────────────────
profilesRouter.get('/profile/positions', requireAuth, requireApprovedCandidate, async (req: Request, res: Response) => {
  try {
    const profileResult = await query(
      'SELECT candidate_id FROM candidate_profiles WHERE user_id = $1 AND claim_status = $2',
      [req.user!.userId, 'approved']
    );
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'No approved profile found' });
    }

    const result = await query(
      'SELECT * FROM candidate_positions WHERE candidate_id = $1 ORDER BY priority ASC, created_at ASC',
      [profileResult.rows[0].candidate_id]
    );

    res.json({ data: result.rows });
  } catch (error) {
    logger.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// ── POST /api/v1/profile/positions ──────────────────────────
profilesRouter.post('/profile/positions', requireAuth, requireApprovedCandidate, async (req: Request, res: Response) => {
  try {
    const { title, stance, description, priority } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: 'Title must be 200 characters or less' });
    }

    const profileResult = await query(
      'SELECT candidate_id FROM candidate_profiles WHERE user_id = $1 AND claim_status = $2',
      [req.user!.userId, 'approved']
    );
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'No approved profile found' });
    }

    const result = await query(
      `INSERT INTO candidate_positions (candidate_id, title, stance, description, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [profileResult.rows[0].candidate_id, title.trim(), stance?.trim() || null, description.trim(), priority || 0]
    );

    res.status(201).json({ position: result.rows[0] });
  } catch (error) {
    logger.error('Error adding position:', error);
    res.status(500).json({ error: 'Failed to add position' });
  }
});

// ── PUT /api/v1/profile/positions/:id ───────────────────────
profilesRouter.put('/profile/positions/:id', requireAuth, requireApprovedCandidate, async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(String(req.params.id))) {
      return res.status(400).json({ error: 'Invalid position ID format' });
    }

    const { title, stance, description, priority } = req.body;

    const profileResult = await query(
      'SELECT candidate_id FROM candidate_profiles WHERE user_id = $1 AND claim_status = $2',
      [req.user!.userId, 'approved']
    );
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'No approved profile found' });
    }

    const result = await query(
      `UPDATE candidate_positions SET
        title = COALESCE($1, title),
        stance = COALESCE($2, stance),
        description = COALESCE($3, description),
        priority = COALESCE($4, priority)
       WHERE id = $5 AND candidate_id = $6
       RETURNING *`,
      [title?.trim(), stance?.trim(), description?.trim(), priority,
       req.params.id, profileResult.rows[0].candidate_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json({ position: result.rows[0] });
  } catch (error) {
    logger.error('Error updating position:', error);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

// ── DELETE /api/v1/profile/positions/:id ────────────────────
profilesRouter.delete('/profile/positions/:id', requireAuth, requireApprovedCandidate, async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(String(req.params.id))) {
      return res.status(400).json({ error: 'Invalid position ID format' });
    }

    const profileResult = await query(
      'SELECT candidate_id FROM candidate_profiles WHERE user_id = $1 AND claim_status = $2',
      [req.user!.userId, 'approved']
    );
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'No approved profile found' });
    }

    const result = await query(
      'DELETE FROM candidate_positions WHERE id = $1 AND candidate_id = $2 RETURNING id',
      [req.params.id, profileResult.rows[0].candidate_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting position:', error);
    res.status(500).json({ error: 'Failed to delete position' });
  }
});

// ── POST /api/v1/profile/endorsements ───────────────────────
profilesRouter.post('/profile/endorsements', requireAuth, requireApprovedCandidate, async (req: Request, res: Response) => {
  try {
    const { endorser_name, endorser_title, endorser_org, quote, endorsement_date } = req.body;

    if (!endorser_name) {
      return res.status(400).json({ error: 'Endorser name is required' });
    }
    if (endorser_name.length > 200) {
      return res.status(400).json({ error: 'Endorser name must be 200 characters or less' });
    }

    const profileResult = await query(
      'SELECT candidate_id FROM candidate_profiles WHERE user_id = $1 AND claim_status = $2',
      [req.user!.userId, 'approved']
    );
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'No approved profile found' });
    }

    const result = await query(
      `INSERT INTO candidate_endorsements (candidate_id, endorser_name, endorser_title, endorser_org, quote, endorsement_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [profileResult.rows[0].candidate_id, endorser_name.trim(),
       endorser_title?.trim() || null, endorser_org?.trim() || null,
       quote?.trim() || null, endorsement_date || null]
    );

    res.status(201).json({ endorsement: result.rows[0] });
  } catch (error) {
    logger.error('Error adding endorsement:', error);
    res.status(500).json({ error: 'Failed to add endorsement' });
  }
});

// ── DELETE /api/v1/profile/endorsements/:id ─────────────────
profilesRouter.delete('/profile/endorsements/:id', requireAuth, requireApprovedCandidate, async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(String(req.params.id))) {
      return res.status(400).json({ error: 'Invalid endorsement ID format' });
    }

    const profileResult = await query(
      'SELECT candidate_id FROM candidate_profiles WHERE user_id = $1 AND claim_status = $2',
      [req.user!.userId, 'approved']
    );
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'No approved profile found' });
    }

    const result = await query(
      'DELETE FROM candidate_endorsements WHERE id = $1 AND candidate_id = $2 RETURNING id',
      [req.params.id, profileResult.rows[0].candidate_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Endorsement not found' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting endorsement:', error);
    res.status(500).json({ error: 'Failed to delete endorsement' });
  }
});

// ── PUT /api/v1/profile/publish ─────────────────────────────
profilesRouter.put('/profile/publish', requireAuth, requireApprovedCandidate, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `UPDATE candidate_profiles SET is_published = NOT is_published
       WHERE user_id = $1 AND claim_status = 'approved'
       RETURNING is_published`,
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No approved profile found' });
    }

    res.json({ is_published: result.rows[0].is_published });
  } catch (error) {
    logger.error('Error toggling publish:', error);
    res.status(500).json({ error: 'Failed to toggle publish' });
  }
});

// ── Admin: GET /api/v1/admin/claims ─────────────────────────
profilesRouter.get('/admin/claims', requireAuth, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT cp.*, c.full_name as candidate_name, c.state, c.office,
              u.email as claimant_email, u.display_name as claimant_name
       FROM candidate_profiles cp
       JOIN candidates c ON cp.candidate_id = c.id
       JOIN users u ON cp.user_id = u.id
       WHERE cp.claim_status = 'pending'
       ORDER BY cp.created_at ASC`
    );

    res.json({ data: result.rows });
  } catch (error) {
    logger.error('Error fetching claims:', error);
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// ── Admin: PUT /api/v1/admin/claims/:id ─────────────────────
profilesRouter.put('/admin/claims/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(String(req.params.id))) {
      return res.status(400).json({ error: 'Invalid claim ID format' });
    }

    const { status } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "approved" or "rejected"' });
    }

    await transaction(async (client) => {
      // Update claim status
      const claimResult = await client.query(
        `UPDATE candidate_profiles SET claim_status = $1
         WHERE id = $2
         RETURNING *`,
        [status, req.params.id]
      );

      if (claimResult.rows.length === 0) {
        throw new Error('Claim not found');
      }

      const claim = claimResult.rows[0];

      // If approved, update user role and link candidate
      if (status === 'approved') {
        await client.query(
          `UPDATE users SET role = 'candidate', candidate_id = $1
           WHERE id = $2`,
          [claim.candidate_id, claim.user_id]
        );
      }
    });

    logger.info(`Claim ${req.params.id} ${status} by admin ${req.user!.userId}`);

    res.json({ success: true, status });
  } catch (error) {
    if ((error as Error).message === 'Claim not found') {
      return res.status(404).json({ error: 'Claim not found' });
    }
    logger.error('Error updating claim:', error);
    res.status(500).json({ error: 'Failed to update claim' });
  }
});
