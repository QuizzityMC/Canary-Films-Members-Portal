const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/portal.db');

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, async (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          await this.createTables();
          await this.createDefaultAdmin();
          resolve();
        }
      });
    });
  }

  async createTables() {
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
        // Generate a random password for the default admin
        const crypto = require('crypto');
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        await this.run(
          'INSERT INTO users (email, password_hash, name, role, is_approved) VALUES (?, ?, ?, ?, ?)',
          ['admin@canaryfilms.org', hashedPassword, 'Admin', 'admin', 1]
        );
        console.log('\n╔═══════════════════════════════════════════════════════╗');
        console.log('║       DEFAULT ADMIN ACCOUNT CREATED                  ║');
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log('║  Email:    admin@canaryfilms.org                     ║');
        console.log(`║  Password: ${randomPassword.padEnd(41, ' ')}║`);
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log('║  ⚠️  SAVE THIS PASSWORD - IT WILL NOT BE SHOWN AGAIN  ║');
        console.log('║  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGIN    ║');
        console.log('╚═══════════════════════════════════════════════════════╝\n');
      }
    } catch (err) {
      console.error('Error creating default admin:', err);
    }
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = new Database();
