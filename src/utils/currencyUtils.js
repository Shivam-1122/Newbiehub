/**
 * Standard Currency configuration for NewbieHub.
 * Updated to use Rupees (₹) as the primary and only currency as requested.
 */

export const COUNTRY_CURRENCIES = {
  'India': { code: 'INR', symbol: '₹', locale: 'en-IN' }
};

/**
 * Returns the standard rupee symbol.
 */
export const getCurrencySymbol = () => {
  return '₹';
};

/**
 * Formats a numeric amount into Rupees for the Indian locale.
 */
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
};
