// Shared date and money formatting for the client.

// Today's date as YYYY-MM-DD in the user's own timezone.
// (new Date().toISOString() gives the UTC date, which is a day behind in
// India between midnight and 05:30, so forms defaulted to yesterday.)
export function todayLocalIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// Shows a YYYY-MM-DD date from the API as a local date, without letting the
// browser treat it as UTC midnight (which can shift it by a day).
export function formatDateOnly(value) {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match.map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

// ₹ amount with the minus sign before the symbol: -₹1,136 (not ₹-1,136).
export function formatRupees(value) {
  const amount = Number(value) || 0;
  const text = `₹${Math.abs(amount).toLocaleString()}`;
  return amount < 0 ? `-${text}` : text;
}

// Like formatRupees, but always shows the sign: +₹951 / -₹185.
export function formatSignedRupees(value) {
  const amount = Number(value) || 0;
  return amount >= 0 ? `+${formatRupees(amount)}` : formatRupees(amount);
}
