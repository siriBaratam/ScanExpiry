// Test alert generation with real API data
async function testAlerts() {
  try {
    const response = await fetch('http://localhost:5000/api/products');
    const data = await response.json();

    console.log('API Response:', typeof data, Array.isArray(data) ? 'array' : 'not array');
    console.log('Response data:', data);

    if (!Array.isArray(data)) {
      console.log('Response is not an array, checking if it has error or data property...');
      return;
    }

    const products = data;

    console.log('\nProducts from API:');
    products.forEach(p => {
      console.log(`${p.name}: ${p.expiry_date} (${typeof p.expiry_date})`);
    });

    // Test date calculation
    function calculateDaysUntilExpiry(expiryDate) {
      const today = new Date();
      const expiry = new Date(expiryDate);
      return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    }

    console.log('\nDate calculations:');
    products.forEach(p => {
      const daysLeft = calculateDaysUntilExpiry(p.expiry_date);
      console.log(`${p.name}: ${daysLeft} days left`);
    });

    // Test alert generation
    function generateAlertsFromProducts(products, alertTimingDays = 7) {
      const alerts = [];
      products.forEach((product) => {
        const daysLeft = calculateDaysUntilExpiry(product.expiry_date);

        if (Math.abs(daysLeft) <= alertTimingDays) {
          let alertTitle = "";
          let severity = "info";

          if (daysLeft < 0) {
            alertTitle = `${product.name} is expired`;
            severity = "critical";
          } else if (daysLeft === 0) {
            alertTitle = `${product.name} expires today`;
            severity = "warning";
          } else if (daysLeft === 1) {
            alertTitle = `${product.name} expires tomorrow`;
            severity = "warning";
          } else if (daysLeft <= Math.min(3, alertTimingDays)) {
            alertTitle = `${product.name} expires in ${daysLeft} days`;
            severity = "critical";
          } else {
            alertTitle = `${product.name} expires in ${daysLeft} days`;
            severity = "warning";
          }

          alerts.push({
            id: `${product.id}-${daysLeft < 0 ? 'expired' : daysLeft}`,
            productId: product.id,
            title: alertTitle,
            severity,
            daysLeft,
            expiryDate: product.expiry_date,
            category: product.category,
          });
        }
      });

      return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
    }

    const alerts = generateAlertsFromProducts(products, 7);
    console.log(`\nGenerated ${alerts.length} alerts:`);
    alerts.forEach(alert => {
      console.log(`- ${alert.title} (${alert.severity}) - ${alert.daysLeft} days`);
    });

  } catch (err) {
    console.error('Error:', err);
  }
}

testAlerts();
