const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// This creates a physical file named 'app.db' in your data folder
const dbPath = path.join(__dirname, 'database.db');
const db = new DatabaseSync(dbPath);

// Initialize your tables
db.exec(`
  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

module.exports = db;