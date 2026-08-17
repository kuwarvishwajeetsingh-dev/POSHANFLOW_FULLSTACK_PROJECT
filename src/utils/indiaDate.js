/**
 * Date and Time utilities specifically designed for Indian Standard Time (Asia/Kolkata).
 * Ensures consistency across attendance date recording, purchase orders, and analytics.
 */

const TIME_ZONE = 'Asia/Kolkata';

/**
 * Returns current date string in 'YYYY-MM-DD' formatted for the Asia/Kolkata timezone.
 * Avoids UTC mismatch bugs where night submissions drift into the next or previous day.
 * 
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} e.g. "2026-08-17"
 */
export function getIndiaDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  
  // Use Intl.DateTimeFormat with Asia/Kolkata timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(d);
}

/**
 * Formats a date string (YYYY-MM-DD) into Indian standard display format (DD/MM/YYYY).
 * 
 * @param {string|Date} dateStr 
 * @returns {string} e.g. "17/08/2026"
 */
export function formatIndiaDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

/**
 * Returns an abbreviated weekday name (Mon, Tue, etc.) in Asia/Kolkata timezone.
 * 
 * @param {string|Date} dateStr 
 * @returns {string} e.g. "Mon"
 */
export function getIndiaWeekday(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      weekday: 'short',
    }).format(d);
  } catch {
    return '';
  }
}
