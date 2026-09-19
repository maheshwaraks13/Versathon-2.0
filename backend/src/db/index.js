import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_TYPE = process.env.DB_TYPE || 'sqlite';
const SQLITE_FILE = process.env.SQLITE_FILE || path.join(__dirname, '../../medclear.sqlite');

/**
 * Database Abstraction Layer to easily swap between SQLite and PostgreSQL
 */
class SqliteAdapter {
  constructor(filePath) {
    this.filePath = filePath;
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.filePath, (err) => {
        if (err) {
          console.error('[DB] SQLite Connection Error:', err);
          return reject(err);
        }
        console.log(`[DB] Connected to SQLite database at ${this.filePath}`);
        resolve();
      });
    });
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async execute(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async initSchema() {
    const createReportsTable = `
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_text TEXT NOT NULL,
        extracted_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await this.execute(createReportsTable);

    // Ensure extracted_json column exists if DB was already created in Stage 1
    try {
      await this.execute(`ALTER TABLE reports ADD COLUMN extracted_json TEXT;`);
    } catch (e) {
      // Column already exists, ignore error
    }

    console.log('[DB] Reports table initialized with extracted_json support.');
  }
}

/**
 * Placeholder for future PostgresAdapter implementation
 */
class PostgresAdapter {
  constructor(connectionString) {
    this.connectionString = connectionString;
  }

  async connect() {
    console.log('[DB] Postgres adapter ready for setup when DB_TYPE=postgres');
  }

  async query(sql, params = []) {
    throw new Error('PostgreSQL driver not installed yet. Set DB_TYPE=sqlite for now.');
  }

  async execute(sql, params = []) {
    throw new Error('PostgreSQL driver not installed yet. Set DB_TYPE=sqlite for now.');
  }

  async initSchema() {
    // Future postgres migration scripts here
  }
}

// Instantiate the active adapter based on environment configuration
let dbAdapter;
if (DB_TYPE === 'postgres') {
  dbAdapter = new PostgresAdapter(process.env.DATABASE_URL);
} else {
  dbAdapter = new SqliteAdapter(SQLITE_FILE);
}

export default dbAdapter;
