// routes/customers.js
const express = require('express');
const router = express.Router();
const db = require('../lib/db');

router.get('/', (req, res) => {
  const q = req.query.q || '';
  const bid = req.session.user.id;
  let customers;
  if (q) {
    const like = '%' + q + '%';
    customers = db.prepare(`
      SELECT * FROM customers WHERE business_id = ?
        AND (name LIKE ? OR name_ne LIKE ? OR phone LIKE ? OR pan LIKE ?)
      ORDER BY name
    `).all(bid, like, like, like, like);
  } else {
    customers = db.prepare('SELECT * FROM customers WHERE business_id = ? ORDER BY name').all(bid);
  }
  res.render('customers/list', { title: 'Customers', customers, q });
});

router.get('/new', (req, res) => {
  res.render('customers/form', { title: 'New Customer', customer: {}, action: '/app/customers' });
});

router.post('/', (req, res) => {
  const { name, name_ne, address, phone, email, pan, notes } = req.body;
  db.prepare(`
    INSERT INTO customers (business_id, name, name_ne, address, phone, email, pan, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.session.user.id, name, name_ne || null, address || null, phone || null, email || null, pan || null, notes || null);
  req.session.flash = { type: 'success', msg: res.locals.t('created') };
  res.redirect('/app/customers');
});

router.get('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?')
    .get(req.params.id, req.session.user.id);
  if (!customer) return res.redirect('/app/customers');
  const invoices = db.prepare(`
    SELECT * FROM invoices WHERE customer_id = ? AND business_id = ?
    ORDER BY invoice_date DESC
  `).all(req.params.id, req.session.user.id);
  const stats = db.prepare(`
    SELECT
      COALESCE(SUM(total), 0) AS billed,
      COALESCE(SUM(paid_amount), 0) AS paid,
      COALESCE(SUM(total - paid_amount), 0) AS outstanding
    FROM invoices WHERE customer_id = ? AND business_id = ? AND status != 'cancelled'
  `).get(req.params.id, req.session.user.id);
  res.render('customers/view', { title: customer.name, customer, invoices, stats });
});

router.get('/:id/edit', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?')
    .get(req.params.id, req.session.user.id);
  if (!customer) return res.redirect('/app/customers');
  res.render('customers/form', { title: 'Edit', customer, action: `/app/customers/${customer.id}/edit` });
});

router.post('/:id/edit', (req, res) => {
  const { name, name_ne, address, phone, email, pan, notes } = req.body;
  db.prepare(`
    UPDATE customers SET name=?, name_ne=?, address=?, phone=?, email=?, pan=?, notes=?
    WHERE id=? AND business_id=?
  `).run(name, name_ne || null, address || null, phone || null, email || null, pan || null, notes || null,
    req.params.id, req.session.user.id);
  req.session.flash = { type: 'success', msg: res.locals.t('updated') };
  res.redirect('/app/customers');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ? AND business_id = ?')
    .run(req.params.id, req.session.user.id);
  req.session.flash = { type: 'success', msg: res.locals.t('deleted') };
  res.redirect('/app/customers');
});

module.exports = router;
