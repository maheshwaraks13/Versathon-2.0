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
    // Enable foreign keys
    await this.execute('PRAGMA foreign_keys = ON;');

    // Users table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await this.execute(createUsersTable);

    // Reports table
    const createReportsTable = `
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        report_date TEXT,
        raw_text TEXT NOT NULL,
        extracted_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;
    await this.execute(createReportsTable);

    // Ensure columns exist for existing tables
    try {
      await this.execute(`ALTER TABLE reports ADD COLUMN user_id INTEGER;`);
    } catch (e) {}
    try {
      await this.execute(`ALTER TABLE reports ADD COLUMN report_date TEXT;`);
    } catch (e) {}
    try {
      await this.execute(`ALTER TABLE reports ADD COLUMN extracted_json TEXT;`);
    } catch (e) {}

    // Normalized test_results table for time-series charts and queries
    const createTestResultsTable = `
      CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        test_name TEXT NOT NULL,
        test_name_clean TEXT NOT NULL,
        numeric_value REAL,
        raw_value TEXT NOT NULL,
        unit TEXT,
        reference_range TEXT,
        status TEXT,
        date TEXT NOT NULL,
        explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;
    await this.execute(createTestResultsTable);

    // Create performance indexes
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_test_results_user_test ON test_results(user_id, test_name_clean);`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_test_results_date ON test_results(user_id, date);`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);`);

    console.log('[DB] Database schema initialized with users, reports, and test_results.');
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
