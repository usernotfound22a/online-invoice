// init-db.js — Create database tables and seed admin user
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('Creating tables...');

db.exec(`
CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_name_ne TEXT,
  address TEXT,
  pan TEXT,
  phone TEXT,
  logo_path TEXT,
  active INTEGER DEFAULT 1,
  is_admin INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  vat_rate REAL DEFAULT 13,
  invoice_prefix TEXT DEFAULT 'INV',
  footer_note TEXT DEFAULT 'Thank you for your business!',
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_ne TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  pan TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_ne TEXT,
  description TEXT,
  price REAL NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  category TEXT,
  vat_applicable INTEGER DEFAULT 1,
  stock REAL DEFAULT 0,
  low_stock_threshold REAL DEFAULT 5,
  track_stock INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  customer_id INTEGER,
  invoice_number TEXT NOT NULL,
  public_id TEXT UNIQUE NOT NULL,
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  buyer_name TEXT,
  buyer_address TEXT,
  buyer_pan TEXT,
  subtotal REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  vat_rate REAL DEFAULT 13,
  vat_amount REAL DEFAULT 0,
  total REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  payment_method TEXT,
  notes TEXT,
  apply_vat INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  product_id INTEGER,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  rate REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_public ON invoices(public_id);
CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id);
`);

console.log('Tables created.');

// Migrations - Add columns to existing tables if they don't exist
try {
  db.exec(`
    ALTER TABLE invoices ADD COLUMN buyer_name TEXT;
    ALTER TABLE invoices ADD COLUMN buyer_address TEXT;
    ALTER TABLE invoices ADD COLUMN buyer_pan TEXT;
  `);
  console.log('Migration: Added buyer fields to invoices table.');
} catch (err) {
  // Columns might already exist, that's fine
}

// Seed admin user
const adminExists = db.prepare('SELECT id FROM businesses WHERE email = ?').get('admin@pokhara.local');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin1234', 10);
  db.prepare(`
    INSERT INTO businesses (email, password, business_name, is_admin, active)
    VALUES (?, ?, ?, 1, 1)
  `).run('admin@pokhara.local', hash, 'System Admin');
  console.log('Admin user created: admin@pokhara.local / admin1234');
} else {
  console.log('Admin user already exists.');
}

