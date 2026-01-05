const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Database adapter that works with both SQLite and PostgreSQL
class Database {
  constructor() {
    this.db = null;
    this.dbType = null;
  }

  async init() {
    // Check if PostgreSQL URL is provided (for Vercel/cloud deployment)
    if (process.env.DATABASE_URL) {
      console.log('Using PostgreSQL database');
      return this.initPostgres();
    } else {
      // On Vercel without DATABASE_URL, use /tmp (ephemeral storage)
      if (process.env.VERCEL) {
        console.warn('⚠️  WARNING: Using SQLite in /tmp directory on Vercel');
        console.warn('⚠️  Data will NOT persist across deployments or function restarts');
        console.warn('⚠️  For production, set up PostgreSQL and configure DATABASE_URL');
        console.warn('⚠️  See VERCEL_DEPLOYMENT.md for instructions');
      }
      console.log('Using SQLite database');
      return this.initSQLite();
    }
  }

  async initPostgres() {
    const { Pool } = require('pg');
    this.dbType = 'postgres';
    
    // Parse connection string or use individual params
    const connectionString = process.env.DATABASE_URL;
    
    this.db = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });

    try {
      await this.db.query('SELECT NOW()');
      console.log('Connected to PostgreSQL database');
      await this.createTablesPostgres();
      await this.createDefaultAdmin();
    } catch (err) {
      console.error('PostgreSQL connection error:', err);
      throw err;
    }
  }

  async initSQLite() {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const fs = require('fs');
    
    this.dbType = 'sqlite';
    
    // Use /tmp directory on Vercel (ephemeral), otherwise use data directory
    let dbPath;
    if (process.env.VERCEL && !process.env.DB_PATH) {
      dbPath = '/tmp/portal.db';
    } else {
      dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/portal.db');
    }
    
    // Create data directory if it doesn't exist (skip for /tmp which always exists)
    const dataDir = path.dirname(dbPath);
    if (dataDir !== '/tmp' && !fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, async (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          await this.createTablesSQLite();
          await this.createDefaultAdmin();
          resolve();
        }
      });
    });
  }

  async createTablesPostgres() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        is_approved INTEGER DEFAULT 0,
        hackclub_id TEXT UNIQUE,
        google_id TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS shoot_schedules (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        time TEXT NOT NULL,
        location TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS schedule_actors (
        id SERIAL PRIMARY KEY,
        schedule_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        character_name TEXT,
        FOREIGN KEY (schedule_id) REFERENCES shoot_schedules(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS scripts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS lines_to_learn (
        id SERIAL PRIMARY KEY,
        schedule_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        scene_number TEXT,
        lines TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (schedule_id) REFERENCES shoot_schedules(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        file_path TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        uploaded_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )`
    ];

    for (const table of tables) {
      await this.db.query(table);
    }
  }

  async createTablesSQLite() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        is_approved INTEGER DEFAULT 0,
        hackclub_id TEXT UNIQUE,
        google_id TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )`,
      `CREATE TABLE IF NOT EXISTS shoot_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        time TEXT NOT NULL,
        location TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS schedule_actors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        character_name TEXT,
        FOREIGN KEY (schedule_id) REFERENCES shoot_schedules(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS scripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS lines_to_learn (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        scene_number TEXT,
        lines TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (schedule_id) REFERENCES shoot_schedules(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      `CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        file_path TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        uploaded_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }
  }

  async createDefaultAdmin() {
    try {
      const adminExists = await this.get('SELECT id FROM users WHERE role = ?', ['admin']);
      if (!adminExists) {
        // Check if admin credentials are provided via environment variables
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@canaryfilms.org';
        const adminPassword = process.env.ADMIN_PASSWORD;
        
        let password;
        let hashedPassword;
        
        if (adminPassword) {
          // Use the password from environment variable
          password = adminPassword;
          hashedPassword = await bcrypt.hash(adminPassword, 10);
          console.log('\n╔═══════════════════════════════════════════════════════╗');
          console.log('║       ADMIN ACCOUNT CREATED                          ║');
          console.log('╠═══════════════════════════════════════════════════════╣');
          console.log(`║  Email:    ${adminEmail.padEnd(41, ' ')}║`);
          console.log('║  Password: (configured via environment variable)     ║');
          console.log('╚═══════════════════════════════════════════════════════╝\n');
        } else {
          // Generate a random password for the default admin
          password = crypto.randomBytes(16).toString('hex');
          hashedPassword = await bcrypt.hash(password, 10);
          console.log('\n╔═══════════════════════════════════════════════════════╗');
          console.log('║       DEFAULT ADMIN ACCOUNT CREATED                  ║');
          console.log('╠═══════════════════════════════════════════════════════╣');
          console.log(`║  Email:    ${adminEmail.padEnd(41, ' ')}║`);
          console.log(`║  Password: ${password.padEnd(41, ' ')}║`);
          console.log('╠═══════════════════════════════════════════════════════╣');
          console.log('║  ⚠️  SAVE THIS PASSWORD - IT WILL NOT BE SHOWN AGAIN  ║');
          console.log('║  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGIN    ║');
          console.log('║  ⚠️  CLEAR YOUR TERMINAL/LOGS AFTER SAVING PASSWORD  ║');
          console.log('╚═══════════════════════════════════════════════════════╝\n');
        }
        
        await this.run(
          'INSERT INTO users (email, password_hash, name, role, is_approved) VALUES (?, ?, ?, ?, ?)',
          [adminEmail, hashedPassword, 'Admin', 'admin', 1]
        );
      }
    } catch (err) {
      console.error('Error creating default admin:', err);
    }
  }

  // Unified query methods that work with both databases
  async run(sql, params = []) {
    if (this.dbType === 'postgres') {
      // Convert ? placeholders to $1, $2, etc. for PostgreSQL
      let paramIndex = 1;
      const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      const result = await this.db.query(pgSql, params);
      return { lastID: result.rows[0]?.id, changes: result.rowCount };
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve(this);
        });
      });
    }
  }

  async get(sql, params = []) {
    if (this.dbType === 'postgres') {
      // Convert ? to $1, $2, etc. for PostgreSQL
      let paramIndex = 1;
      const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      const result = await this.db.query(pgSql, params);
      return result.rows[0] || null;
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }
  }

  async all(sql, params = []) {
    if (this.dbType === 'postgres') {
      // Convert ? to $1, $2, etc. for PostgreSQL
      let paramIndex = 1;
      const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      const result = await this.db.query(pgSql, params);
      return result.rows;
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  }

  async close() {
    if (this.dbType === 'postgres') {
      await this.db.end();
    } else {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }
}

module.exports = new Database();
