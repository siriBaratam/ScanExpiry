import express from 'express';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { getOCRWorker } from '../utils/ocrWorker.js';
import { validateProduct, calculateSimilarity } from '../utils/validators.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { rows } = await query('SELECT * FROM products WHERE user_id = $1 ORDER BY expiry_date ASC', [req.user.id]);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, category, expiry_date, purchase_date, manufacture_date, best_before_date } = req.body;
  
  // Validate required fields
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  // Validate incoming data
  const validation = validateProduct({ name, category, expiry_date, manufacture_date, best_before_date });
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.errors.join(', ') });
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

// OCR endpoint for processing images (with improved parsing and validation)
router.post('/ocr', async (req, res) => {
  try {
    const { image } = req.body; // Base64 image data

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Get cached worker instance
    const worker = await getOCRWorker();

    // Process the image
    const { data: { text, confidence } } = await worker.recognize(image);

    // Parse the text for product information
    const parsedData = parseOCRText(text);
    
    // Validate confidence threshold
    const confidenceScore = Number.isFinite(confidence) ? Number(confidence.toFixed(2)) : null;
    const requiresManualReview = confidenceScore && confidenceScore < 0.6;

    // Validate parsed data
    const validation = validateProduct(parsedData);

    res.json({
      text: text.trim(),
      parsedData,
      confidence: confidenceScore,
      requiresManualReview,
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
      },
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Helper function to parse OCR text with improved date and category detection
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

  // Look for labelled dates first with expanded regex patterns
  const labeledDates = [
    { key: 'expiry_date', regex: /(?:exp(?:iry)?|expires?|valid\s+till|use\s+by|consume\s+by)[:\s]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i },
    { key: 'manufacture_date', regex: /(?:mfg|manufacture(?:d)?(?:\s+on)?|made\s+on|produced)[:\s]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i },
    { key: 'best_before_date', regex: /(?:best\s+before|best\s+by)[:\s]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i },
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

  // Try text-based date formats (e.g., "15 Jan 2024", "January 15 2024")
  if (!data.expiry_date) {
    const textDateMatch = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})/i);
    if (textDateMatch) {
      const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
      const monthKey = textDateMatch[2].toLowerCase().slice(0, 3);
      const candidate = new Date(textDateMatch[3], months[monthKey], textDateMatch[1]);
      if (candidate.getFullYear() == textDateMatch[3]) {
        data.expiry_date = candidate.toISOString().split('T')[0];
      }
    }
  }

  // Extract all unlabeled dates found in text
  const allDates = [];
  const genericDatePattern = /([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/g;
  let match;
  while ((match = genericDatePattern.exec(text)) !== null) {
    const normalizedDate = normalizeDate(match[1]);
    if (normalizedDate && !allDates.includes(normalizedDate)) {
      allDates.push(normalizedDate);
    }
  }

  // Smart date assignment: if two dates found without labels, assign smaller to manufacture, larger to expiry
  if (!data.expiry_date && !data.manufacture_date && allDates.length >= 2) {
    const sortedDates = allDates.sort();
    data.manufacture_date = sortedDates[0]; // Earlier date
    data.expiry_date = sortedDates[1];      // Later date
  } 
  // If only expiry is missing but we have dates
  else if (!data.expiry_date && allDates.length > 0) {
    // Use first available date that isn't already assigned as manufacture_date
    const availableDate = allDates.find(d => d !== data.manufacture_date);
    if (availableDate) {
      data.expiry_date = availableDate;
    } else if (allDates.length > 0) {
      data.expiry_date = allDates[0];
    }
  }

  // Improved name extraction: first non-empty line that's not a date/keyword
  const excludeTerms = ['exp', 'best before', 'mfg', 'manufactured', 'product of', 'net weight', 'contents', 'ingredients'];
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 2);
  
  if (lines.length > 0) {
    const nameLine = lines.find((line) => {
      const lower = line.toLowerCase();
      return !excludeTerms.some(t => lower.includes(t)) && 
             !/\d{1,2}[\/\-\.]?\d{1,2}[\/\-\.]\d{2,4}/.test(line) &&
             line.length < 100;
    }) || lines[0];
    data.name = nameLine.substring(0, 100);
  }

  // Expanded category detection with fuzzy matching and keyword enrichment
  const categoryMap = [
    { cat: 'Dairy', terms: ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'curd', 'paneer', 'ghee', 'lassi', 'kheer', 'ice cream', 'custard', 'cottage cheese'] },
    { cat: 'Bakery', terms: ['bread', 'flour', 'cake', 'bun', 'pastry', 'croissant', 'bagel', 'donut', 'biscuit', 'cookie', 'toast', 'muffin', 'loaf'] },
    { cat: 'Beverages', terms: ['soda', 'juice', 'water', 'tea', 'coffee', 'cola', 'beer', 'wine', 'cider', 'drinks', 'beverage', 'soft drink', 'energy drink', 'milk shake'] },
    { cat: 'Meat', terms: ['chicken', 'beef', 'pork', 'fish', 'sausage', 'turkey', 'lamb', 'salmon', 'meat', 'ham', 'bacon', 'poultry', 'mutton', 'seafood'] },
    { cat: 'Produce', terms: ['apple', 'banana', 'orange', 'tomato', 'lettuce', 'potato', 'onion', 'carrot', 'fruit', 'vegetable', 'fresh', 'leafy', 'grape', 'mango', 'broccoli'] },
    { cat: 'Snacks', terms: ['chips', 'cookie', 'cracker', 'nuts', 'popcorn', 'cereal', 'granola', 'candy', 'snack', 'wafer', 'bar', 'mixture', 'pretzel', 'chocolate'] },
  ];

  // First try exact substring match on the full text
  for (const item of categoryMap) {
    if (item.terms.some((term) => cleanText.includes(term))) {
      data.category = item.cat;
      return data;
    }
  }

  // Also check the product name specifically for better accuracy
  const productNameLower = data.name.toLowerCase();
  for (const item of categoryMap) {
    if (item.terms.some((term) => productNameLower.includes(term))) {
      data.category = item.cat;
      return data;
    }
  }

  // Fuzzy match as fallback
  const words = cleanText.split(/\s+/);
  for (const item of categoryMap) {
    for (const term of item.terms) {
      for (const word of words) {
        if (word.length > 3) {
          const similarity = calculateSimilarity(word, term);
          if (similarity > 0.7) {
            data.category = item.cat;
            return data;
          }
        }
      }
    }
  }

  return data;
}

// Helper function to normalize dates with extended format support
function normalizeDate(dateStr) {
  // Handle various date formats: DD/MM/YY, MM/DD/YY, DD-MM-YYYY, etc.
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length !== 3) return null;

  let p1 = parseInt(parts[0], 10);
  let p2 = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);

  if (isNaN(p1) || isNaN(p2) || isNaN(year)) return null;

  // Year normalization with window (00-30 -> 20xx, 31-99 -> 19xx)
  if (year < 100) {
    year += year <= 30 ? 2000 : 1900;
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

  // Intelligent date format detection
  // If first number > 12, it MUST be day (DD/MM format)
  if (p1 > 12) {
    return tryNormalize(p1, p2 - 1);
  }
  
  // If second number > 12, it MUST be day (MM/DD format)
  if (p2 > 12) {
    return tryNormalize(p2, p1 - 1);
  }
  
  // Both numbers <= 12: try DD/MM first (more common in product packaging), then MM/DD
  return (
    tryNormalize(p1, p2 - 1) ||
    tryNormalize(p2, p1 - 1) ||
    null
  );
}

export default router;
