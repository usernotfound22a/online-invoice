// routes/public.js
const express = require('express');
const router = express.Router();
const db = require('../lib/db');

router.get('/', (req, res) => {
  if (req.session.user) {
    if (req.session.user.is_admin) return res.redirect('/admin');
    return res.redirect('/app');
  }
  res.render('landing', { title: 'Pokhara Invoice' });
});

router.get('/lang/:code', (req, res) => {
  const code = req.params.code === 'ne' ? 'ne' : 'en';
  req.session.lang = code;
  res.redirect(req.get('Referer') || '/');
});

// Public invoice view (shareable link)
router.get('/i/:publicId', (req, res) => {
  const inv = db.prepare(`
    SELECT i.*, c.name AS customer_name, c.name_ne AS customer_name_ne,
           c.address AS customer_address, c.phone AS customer_phone, c.pan AS customer_pan,
           b.business_name, b.business_name_ne, b.address AS business_address,
           b.pan AS business_pan, b.phone AS business_phone, b.logo_path, b.footer_note
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    JOIN businesses b ON i.business_id = b.id
    WHERE i.public_id = ?
  `).get(req.params.publicId);

  if (!inv) return res.status(404).render('error', { title: 'Not found', message: 'Invoice not found' });

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
  res.render('invoice-print', { invoice: inv, items, isPublic: true, title: inv.invoice_number });
});

module.exports = router;
