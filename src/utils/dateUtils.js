/**
 * Formats a date string or timestamp into a human-readable format including time.
 * Example: "Mar 21, 2026, 07:05 PM"
 */
export const formatFullDate = (dateSource) => {
  if (!dateSource) return 'N/A';
  try {
    const date = new Date(dateSource);
    if (isNaN(date.getTime())) return 'N/A';
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return 'N/A';
  }
};

/**
 * Formats a date string or timestamp into a concise time format.
 * Example: "07:05 PM"
 */
export const formatTimeOnly = (dateSource) => {
  if (!dateSource) return '';
  try {
    const date = new Date(dateSource);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return '';
  }
};
