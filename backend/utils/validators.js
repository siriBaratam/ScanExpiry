// Levenshtein distance algorithm for fuzzy matching
export function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

// Calculate similarity score (0 to 1)
export function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  const distance = levenshteinDistance(shorter, longer);
  return 1 - distance / longer.length;
}

// Validate product data before storage
export function validateProduct(data) {
  const errors = [];

  // Validate required fields
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Product name is required');
  }

  if (!data.category || data.category.trim().length === 0) {
    errors.push('Category is required');
  }

  if (!data.expiry_date) {
    errors.push('Expiry date is required');
  }

  // Validate expiry date format
  if (data.expiry_date) {
    const expiryDate = new Date(data.expiry_date);
    if (isNaN(expiryDate.getTime())) {
      errors.push('Invalid expiry date format');
    } else if (expiryDate < new Date()) {
      errors.push('Expiry date must be in the future');
    }
  }

  // Validate date logic
  if (data.manufacture_date && data.expiry_date) {
    const mfgDate = new Date(data.manufacture_date);
    const expDate = new Date(data.expiry_date);
    if (mfgDate > expDate) {
      errors.push('Manufacture date cannot be after expiry date');
    }
  }

  // Validate reasonable shelf life (max 10 years)
  if (data.manufacture_date && data.expiry_date) {
    const shelfLife = new Date(data.expiry_date) - new Date(data.manufacture_date);
    const maxShelfLife = 10 * 365 * 24 * 60 * 60 * 1000;
    if (shelfLife > maxShelfLife) {
      errors.push('Unrealistic shelf life detected (max 10 years)');
    }
  }

  return { isValid: errors.length === 0, errors };
}
