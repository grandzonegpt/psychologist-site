// Persistent state location. Override via BOOKING_DATA_DIR env var (Railway,
// Fly, Render volume mount). Without override, falls back to booking-api/
// which is ephemeral on container redeploys: any schedule changes via the
// Telegram bot would be lost on every push to main.

const fs = require('fs');
const path = require('path');

const DIR = process.env.BOOKING_DATA_DIR || __dirname;

try {
  fs.mkdirSync(DIR, { recursive: true });
} catch (e) {
  // Existing dir or unwritable. Files-of-concern call sites log on real I/O.
}

if (process.env.BOOKING_DATA_DIR) {
  console.log(`Persistent data dir: ${DIR}`);
} else {
  console.warn(`Persistent data dir NOT configured. Using ${DIR}. ` +
    'Set BOOKING_DATA_DIR to a Railway volume mount to survive redeploys.');
}

module.exports = {
  dir: DIR,
  path: (filename) => path.join(DIR, filename)
};
