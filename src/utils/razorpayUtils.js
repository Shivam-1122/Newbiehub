/**
 * Razorpay Payment Integration Utility for NewbieHub
 * 
 * This utility handles opening the Razorpay checkout window and
 * returning payment results.
 * 
 * The Razorpay Key ID is loaded from the VITE_RAZORPAY_KEY_ID
 * environment variable defined in the .env file.
 */

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

/**
 * Opens the Razorpay checkout window for payment.
 * 
 * @param {Object} options
 * @param {number} options.amount      - Amount in ₹ (will be converted to paise internally)
 * @param {string} options.currency    - Currency code, default 'INR'
 * @param {string} options.orderName   - Display name/description for the payment
 * @param {string} options.buyerName   - Buyer's full name
 * @param {string} options.buyerEmail  - Buyer's email address
 * @param {string} options.buyerPhone  - Buyer's phone number (optional)
 * @param {Object} options.notes       - Additional metadata (offerId, projectId, sellerId, etc.)
 * 
 * @returns {Promise<Object>} Resolves with { razorpay_payment_id, razorpay_order_id, razorpay_signature }
 *                            Rejects with an error object on failure/dismissal.
 */
export function openRazorpayCheckout({
  amount,
  currency = 'INR',
  orderName = 'NewbieHub Purchase',
  buyerName = '',
  buyerEmail = '',
  buyerPhone = '',
  notes = {}
}) {
  return new Promise((resolve, reject) => {
    // Razorpay expects amount in paise (1 ₹ = 100 paise)
    const amountInPaise = Math.round(Number(amount) * 100);

    if (amountInPaise < 100) {
      reject(new Error('Minimum payment amount is ₹1.'));
      return;
    }

    if (!window.Razorpay) {
      reject(new Error('Razorpay SDK not loaded. Please refresh the page and try again.'));
      return;
    }

    try {
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: currency,
        name: 'NewbieHub',
        description: orderName,
        image: '/favicon.svg',
        prefill: {
          name: buyerName,
          email: buyerEmail,
          contact: buyerPhone
        },
        notes: notes,
        theme: {
          color: '#3B82F6'
        },
        handler: function (response) {
          resolve({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id || null,
            razorpay_signature: response.razorpay_signature || null,
            method: 'razorpay'
          });
        },
        modal: {
          ondismiss: function () {
            reject(new Error('Payment cancelled by user.'));
          },
          escape: true,
          confirm_close: true
        }
      };

      const rzpInstance = new window.Razorpay(options);

      rzpInstance.on('payment.failed', function (response) {
        reject({
          code: response.error.code,
          description: response.error.description,
          source: response.error.source,
          step: response.error.step,
          reason: response.error.reason,
          metadata: response.error.metadata
        });
      });

      rzpInstance.open();
    } catch (err) {
      reject(new Error('Failed to open payment gateway: ' + (err.message || 'Unknown error')));
    }
  });
}
