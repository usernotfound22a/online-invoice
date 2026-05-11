// routes/invoices.js
const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const db = require('../lib/db');

router.get('/', (req, res) => {
  const status = req.query.status || '';
  const bid = req.session.user.id;
  let where = 'i.business_id = ?';
  let params = [bid];
  if (status) {
    where += ' AND i.status = ?';
    params.push(status);
  }
  const invoices = db.prepare(`
    SELECT i.*, c.name AS customer_name
    FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id
    WHERE ${where}
    ORDER BY i.invoice_date DESC, i.id DESC
  `).all(...params);
  res.render('invoices/list', { title: 'Invoices', invoices, status });
});

router.get('/new', (req, res) => {
  const bid = req.session.user.id;
  const customers = db.prepare('SELECT * FROM customers WHERE business_id = ? ORDER BY name').all(bid);
  const products = db.prepare('SELECT * FROM products WHERE business_id = ? ORDER BY name').all(bid);
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(bid);

  // Generate next invoice number
  const count = db.prepare('SELECT COUNT(*) AS c FROM invoices WHERE business_id = ?').get(bid).c;
  const nextNum = `${business.invoice_prefix || 'INV'}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  res.render('invoices/form', {
    title: 'New Invoice',
    customers, products, business,
    invoice: {
      invoice_number: nextNum,
      invoice_date: new Date().toISOString().slice(0, 10),
      vat_rate: business.vat_rate || 13,
      apply_vat: 1,
      status: 'draft'
    },
    items: []
  });
});

router.post('/', (req, res) => {
  const bid = req.session.user.id;
  const { invoice_number, invoice_date, due_date, customer_id, buyer_name, buyer_address, buyer_pan, vat_rate, apply_vat, discount, status, payment_method, notes } = req.body;

  // Parse items
  const items = [];
  const itemDescs = [].concat(req.body.item_desc || []);
  const itemQtys = [].concat(req.body.item_qty || []);
  const itemRates = [].concat(req.body.item_rate || []);
  const itemProdIds = [].concat(req.body.item_product_id || []);

  for (let i = 0; i < itemDescs.length; i++) {
    if (!itemDescs[i]) continue;
    const q = parseFloat(itemQtys[i]) || 0;
    const r = parseFloat(itemRates[i]) || 0;
    items.push({
      description: itemDescs[i],
      quantity: q,
      rate: r,
      amount: q * r,
      product_id: itemProdIds[i] ? parseInt(itemProdIds[i]) : null
    });
  }

  const subtotal = items.reduce((s, it) => s + it.amount, 0);
  const discountAmt = parseFloat(discount) || 0;
  const afterDiscount = subtotal - discountAmt;
  const vRate = parseFloat(vat_rate) || 0;
  const applyV = apply_vat ? 1 : 0;
  const vatAmt = applyV ? afterDiscount * vRate / 100 : 0;
  const total = afterDiscount + vatAmt;

  const publicId = randomUUID();
  const paidAmount = (status === 'paid') ? total : 0;

  const result = db.prepare(`
    INSERT INTO invoices (business_id, customer_id, invoice_number, public_id, invoice_date, due_date, 
      buyer_name, buyer_address, buyer_pan, subtotal, discount, vat_rate, vat_amount, total, paid_amount, status, payment_method, notes, apply_vat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(bid, customer_id || null, invoice_number, publicId, invoice_date, due_date || null,
    buyer_name || null, buyer_address || null, buyer_pan || null, subtotal, discountAmt, vRate, vatAmt, total, paidAmount,
    status || 'draft', payment_method || null, notes || null, applyV);

  const invId = result.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO invoice_items (invoice_id, product_id, description, quantity, rate, amount)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  items.forEach(it => insertItem.run(invId, it.product_id, it.description, it.quantity, it.rate, it.amount));

  // Auto-decrement stock if paid
  if (status === 'paid') {
    items.forEach(it => {
      if (it.product_id) {
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND track_stock = 1')
          .run(it.quantity, it.product_id);
      }
    });
  }

  req.session.flash = { type: 'success', msg: res.locals.t('created') };
  res.redirect(`/app/invoices/${invId}`);
});

router.get('/:id', (req, res) => {
  const bid = req.session.user.id;
  const inv = db.prepare(`
    SELECT i.*, c.name AS customer_name, c.name_ne AS customer_name_ne,
           c.address AS customer_address, c.phone AS customer_phone, c.pan AS customer_pan,
           b.business_name, b.business_name_ne, b.address AS business_address,
           b.pan AS business_pan, b.phone AS business_phone, b.logo_path, b.footer_note
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    JOIN businesses b ON i.business_id = b.id
    WHERE i.id = ? AND i.business_id = ?
  `).get(req.params.id, bid);

  if (!inv) return res.redirect('/app/invoices');
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
  res.render('invoices/view', { title: inv.invoice_number, invoice: inv, items });
});

router.get('/:id/print', (req, res) => {
  const bid = req.session.user.id;
  const inv = db.prepare(`
    SELECT i.*, c.name AS customer_name, c.name_ne AS customer_name_ne,
           c.address AS customer_address, c.phone AS customer_phone, c.pan AS customer_pan,
           b.business_name, b.business_name_ne, b.address AS business_address,
           b.pan AS business_pan, b.phone AS business_phone, b.logo_path, b.footer_note
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    JOIN businesses b ON i.business_id = b.id
    WHERE i.id = ? AND i.business_id = ?
  `).get(req.params.id, bid);
  if (!inv) return res.redirect('/app/invoices');
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
  res.render('invoice-print', { invoice: inv, items, isPublic: false, title: inv.invoice_number });
});

router.post('/:id/payment', (req, res) => {
  const bid = req.session.user.id;
  const amount = parseFloat(req.body.amount) || 0;
  const method = req.body.method;
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ? AND business_id = ?').get(req.params.id, bid);
  if (!inv) return res.redirect('/app/invoices');
  const newPaid = inv.paid_amount + amount;
  let newStatus = inv.status;
  if (newPaid >= inv.total) newStatus = 'paid';
  else if (newPaid > 0) newStatus = 'partial';
  db.prepare('UPDATE invoices SET paid_amount = ?, status = ?, payment_method = ? WHERE id = ?')
    .run(newPaid, newStatus, method, inv.id);
  req.session.flash = { type: 'success', msg: 'Payment recorded' };
  res.redirect(`/app/invoices/${inv.id}`);
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM invoices WHERE id = ? AND business_id = ?')
    .run(req.params.id, req.session.user.id);
  req.session.flash = { type: 'success', msg: res.locals.t('deleted') };
  res.redirect('/app/invoices');
});

router.post('/:id/update-buyer', (req, res) => {
  const bid = req.session.user.id;
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ? AND business_id = ?').get(req.params.id, bid);
  if (!inv) {
    return res.json({ success: false, error: 'Invoice not found' });
  }
  
  const { buyer_name, buyer_address, buyer_pan } = req.body;
  const updateFields = [];
  const updateVals = [];
  
  if (buyer_name !== undefined) {
    updateFields.push('buyer_name = ?');
    updateVals.push(buyer_name || null);
  }
  if (buyer_address !== undefined) {
    updateFields.push('buyer_address = ?');
    updateVals.push(buyer_address || null);
  }
  if (buyer_pan !== undefined) {
    updateFields.push('buyer_pan = ?');
    updateVals.push(buyer_pan || null);
  }
  
  if (updateFields.length === 0) {
    return res.json({ success: false, error: 'No fields to update' });
  }
  
  updateVals.push(inv.id);
  db.prepare(`UPDATE invoices SET ${updateFields.join(', ')} WHERE id = ?`)
    .run(...updateVals);
  
  res.json({ success: true, msg: 'Buyer information updated' });
});

module.exports = router;
