import { query } from '../db.js';

async function insertTestProducts() {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const testProducts = [
      {
        name: 'Milk (Test)',
        category: 'Dairy',
        expiry_date: dayAfterTomorrow.toISOString().split('T')[0],
        purchase_date: today.toISOString().split('T')[0],
        user_id: 1
      },
      {
        name: 'Bread (Test)',
        category: 'Bakery',
        expiry_date: tomorrow.toISOString().split('T')[0],
        purchase_date: today.toISOString().split('T')[0],
        user_id: 1
      },
      {
        name: 'Eggs (Test)',
        category: 'Eggs',
        expiry_date: yesterday.toISOString().split('T')[0],
        purchase_date: today.toISOString().split('T')[0],
        user_id: 1
      }
    ];

    console.log('Inserting test products...');

    for (const product of testProducts) {
      const result = await query(
        'INSERT INTO products (name, category, expiry_date, purchase_date, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [product.name, product.category, product.expiry_date, product.purchase_date, product.user_id]
      );
      console.log(`✓ Inserted: ${product.name} (expires: ${product.expiry_date})`);
    }

    console.log('\n✓ Test products inserted successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error inserting test products:', err);
    process.exit(1);
  }
}

insertTestProducts();
