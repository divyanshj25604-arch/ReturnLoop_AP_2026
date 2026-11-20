// Parses a URL or body ID. Returns a positive integer, or null if the value is
// not a whole positive number (so "12abc", "1.5", "-3" and "" are all rejected).
function parseId(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
    return null;
  }
  const id = Number(value.trim());
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

module.exports = parseId;
