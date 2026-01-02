const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

let db;

try {
  // Ensure data directory exists
  const dataDir = __dirname;
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // This creates a physical file named 'database.db' in your data folder
  const dbPath = path.join(dataDir, 'database.db');
  db = new DatabaseSync(dbPath);

  // Initialize your tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS shopping_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item TEXT NOT NULL,
      quantity TEXT NOT NULL,
      store TEXT NOT NULL,
      checked BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  console.log('Database initialized successfully');
} catch (error) {
  console.error('Failed to initialize database:', error.message);
  console.error('Please check file permissions and disk space');
  process.exit(1);
}

module.exports = db;