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
    const { data: { text } } = await worker.recognize(image);
    await worker.terminate();

    // Parse the text for product information
    const parsedData = parseOCRText(text);

    res.json({
      text: text.trim(),
      parsedData
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

  // Clean and normalize text
  const cleanText = text.toLowerCase().replace(/\s+/g, ' ').trim();

  // Look for expiry date patterns
  const expiryPatterns = [
    /exp(?:iry)?(?: date)?[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /best before[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /use by[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/g
  ];

  for (const pattern of expiryPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      let dateStr = match[1] || match[0];
      // Normalize date format to YYYY-MM-DD
      const normalizedDate = normalizeDate(dateStr);
      if (normalizedDate) {
        if (cleanText.includes('best before')) {
          data.best_before_date = normalizedDate;
        } else {
          data.expiry_date = normalizedDate;
        }
        break;
      }
    }
  }

  // Try to extract product name (first line or prominent text)
  const lines = text.split('\n').filter(line => line.trim().length > 2);
  if (lines.length > 0) {
    data.name = lines[0].trim();
  }

  // Basic category detection
  if (cleanText.includes('milk') || cleanText.includes('cheese') || cleanText.includes('yogurt')) {
    data.category = 'Dairy';
  } else if (cleanText.includes('bread') || cleanText.includes('flour')) {
    data.category = 'Bakery';
  } else if (cleanText.includes('soda') || cleanText.includes('juice')) {
    data.category = 'Beverages';
  }

  return data;
}

// Helper function to normalize dates
function normalizeDate(dateStr) {
  // Handle various date formats: DD/MM/YY, MM/DD/YY, DD-MM-YYYY, etc.
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) return null;

  let day, month, year;

  // Assume DD/MM/YYYY or DD/MM/YY format (common in many countries)
  day = parseInt(parts[0]);
  month = parseInt(parts[1]) - 1; // JS months are 0-based
  year = parseInt(parts[2]);

  // Handle 2-digit years
  if (year < 100) {
    year += year < 50 ? 2000 : 1900;
  }

  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;

  // Format as YYYY-MM-DD
  return date.toISOString().split('T')[0];
}

export default router;
