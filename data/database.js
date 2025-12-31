const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// This creates a physical file named 'app.db' in your data folder
const dbPath = path.join(__dirname, 'database.db');
const db = new DatabaseSync(dbPath);

// Initialize your tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  );
`);

module.exports = db;