// Seed demo business
const demoExists = db.prepare('SELECT id FROM businesses WHERE email = ?').get('demo@pokhara.local');
if (!demoExists) {
  const hash = bcrypt.hashSync('demo1234', 10);
  const result = db.prepare(`
    INSERT INTO businesses (email, password, business_name, business_name_ne, address, pan, phone, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    'demo@pokhara.local',
    hash,
    'Annapurna Traders Pvt. Ltd.',
    'अन्नपूर्ण ट्रेडर्स प्रा. लि.',
    'Lakeside, Pokhara-6, Kaski',
    '301234567',
    '+977 61-456789'
  );
  const bid = result.lastInsertRowid;

  // Sample customers
  const customers = [
    ['Himalayan Cafe', 'हिमालयन क्याफे', 'Damside, Pokhara', '+977-9846123456', null, '605432198'],
    ['Sunita Sharma', 'सुनिता शर्मा', 'Mahendrapul, Pokhara', '+977-9856234567', 'sunita@email.com', null],
    ['Lake View Hotel', 'लेक भ्यु होटल', 'Lakeside-6, Pokhara', '+977-61-465789', 'info@lakeview.np', '301987654'],
    ['Ramesh Gurung', null, 'Bagar, Pokhara', '+977-9866345678', null, null],
    ['Pokhara Bakery', 'पोखरा बेकरी', 'Chipledhunga, Pokhara', '+977-9876456789', null, '302345678']
  ];
  const insertCustomer = db.prepare(`
    INSERT INTO customers (business_id, name, name_ne, address, phone, email, pan)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  customers.forEach(c => insertCustomer.run(bid, ...c));

  // Sample products
  const products = [
    ['Basmati Rice 25kg', 'बासमती चामल २५ केजी', 'Premium long grain', 2800, 'kg', 'Grocery', 1, 50, 10],
    ['Cooking Oil 1L', 'खाने तेल १ लिटर', 'Sunflower oil', 320, 'ltr', 'Grocery', 1, 100, 20],
    ['Espresso Coffee', 'एस्प्रेसो कफी', 'Medium roast 250g', 850, 'pcs', 'F&B', 1, 30, 5],
    ['Momo Plate', 'मम प्लेट', 'Chicken/Veg 10pcs', 180, 'plate', 'F&B', 1, 0, 0],
    ['Milk Tea', 'दूध चिया', 'Nepali style', 50, 'cup', 'F&B', 0, 0, 0],
    ['Delivery Service', 'डेलिभरी सेवा', 'Within Pokhara valley', 300, 'service', 'Service', 1, 0, 0],
    ['Repair Hour', 'मर्मत प्रति घण्टा', 'Electronics repair', 500, 'hr', 'Service', 1, 0, 0],
    ['Salon Haircut', 'सैलुन कपाल काट्ने', 'Standard cut', 400, 'service', 'Service', 0, 0, 0],
    ['Mineral Water 1L', 'मिनरल वाटर १ लिटर', 'Bottled water', 35, 'ltr', 'Grocery', 1, 200, 30],
    ['Wai Wai Noodles', 'वाइ वाइ चाउचाउ', 'Pack of 30', 660, 'pcs', 'Grocery', 1, 25, 5],
    ['T-shirt Cotton', 'कटन टी-शर्ट', 'Various sizes', 800, 'pcs', 'Retail', 1, 40, 10],
    ['Mobile Charger', 'मोबाइल चार्जर', 'Type-C 18W', 650, 'pcs', 'Retail', 1, 15, 5]
  ];
  const insertProduct = db.prepare(`
    INSERT INTO products (business_id, name, name_ne, description, price, unit, category, vat_applicable, stock, low_stock_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  products.forEach(p => insertProduct.run(bid, ...p));

  // Sample invoices
  const { randomUUID } = require('crypto');
  const invoiceData = [
    { customer: 1, items: [[3, 5, 850], [4, 2, 180]], status: 'paid', method: 'eSewa', daysAgo: 2 },
    { customer: 2, items: [[1, 1, 2800], [2, 2, 320]], status: 'paid', method: 'Cash', daysAgo: 5 },
    { customer: 3, items: [[6, 3, 300], [3, 10, 850]], status: 'partial', method: 'Bank Transfer', daysAgo: 10 },
    { customer: 4, items: [[7, 4, 500]], status: 'sent', method: 'Credit', daysAgo: 15 },
    { customer: 5, items: [[9, 50, 35], [10, 5, 660]], status: 'paid', method: 'Khalti', daysAgo: 1 },
    { customer: 1, items: [[5, 20, 50], [4, 5, 180]], status: 'paid', method: 'Cash', daysAgo: 7 },
    { customer: 2, items: [[11, 2, 800], [12, 1, 650]], status: 'overdue', method: 'Credit', daysAgo: 45 },
    { customer: 3, items: [[8, 3, 400]], status: 'draft', method: null, daysAgo: 0 }
  ];

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (business_id, customer_id, invoice_number, public_id, invoice_date, due_date,
      subtotal, vat_rate, vat_amount, total, paid_amount, status, payment_method, apply_vat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO invoice_items (invoice_id, product_id, description, quantity, rate, amount)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const getProduct = db.prepare('SELECT name FROM products WHERE id = ?');

  invoiceData.forEach((inv, idx) => {
    const subtotal = inv.items.reduce((s, [, q, r]) => s + q * r, 0);
    const vatAmt = subtotal * 0.13;
    const total = subtotal + vatAmt;
    const paid = inv.status === 'paid' ? total : inv.status === 'partial' ? total / 2 : 0;
    const date = new Date(Date.now() - inv.daysAgo * 86400000).toISOString().slice(0, 10);
    const due = new Date(Date.now() - (inv.daysAgo - 15) * 86400000).toISOString().slice(0, 10);
    const num = `INV-2026-${String(idx + 1).padStart(4, '0')}`;
    const pid = randomUUID();
    const r = insertInvoice.run(bid, inv.customer + 0, num, pid, date, due,
      subtotal, 13, vatAmt, total, paid, inv.status, inv.method, 1);
    const invId = r.lastInsertRowid;
    inv.items.forEach(([prodOffset, q, rate]) => {
      const p = getProduct.get(prodOffset);
      const name = p ? p.name : 'Item';
      insertItem.run(invId, prodOffset, name, q, rate, q * rate);
    });
  });

  console.log('Demo business created: demo@pokhara.local / demo1234');
  console.log('  - 5 customers, 12 products, 8 invoices');
}

db.close();
console.log('\nDatabase ready at data/app.db');
console.log('\nLogin credentials:');
console.log('  Admin: admin@pokhara.local / admin1234');
console.log('  Demo:  demo@pokhara.local / demo1234');
