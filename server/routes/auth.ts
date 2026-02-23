import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../services/database.js';
import { logger } from '../services/logger.js';
import { generateToken, requireAuth, type AuthPayload } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Auth-specific rate limiting: 10 requests per 15 minutes
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

// ── POST /api/v1/auth/register ──────────────────────────────
authRouter.post('/register', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password, display_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    if (display_name && display_name.length > 100) {
      return res.status(400).json({ error: 'Display name must be 100 characters or less' });
    }

    // Check if email already exists
    const existing = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await query<{ id: string; email: string; role: string; display_name: string | null }>(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, 'voter')
       RETURNING id, email, role, display_name`,
      [email.toLowerCase().trim(), password_hash, display_name?.trim() || null]
    );

    const user = result.rows[0];
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as AuthPayload['role'],
    };
    const token = generateToken(payload);

    logger.info(`User registered: ${user.email}`);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /api/v1/auth/login ─────────────────────────────────
authRouter.post('/login', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await query<{
      id: string;
      email: string;
      password_hash: string;
      role: string;
      display_name: string | null;
      is_active: boolean;
      candidate_id: string | null;
    }>(
      'SELECT id, email, password_hash, role, display_name, is_active, candidate_id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last_login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as AuthPayload['role'],
    };
    const token = generateToken(payload);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        candidate_id: user.candidate_id,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── GET /api/v1/auth/me ─────────────────────────────────────
authRouter.get('/me', authRateLimit, requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await query<{
      id: string;
      email: string;
      role: string;
      display_name: string | null;
      candidate_id: string | null;
      created_at: string;
    }>(
      'SELECT id, email, role, display_name, candidate_id, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Issue a fresh token (silent refresh)
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as AuthPayload['role'],
    };
    const token = generateToken(payload);

    res.json({ user, token });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── PUT /api/v1/auth/me ─────────────────────────────────────
authRouter.put('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { display_name } = req.body;

    if (display_name && display_name.length > 100) {
      return res.status(400).json({ error: 'Display name must be 100 characters or less' });
    }

    const result = await query<{ id: string; email: string; role: string; display_name: string | null }>(
      `UPDATE users SET display_name = $1, last_login_at = NOW()
       WHERE id = $2
       RETURNING id, email, role, display_name`,
      [display_name?.trim() || null, req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});
