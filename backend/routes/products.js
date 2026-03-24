import express from 'express';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { createWorker } from 'tesseract.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { rows } = await query('SELECT * FROM products WHERE user_id = $1 ORDER BY expiry_date ASC', [req.user.id]);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, category, expiry_date, purchase_date, manufacture_date, best_before_date } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  let finalExpiryDate = expiry_date;
  let finalPurchaseDate = purchase_date || manufacture_date;

  if (!expiry_date) {
    if (!manufacture_date || !best_before_date) {
      return res.status(400).json({ error: 'Either expiry_date or both manufacture_date and best_before_date are required' });
    }
    // Validate best_before_date > manufacture_date
    const manufacture = new Date(manufacture_date);
    const bestBefore = new Date(best_before_date);
    if (bestBefore <= manufacture) {
      return res.status(400).json({ error: 'Best Before Date must be after Manufacture Date' });
    }
    finalExpiryDate = best_before_date;
    finalPurchaseDate = manufacture_date;
  }

  const { rows } = await query(
    'INSERT INTO products (name, category, expiry_date, purchase_date, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, category, finalExpiryDate, finalPurchaseDate || null, req.user.id]
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

// OCR endpoint for processing images
router.post('/ocr', async (req, res) => {
  try {
    const { image } = req.body; // Base64 image data

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Create OCR worker
    const worker = await createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789/.-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',
    });

    // Process the image
    const { data: { text, confidence } } = await worker.recognize(image);
    await worker.terminate();

    // Parse the text for product information
    const parsedData = parseOCRText(text);

    res.json({
      text: text.trim(),
      parsedData,
      confidence: Number.isFinite(confidence) ? Number(confidence.toFixed(2)) : null,
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Helper function to parse OCR text
function parseOCRText(text) {
  const data = {
    name: '',
    category: '',
    expiry_date: '',
    manufacture_date: '',
    best_before_date: '',
  };

  // Clean text
  const cleanText = text.toLowerCase().replace(/\s+/g, ' ').trim();

  // Look for labelled dates first (exact keywords per request)
  const labeledDates = [
    { key: 'expiry_date', regex: /(?:exp(?:iry)?|expires?|valid\s+till)[:\s]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i },
    { key: 'manufacture_date', regex: /(?:mfg|manufacture(?:d)?(?:\s+on)?)[:\s]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i },
    { key: 'best_before_date', regex: /best before[:\s]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i },
  ];

  for (const item of labeledDates) {
    const match = text.match(item.regex);
    if (match && match[1]) {
      const normalizedDate = normalizeDate(match[1]);
      if (normalizedDate) {
        data[item.key] = normalizedDate;
      }
    }
  }

  // Fallback date extraction (first valid date if expiry not found)
  if (!data.expiry_date) {
    const genericDatePattern = /([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/g;
    let match;
    while ((match = genericDatePattern.exec(text)) !== null) {
      const normalizedDate = normalizeDate(match[1]);
      if (normalizedDate) {
        data.expiry_date = normalizedDate;
        break;
      }
    }
  }

  // Name guess: first non-empty line (not a date line)
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 2);
  if (lines.length > 0) {
    data.name = lines.find((line) => !/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) || lines[0];
  }

  // Expanded category detection
  const categoryMap = [
    { cat: 'Dairy', terms: ['milk', 'cheese', 'yogurt', 'butter'] },
    { cat: 'Bakery', terms: ['bread', 'flour', 'cake', 'bun'] },
    { cat: 'Beverages', terms: ['soda', 'juice', 'water', 'tea', 'coffee'] },
    { cat: 'Meat', terms: ['chicken', 'beef', 'pork', 'fish', 'sausage'] },
    { cat: 'Produce', terms: ['apple', 'banana', 'orange', 'tomato', 'lettuce'] },
    { cat: 'Snacks', terms: ['chips', 'cookie', 'cracker', 'nuts'] },
  ];

  for (const item of categoryMap) {
    if (item.terms.some((term) => cleanText.includes(term))) {
      data.category = item.cat;
      break;
    }
  }

  return data;
}

// Helper function to normalize dates
function normalizeDate(dateStr) {
  // Handle various date formats: DD/MM/YY, MM/DD/YY, DD-MM-YYYY, etc.
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length !== 3) return null;

  let p1 = parseInt(parts[0], 10);
  let p2 = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);

  if (isNaN(p1) || isNaN(p2) || isNaN(year)) return null;

  if (year < 100) {
    year += year < 50 ? 2000 : 1900;
  }

  const tryNormalize = (day, monthIndex) => {
    if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
    const candidate = new Date(year, monthIndex, day);
    if (
      candidate.getFullYear() === year &&
      candidate.getMonth() === monthIndex &&
      candidate.getDate() === day
    ) {
      return candidate.toISOString().split('T')[0];
    }
    return null;
  };

  // Try DD/MM first, then MM/DD as fallback
  return (
    tryNormalize(p1, p2 - 1) ||
    tryNormalize(p2, p1 - 1) ||
    null
  );
}

export default router;
