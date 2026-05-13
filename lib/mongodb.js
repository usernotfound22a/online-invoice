// lib/mongodb.js — MongoDB connection and models using Mongoose
const mongoose = require('mongoose');

// Connection
const mongoURL = process.env.MONGODB_URL || 'mongodb+srv://ghsarthak22_db_user:6884BZ2TPnktOVfj@cluster0.trteiqs.mongodb.net/pokhara_invoice?retryWrites=true&w=majority';

mongoose.connect(mongoURL)
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Schemas
const businessSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  business_name: { type: String, required: true },
  business_name_ne: String,
  address: String,
  pan: String,
  phone: String,
  logo_path: String,
  active: { type: Boolean, default: true },
  is_admin: { type: Boolean, default: false },
  language: { type: String, default: 'en' },
  vat_rate: { type: Number, default: 13 },
  invoice_prefix: { type: String, default: 'INV' },
  footer_note: { type: String, default: 'Thank you for your business!' },
  created_at: { type: Date, default: Date.now },
  last_login: Date
});

const customerSchema = new mongoose.Schema({
  business_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  name_ne: String,
  address: String,
  phone: String,
  email: String,
  pan: String,
  notes: String,
  created_at: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  business_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  name_ne: String,
  description: String,
  price: { type: Number, default: 0 },
  unit: { type: String, default: 'pcs' },
  category: String,
  vat_applicable: { type: Boolean, default: true },
  stock: { type: Number, default: 0 },
  low_stock_threshold: { type: Number, default: 5 },
  track_stock: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

const invoiceItemSchema = new mongoose.Schema({
  invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 }
});

const invoiceSchema = new mongoose.Schema({
  business_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  invoice_number: { type: String, required: true },
  public_id: { type: String, unique: true, required: true },
  invoice_date: { type: Date, required: true },
  due_date: Date,
  buyer_name: String,
  buyer_address: String,
  buyer_pan: String,
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  vat_rate: { type: Number, default: 13 },
  vat_amount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paid_amount: { type: Number, default: 0 },
  status: { type: String, default: 'draft' },
  payment_method: String,
  notes: String,
  apply_vat: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

// Models
const Business = mongoose.model('Business', businessSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Product = mongoose.model('Product', productSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);
const InvoiceItem = mongoose.model('InvoiceItem', invoiceItemSchema);

module.exports = {
  mongoose,
  Business,
  Customer,
  Product,
  Invoice,
  InvoiceItem
};
