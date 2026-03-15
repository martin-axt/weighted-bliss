import Database from 'better-sqlite3';

const db = new Database('weighted-bliss.db');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT,
    urgency INTEGER,
    mood INTEGER,
    time INTEGER,
    completed BOOLEAN,
    date TEXT,
    createdAt TEXT,
    sum INTEGER
  );

  CREATE TABLE IF NOT EXISTS deletedTasks (
    id TEXT PRIMARY KEY,
    name TEXT,
    urgency INTEGER,
    mood INTEGER,
    time INTEGER,
    completed BOOLEAN,
    date TEXT,
    createdAt TEXT,
    sum INTEGER
  );

  CREATE TABLE IF NOT EXISTS history (
    date TEXT PRIMARY KEY,
    weight INTEGER
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

export default db;
