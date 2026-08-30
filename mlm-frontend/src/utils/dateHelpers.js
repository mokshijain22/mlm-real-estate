// Local-date helpers. NEVER use `date.toISOString().slice(0, 10)` for
// calendar-day math — toISOString() first converts to UTC, which silently
// shifts the date back a day for any timezone ahead of UTC (e.g. IST,
// UTC+5:30). That bug produced "this month" ranges like 31 Jul → 30 Aug
// instead of 1 Aug → 31 Aug. Use toLocalDateStr() (or the helpers below)
// anywhere a JS Date needs to become a yyyy-mm-dd string for an API param
// or a <input type="date"> value.

export function toLocalDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function firstOfMonth(d = new Date()) {
  return toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function lastOfMonth(d = new Date()) {
  return toLocalDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function today() {
  // `new Date().toISOString().slice(0, 10)` breaks for "today" specifically
  // between local midnight and local-midnight-in-UTC (e.g. 00:00–05:29 IST)
  // — it silently shows yesterday's date during that window. Always read
  // the local calendar date instead.
  return toLocalDateStr(new Date());
}