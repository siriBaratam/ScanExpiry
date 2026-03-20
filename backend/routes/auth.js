import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { getDemoUser, addDemoUser } from '../demoDb.js';

const router = express.Router();
const USE_DEMO = process.env.USE_DEMO === 'true' || !process.env.DATABASE_URL;

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    if (USE_DEMO) {
      // Demo mode - in-memory storage
      if (getDemoUser(email)) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      const password_hash = await bcrypt.hash(password, 10);
      const user = addDemoUser({ name, email, password_hash, role });
      
      const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'demo-secret', {
        expiresIn: '7d',
      });

      return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }

    // Real database mode
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const insert = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, password_hash, role]
    );

    const token = jwt.sign({ id: insert.rows[0].id, role: insert.rows[0].role, email: insert.rows[0].email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token, user: insert.rows[0] });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (USE_DEMO) {
      // Demo mode - in-memory storage
      const user = getDemoUser(email);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'demo-secret', {
        expiresIn: '7d',
      });

      return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }

    // Real database mode
    const userResult = await query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

  // Todo: integrate email provider and reset token
  res.json({ message: 'Password reset link request received (stub)' });
});

export default router;
