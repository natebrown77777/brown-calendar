/* Brown Calendar core: dates, tasks and reminders. Shared by the app page and the service worker. */
const MONTHS = ["Peter","Andrew","James","John","Philip","Bartholomew","Thomas","Matthew","Jamalpha","Thaddeus","Simon","Matthias","Stephen"];
const WEEK = ["Lightday","Skyday","Treeday","Starday","Animalday","Humanday","Restday"];
const SHORT = ["Lig","Sky","Tre","Sta","Ani","Hum","Res"];
const FIRST = "1st Day of the Year", LEAP = "Leap Day";
const MAX_NOTE = 5000, MAX_REM = 7;

/* ---------- date arithmetic (days since 1970-01-01, proleptic Gregorian) ---------- */
function daysFromCivil(y, m, d){
  y -= (m <= 2 ? 1 : 0);
  const era = Math.floor(y / 400), yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}
function civilFromDays(z){
  z += 719468;
  const era = Math.floor(z / 146097), doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { y: yoe + era * 400 + (m <= 2 ? 1 : 0), m, d };
}
const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const yearStart = Y => daysFromCivil(Y - 1, 12, 25);
// Brown date: {y, m, d}; m = 0 → 1st Day of the Year, 1..13 → months, 14 → Leap Day (d = 1 for special days)
function toAbs(b){
  const s = yearStart(b.y);
  if (b.m === 0) return s;
  if (b.m === 14) return s + 365;
  return s + 1 + (b.m - 1) * 28 + (b.d - 1);
}
function fromAbs(a){
  const c = civilFromDays(a);
  const Y = (c.m === 12 && c.d >= 25) ? c.y + 1 : c.y;
  const doy = a - yearStart(Y);
  if (doy === 0) return { y: Y, m: 0, d: 1 };
  if (doy >= 365) return { y: Y, m: 14, d: 1 };
  return { y: Y, m: Math.floor((doy - 1) / 28) + 1, d: (doy - 1) % 28 + 1 };
}
const regular = b => b.m >= 1 && b.m <= 13;
const validBrown = b => b.m === 0 || (b.m === 14 && isLeap(b.y)) || (regular(b) && b.d >= 1 && b.d <= 28);
const weekIdx = b => (b.y - 1) * 364 + (b.m - 1) * 28 + (b.d - 1);
function fromWeekIdx(w){ const y = Math.floor(w / 364) + 1, r = w - (y - 1) * 364; return { y, m: Math.floor(r / 28) + 1, d: r % 28 + 1 }; }
const monthIdx = b => (b.y - 1) * 13 + (b.m - 1);
function fromMonthIdx(mi, d){ const y = Math.floor(mi / 13) + 1; return { y, m: mi - (y - 1) * 13 + 1, d }; }
const mod = (a, n) => ((a % n) + n) % n;
const keyOf = b => `${b.y}.${b.m}.${b.d}`;
const sameB = (a, b) => a.y === b.y && a.m === b.m && a.d === b.d;

function brownName(b, withYear = true){
  const base = b.m === 0 ? FIRST : b.m === 14 ? LEAP : `${MONTHS[b.m - 1]} ${b.d}`;
  return withYear ? `${base}, ${b.y}` : base;
}
function weekdayOf(b){ return regular(b) ? WEEK[(b.d - 1) % 7] : "Outside the week"; }
function gregFmt(a, opts){ return new Date(a * 86400000).toLocaleDateString(undefined, Object.assign({ timeZone: "UTC" }, opts)); }
const gregLong = a => gregFmt(a, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const gregShort = a => gregFmt(a, { month: "short", day: "numeric" });
const gregMed = a => gregFmt(a, { month: "short", day: "numeric", year: "numeric" });
function todayAbs(){ const n = new Date(); return daysFromCivil(n.getFullYear(), n.getMonth() + 1, n.getDate()); }

/* ---------- tasks ---------- */
function occursOn(t, b){
  const s = t.start, a = toAbs(b), as = toAbs(s);
  if (a < as) return false;
  if (!t.repeat) return a === as;
  const n = Math.max(1, t.every | 0);
  switch (t.unit){
    case "day": return (a - as) % n === 0;
    case "week":
      if (regular(s)) return regular(b) && (weekIdx(b) - weekIdx(s)) % (7 * n) === 0;
      return (a - as) % (7 * n) === 0;
    case "month":
      if (regular(s)) return regular(b) && b.d === s.d && (monthIdx(b) - monthIdx(s)) % n === 0;
      return b.m === s.m && (b.y - s.y) % n === 0;
    case "year": return b.m === s.m && b.d === s.d && (b.y - s.y) % n === 0;
  }
  return false;
}
function addOffset(b, n, unit){
  switch (unit){
    case "day": return fromAbs(toAbs(b) + n);
    case "week": return regular(b) ? fromWeekIdx(weekIdx(b) + 7 * n) : fromAbs(toAbs(b) + 7 * n);
    case "month": return regular(b) ? fromMonthIdx(monthIdx(b) + n, b.d) : fromAbs(toAbs(b) + 28 * n);
    case "year": { const t = { y: b.y + n, m: b.m, d: b.d }; return validBrown(t) ? t : null; }
  }
  return null;
}
const plural = (n, u) => `${n} ${u}${n === 1 ? "" : "s"}`;
function repeatText(t){ if (!t.repeat) return "Once"; const n = Math.max(1, t.every | 0); return n === 1 ? `Every ${t.unit}` : `Every ${plural(n, t.unit)}`; }
function remText(r){ return r.n === 0 ? "on the day" : `${plural(r.n, r.unit)} before`; }


/* ---------- reminders due on a day ---------- */
function dueOn(tasks, day){
  const out = [];
  Object.values(tasks || {}).forEach(t => {
    if (!t || !t.notify || !t.reminders) return;
    t.reminders.forEach((r, i) => {
      const target = addOffset(day, r.n, r.unit);
      if (target && occursOn(t, target)) out.push({ t, r, target, key: `${t.id}|${i}|${toAbs(target)}` });
    });
  });
  return out;
}
function reminderText(x){
  return x.r.n === 0 ? `${x.t.name} is today` : `${x.t.name} · ${brownName(x.target)} (in ${plural(x.r.n, x.r.unit)})`;
}

/* ---------- tiny IndexedDB key/value store (readable by the service worker) ---------- */
function idbOpen(){
  return new Promise((res, rej) => {
    const r = indexedDB.open("brown-calendar", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbGet(k){
  const db = await idbOpen();
  return new Promise((res, rej) => { const q = db.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
async function idbSet(k, v){
  const db = await idbOpen();
  return new Promise((res, rej) => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}

/* Show each due reminder once per day, using whatever "show" function the caller passes. */
async function notifyDue(tasks, show){
  const today = fromAbs(todayAbs()), now = Date.now();
  let shown = {};
  try { shown = (await idbGet("shown")) || {}; } catch (e) {}
  let changed = false;
  for (const x of dueOn(tasks, today)){
    if (shown[x.key]) continue;
    try { await show(x); shown[x.key] = now; changed = true; } catch (e) {}
  }
  for (const k in shown) if (now - shown[k] > 120 * 86400000){ delete shown[k]; changed = true; }
  if (changed) { try { await idbSet("shown", shown); } catch (e) {} }
}
