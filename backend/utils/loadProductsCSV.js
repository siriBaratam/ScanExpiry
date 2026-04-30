import fs from 'fs';
import path from 'path';
import { query } from './db.js';

const csvFilePath = './products.csv';

async function insertProductsFromCSV() {
  try {
    // Read CSV file
    const data = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = data.trim().split('\n');
    
    // Skip header row
    const products = lines.slice(1).map(line => {
      const [name, category, expiry_date, purchase_date, user_id] = line.split(',').map(val => val.trim());
      return {
        name,
        category,
        expiry_date,
        purchase_date: purchase_date || null,
        user_id: parseInt(user_id)
      };
    });

    console.log(`Found ${products.length} products to insert...`);

    // Insert each product
    for (const product of products) {
      try {
        const result = await query(
          'INSERT INTO products (name, category, expiry_date, purchase_date, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [product.name, product.category, product.expiry_date, product.purchase_date, product.user_id]
        );
        console.log(`✓ Inserted: ${product.name}`);
      } catch (err) {
        console.error(`✗ Failed to insert ${product.name}:`, err.message);
      }
    }

    console.log('\n✓ Product insertion complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error reading CSV file:', err);
    process.exit(1);
  }
}

insertProductsFromCSV();
