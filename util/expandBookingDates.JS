// utils/expandBookingDates.js
const MAX_OCCURRENCES = 100;

function pad2(n){ return String(n).padStart(2,'0'); }

function isValidIsoDate(s){
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
}

function normalizeTimeToHHMMSS(t){
  if (/\b(AM|PM)\b/i.test(t)) throw new Error('AM/PM not supported; send 24h format');
  const parts = t.split(':').map(p => p.trim());
  if (parts.length < 2) throw new Error(`Invalid time: ${t}`);
  const h = Number(parts[0]), m = Number(parts[1]), s = Number(parts[2] || 0);
  if ([h,m,s].some(Number.isNaN)) throw new Error(`Invalid time: ${t}`);
  if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) throw new Error(`Invalid time: ${t}`);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function toDate(iso){ const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d); }
function iso(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function addDays(d,n){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()+n); }
function addWeeks(d,n){ return addDays(d, n*7); }
function addMonthsSkipInvalid(d,n){
  const y = d.getFullYear(), m = d.getMonth();
  const target = new Date(y, m+n, d.getDate());
  if ((target.getMonth() + 12) % 12 !== (m+n) % 12) return null;
  return target;
}

function expandRecDaily(rs, re, st, et, out){
  let cur = toDate(rs), end = toDate(re), c = 0;
  while (cur <= end){ out.push({date: iso(cur), startTime: st, endTime: et}); if(++c>MAX_OCCURRENCES) throw new Error('Too many daily occurrences'); cur = addDays(cur,1); }
}
function expandRecWeekly(rs, re, st, et, out){
  let cur = toDate(rs), end = toDate(re), c = 0;
  while (cur <= end){ out.push({date: iso(cur), startTime: st, endTime: et}); if(++c>MAX_OCCURRENCES) throw new Error('Too many weekly occurrences'); cur = addWeeks(cur,1); }
}
function expandRecMonthly(rs, re, st, et, out){
  let cur = toDate(rs), end = toDate(re), c = 0;
  while (cur <= end){
    const next = c===0 ? cur : addMonthsSkipInvalid(cur,1);
    if (!next){ cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1); continue; }
    out.push({date: iso(next), startTime: st, endTime: et}); if(++c>MAX_OCCURRENCES) throw new Error('Too many monthly occurrences'); cur = next;
  }
}

function expandBookingDates(dates){
  if (!Array.isArray(dates) || dates.length === 0) throw new Error('At least one booking date is required');

  const out = [];
  for (const item of dates){
    if (!item.kind){
      const date = String(item.date||'').trim();
      const st = normalizeTimeToHHMMSS(String(item.startTime||'').trim());
      const et = normalizeTimeToHHMMSS(String(item.endTime||'').trim());
      if (!isValidIsoDate(date)) throw new Error(`Invalid date: ${date}`);
      if (et <= st) throw new Error('endTime must be after startTime');
      out.push({date, startTime: st, endTime: et});
      continue;
    }

    if (item.kind === 'exact'){
      const date = String(item.date||'').trim();
      const st = normalizeTimeToHHMMSS(String(item.startTime||'').trim());
      const et = normalizeTimeToHHMMSS(String(item.endTime||'').trim());
      if (!isValidIsoDate(date)) throw new Error(`Invalid date: ${date}`);
      if (et <= st) throw new Error('endTime must be after startTime');
      out.push({date, startTime: st, endTime: et});
      continue;
    }

    if (item.kind === 'rec'){
      const mode = item.mode;
      const rs = String(item.rangeStart||'').trim();
      const re = String(item.rangeEnd||'').trim();
      const st = normalizeTimeToHHMMSS(String(item.startTime||'').trim());
      const et = normalizeTimeToHHMMSS(String(item.endTime||'').trim());
      if (!isValidIsoDate(rs) || !isValidIsoDate(re)) throw new Error('Invalid recurrence range dates');
      if (toDate(re) < toDate(rs)) throw new Error('rangeEnd must be on/after rangeStart');
      if (et <= st) throw new Error('endTime must be after startTime');

      if (mode === 'daily')   expandRecDaily(rs, re, st, et, out);
      else if (mode === 'weekly')  expandRecWeekly(rs, re, st, et, out);
      else if (mode === 'monthly') expandRecMonthly(rs, re, st, et, out);
      else throw new Error(`Unsupported recurrence mode: ${mode}`);
      continue;
    }

    throw new Error('Invalid dates payload item');
  }

  const seen = new Set(); const dedup = [];
  for (const r of out){ const k = `${r.date}|${r.startTime}|${r.endTime}`; if (!seen.has(k)){ seen.add(k); dedup.push(r); } }
  if (dedup.length > MAX_OCCURRENCES) throw new Error(`Too many total occurrences (>${MAX_OCCURRENCES})`);
  return dedup;
}

module.exports = { expandBookingDates };
