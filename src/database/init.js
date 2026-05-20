const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config');

const dbPath = config.DATABASE_PATH;
const dbDir = path.dirname(dbPath);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;

const getDatabase = () => {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });
    db.configure('busyTimeout', 10000);
  }
  return db;
};

const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const getAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const initializeDatabase = async () => {
  try {
    // Create tables
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Chart of Accounts
      `CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        account_type TEXT NOT NULL,
        sub_type TEXT,
        opening_balance REAL DEFAULT 0,
        current_balance REAL DEFAULT 0,
        description TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Journal Entries
      `CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date DATE NOT NULL,
        reference_no TEXT UNIQUE,
        description TEXT,
        narration TEXT,
        total_debit REAL DEFAULT 0,
        total_credit REAL DEFAULT 0,
        status TEXT DEFAULT 'draft',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`,

      // Journal Entry Details
      `CREATE TABLE IF NOT EXISTS journal_entry_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        journal_entry_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        description TEXT,
        FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
        FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
      )`,

      // Products/Items
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        unit TEXT,
        purchase_price REAL,
        selling_price REAL,
        gst_rate REAL DEFAULT 18,
        hsn_code TEXT,
        stock_quantity REAL DEFAULT 0,
        min_stock_level REAL DEFAULT 0,
        reorder_quantity REAL DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Stock Ledger
      `CREATE TABLE IF NOT EXISTS stock_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        transaction_type TEXT NOT NULL,
        transaction_id TEXT,
        quantity REAL NOT NULL,
        reference_date DATE NOT NULL,
        reference_doc TEXT,
        narration TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`,

      // Parties (Customers/Suppliers)
      `CREATE TABLE IF NOT EXISTS parties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        party_type TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pin_code TEXT,
        tax_id TEXT,
        gstin TEXT,
        opening_balance REAL DEFAULT 0,
        credit_limit REAL DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Invoices
      `CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_no TEXT UNIQUE NOT NULL,
        invoice_date DATE NOT NULL,
        party_id INTEGER NOT NULL,
        party_type TEXT NOT NULL,
        invoice_type TEXT NOT NULL,
        reference_no TEXT,
        description TEXT,
        subtotal REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        sgst_amount REAL DEFAULT 0,
        cgst_amount REAL DEFAULT 0,
        igst_amount REAL DEFAULT 0,
        total_tax REAL DEFAULT 0,
        grand_total REAL DEFAULT 0,
        amount_paid REAL DEFAULT 0,
        status TEXT DEFAULT 'draft',
        payment_status TEXT DEFAULT 'unpaid',
        due_date DATE,
        notes TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (party_id) REFERENCES parties(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`,

      // Invoice Items
      `CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        rate REAL NOT NULL,
        line_amount REAL NOT NULL,
        discount_percent REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        gst_rate REAL,
        gst_amount REAL DEFAULT 0,
        net_amount REAL,
        hsn_code TEXT,
        description TEXT,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`,

      // Payments
      `CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_date DATE NOT NULL,
        party_id INTEGER NOT NULL,
        invoice_id INTEGER,
        payment_method TEXT NOT NULL,
        amount REAL NOT NULL,
        reference_no TEXT,
        notes TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (party_id) REFERENCES parties(id),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )`,

      // Settings
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await runAsync(table);
    }

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
};

const closeDatabase = () => {
  if (db) {
    db.close();
  }
};

module.exports = {
  getDatabase,
  runAsync,
  getAsync,
  allAsync,
  initializeDatabase,
  closeDatabase
};
