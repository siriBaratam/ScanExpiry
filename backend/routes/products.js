import express from 'express';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { rows } = await query('SELECT * FROM products WHERE user_id = $1 ORDER BY expiry_date ASC', [req.user.id]);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, category, expiry_date, purchase_date } = req.body;
  if (!name || !category || !expiry_date) {
    return res.status(400).json({ error: 'Name, category, and expiry_date are required' });
  }

  const { rows } = await query(
    'INSERT INTO products (name, category, expiry_date, purchase_date, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, category, expiry_date, purchase_date || null, req.user.id]
  );

  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, expiry_date, purchase_date } = req.body;

  const { rows } = await query(
    'UPDATE products SET name=$1, category=$2, expiry_date=$3, purchase_date=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
    [name, category, expiry_date, purchase_date || null, id, req.user.id]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await query('DELETE FROM products WHERE id=$1 AND user_id=$2 RETURNING *', [id, req.user.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
  res.json({ message: 'Product deleted' });
});

export default router;
