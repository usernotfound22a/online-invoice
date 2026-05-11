// routes/products.js
const express = require('express');
const router = express.Router();
const db = require('../lib/db');

router.get('/', (req, res) => {
  const q = req.query.q || '';
  const cat = req.query.cat || '';
  const bid = req.session.user.id;
  let where = 'business_id = ?';
  let params = [bid];
  if (q) {
    where += ' AND (name LIKE ? OR name_ne LIKE ?)';
    params.push('%' + q + '%', '%' + q + '%');
  }
  if (cat) {
    where += ' AND category = ?';
    params.push(cat);
  }
  const products = db.prepare(`SELECT * FROM products WHERE ${where} ORDER BY name`).all(...params);
  const categories = db.prepare('SELECT DISTINCT category FROM products WHERE business_id = ? AND category IS NOT NULL').all(bid).map(r => r.category);
  res.render('products/list', { title: 'Products', products, q, cat, categories });
});

router.get('/new', (req, res) => {
  res.render('products/form', { title: 'New Product', product: {}, action: '/app/products' });
});

router.post('/', (req, res) => {
  const { name, name_ne, description, price, unit, category, vat_applicable, stock, low_stock_threshold, track_stock } = req.body;
  db.prepare(`
    INSERT INTO products (business_id, name, name_ne, description, price, unit, category, vat_applicable, stock, low_stock_threshold, track_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.session.user.id, name, name_ne || null, description || null,
    parseFloat(price) || 0, unit || 'pcs', category || null,
    vat_applicable ? 1 : 0, parseFloat(stock) || 0, parseFloat(low_stock_threshold) || 0,
    track_stock ? 1 : 0);
  req.session.flash = { type: 'success', msg: res.locals.t('created') };
  res.redirect('/app/products');
});

router.get('/:id/edit', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND business_id = ?')
    .get(req.params.id, req.session.user.id);
  if (!product) return res.redirect('/app/products');
  res.render('products/form', { title: 'Edit Product', product, action: `/app/products/${product.id}/edit` });
});

router.post('/:id/edit', (req, res) => {
  const { name, name_ne, description, price, unit, category, vat_applicable, stock, low_stock_threshold, track_stock } = req.body;
  db.prepare(`
    UPDATE products SET name=?, name_ne=?, description=?, price=?, unit=?, category=?,
      vat_applicable=?, stock=?, low_stock_threshold=?, track_stock=?
    WHERE id=? AND business_id=?
  `).run(name, name_ne || null, description || null, parseFloat(price) || 0,
    unit || 'pcs', category || null,
    vat_applicable ? 1 : 0, parseFloat(stock) || 0, parseFloat(low_stock_threshold) || 0,
    track_stock ? 1 : 0, req.params.id, req.session.user.id);
  req.session.flash = { type: 'success', msg: res.locals.t('updated') };
  res.redirect('/app/products');
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ? AND business_id = ?')
    .run(req.params.id, req.session.user.id);
  req.session.flash = { type: 'success', msg: res.locals.t('deleted') };
  res.redirect('/app/products');
});

// API for invoice form
router.get('/api/list', (req, res) => {
  const products = db.prepare(`
    SELECT id, name, name_ne, price, unit, vat_applicable
    FROM products WHERE business_id = ? ORDER BY name
  `).all(req.session.user.id);
  res.json(products);
});

module.exports = router;
