const fs = require('fs/promises');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'audit.log');

// Append one JSON line to logs/audit.log — never throws to the caller
async function appendToAuditLog(entry) {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });

    const line = JSON.stringify({
      ...entry,
      logged_at: new Date().toISOString(),
    });

    await fs.appendFile(LOG_FILE, `${line}\n`, 'utf8');
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
}

module.exports = {
  appendToAuditLog,
};
