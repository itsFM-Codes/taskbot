const fs = require('fs');
const path = require('path');

// Simple logger utility
// Exports: log(user, message, options)
// user: { id, username }
// message: string
// options: { toFile: boolean } - default: true

const LOG_DIR = path.join(__dirname, '..', 'logs');

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function dateFilename() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}.txt`;
}

function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to ensure log directory exists:', e);
  }
}

function formatLog(user, msg) {
  const id = user && user.id ? user.id : 'unknown-id';
  return `${timestamp()} - ${id} : ${msg}`;
}

function log(user, msg, options = {}) {
  const toFile = options.toFile !== undefined ? options.toFile : true; // default to file
  const line = formatLog(user, msg);
  console.log(line);
  if (toFile) {
    try {
      ensureLogDir();
      const file = path.join(LOG_DIR, dateFilename());
      fs.appendFileSync(file, line + '\n', { encoding: 'utf8' });
    } catch (e) {
      console.error('Failed to write log to file:', e);
    }
  }
}

module.exports = { log };
