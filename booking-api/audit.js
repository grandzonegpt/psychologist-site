// Append-only event log: every state-changing action gets one JSON line in
// audit.log under BOOKING_DATA_DIR. Lets the operator answer "what happened
// with this booking" after the fact without combing Stripe and Google logs.
//
// Format: { ts, action, ...details }. Stay flat; no nested objects in details.

const fs = require('fs');
const dataDir = require('./dataDir');

const AUDIT_FILE = dataDir.path('audit.log');
const MAX_TAIL = 200;

function log(action, details) {
  const ts = new Date().toISOString();
  const safe = {};
  if (details) {
    for (const k of Object.keys(details)) {
      const v = details[k];
      if (v === null || v === undefined) continue;
      if (typeof v === 'object') continue;
      safe[k] = String(v).slice(0, 200);
    }
  }
  const line = JSON.stringify({ ts, action, ...safe });
  try {
    fs.appendFileSync(AUDIT_FILE, line + '\n');
  } catch (e) {
    console.error('Audit append failed:', e.message);
  }
}

function tail(n = 20) {
  if (n > MAX_TAIL) n = MAX_TAIL;
  try {
    if (!fs.existsSync(AUDIT_FILE)) return [];
    const data = fs.readFileSync(AUDIT_FILE, 'utf8');
    const lines = data.split('\n').filter(Boolean);
    return lines.slice(-n).map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch (e) {
    console.error('Audit read failed:', e.message);
    return [];
  }
}

module.exports = { log, tail, AUDIT_FILE };
