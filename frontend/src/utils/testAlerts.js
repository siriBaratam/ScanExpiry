// Test script to check alert generation
import { generateAlertsFromProducts, calculateDaysUntilExpiry } from './alertGenerator.js';

const testProducts = [
  { id: 1, name: 'Milk (Test)', category: 'Dairy', expiry_date: '2026-05-02' },
  { id: 2, name: 'Bread (Test)', category: 'Bakery', expiry_date: '2026-05-01' },
  { id: 3, name: 'Eggs (Test)', category: 'Eggs', expiry_date: '2026-04-29' },
  { id: 4, name: 'Whole Milk 1L', category: 'Dairy', expiry_date: '2026-05-15' }
];

console.log('Testing date calculations:');
testProducts.forEach(product => {
  const daysLeft = calculateDaysUntilExpiry(product.expiry_date);
  console.log(`${product.name}: ${daysLeft} days left`);
});

console.log('\nTesting alert generation with 7-day timing:');
const alerts = generateAlertsFromProducts(testProducts, 7);
console.log(`Generated ${alerts.length} alerts:`);
alerts.forEach(alert => {
  console.log(`- ${alert.title} (${alert.severity}) - ${alert.daysLeft} days`);
});
