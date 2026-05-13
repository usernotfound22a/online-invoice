// init-db-indexes.js - Create optimal indexes for performance
const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Business indexes
    console.log('\n📊 Creating Business indexes...');
    await db.collection('businesses').createIndex({ email: 1 }, { unique: true });
    await db.collection('businesses').createIndex({ business_name: 1 });
    await db.collection('businesses').createIndex({ created_at: -1 });
    
    // Customer indexes
    console.log('📊 Creating Customer indexes...');
    await db.collection('customers').createIndex({ business_id: 1 });
    await db.collection('customers').createIndex({ business_id: 1, name: 1 });
    await db.collection('customers').createIndex({ business_id: 1, email: 1 });
    await db.collection('customers').createIndex({ business_id: 1, phone: 1 });
    await db.collection('customers').createIndex({ name: 'text', address: 'text' }); // Text search
    
    // Product indexes
    console.log('📊 Creating Product indexes...');
    await db.collection('products').createIndex({ business_id: 1 });
    await db.collection('products').createIndex({ business_id: 1, name: 1 });
    await db.collection('products').createIndex({ business_id: 1, sku: 1 });
    await db.collection('products').createIndex({ name: 'text', description: 'text' }); // Text search
    await db.collection('products').createIndex({ created_at: -1 });
    
    // Invoice indexes
    console.log('📊 Creating Invoice indexes...');
    await db.collection('invoices').createIndex({ business_id: 1 });
    await db.collection('invoices').createIndex({ business_id: 1, status: 1 });
    await db.collection('invoices').createIndex({ business_id: 1, invoice_date: -1 });
    await db.collection('invoices').createIndex({ business_id: 1, customer_id: 1 });
    await db.collection('invoices').createIndex({ invoice_number: 1, business_id: 1 }, { unique: true });
    await db.collection('invoices').createIndex({ created_at: -1 });
    await db.collection('invoices').createIndex({ business_id: 1, status: 1, created_at: -1 }); // Compound for filtering
    
    // InvoiceItem indexes
    console.log('📊 Creating InvoiceItem indexes...');
    await db.collection('invoiceitems').createIndex({ invoice_id: 1 });
    await db.collection('invoiceitems').createIndex({ product_id: 1 });
    await db.collection('invoiceitems').createIndex({ invoice_id: 1, product_id: 1 });
    
    // Session indexes (if using MongoDB session store)
    console.log('📊 Creating Session indexes...');
    await db.collection('sessions').createIndex({ 'session.lastActivity': 1 }, { expireAfterSeconds: 604800 }); // 7 days
    
    console.log('\n✅ All indexes created successfully!');
    console.log('📈 Database is now optimized for performance');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
