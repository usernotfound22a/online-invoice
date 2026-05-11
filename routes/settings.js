// routes/settings.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const db = require('../lib/db');

const upload = multer({
  dest: path.join(__dirname, '..', 'public', 'uploads'),
  limits: { fileSize: 2 * 1024 * 1024 }
});

router.get('/', (req, res) => {
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.session.user.id);
  res.render('settings', { title: 'Settings', business });
});

router.post('/', upload.single('logo'), (req, res) => {
  const { business_name, business_name_ne, address, pan, phone, vat_rate, invoice_prefix, footer_note } = req.body;
  let logoPath = null;
  if (req.file) {
    logoPath = '/uploads/' + req.file.filename;
  }
  if (logoPath) {
    db.prepare(`
      UPDATE businesses SET business_name=?, business_name_ne=?, address=?, pan=?, phone=?,
        vat_rate=?, invoice_prefix=?, footer_note=?, logo_path=? WHERE id=?
    `).run(business_name, business_name_ne || null, address || null, pan || null, phone || null,
      parseFloat(vat_rate) || 13, invoice_prefix || 'INV', footer_note || '', logoPath, req.session.user.id);
  } else {
    db.prepare(`
      UPDATE businesses SET business_name=?, business_name_ne=?, address=?, pan=?, phone=?,
        vat_rate=?, invoice_prefix=?, footer_note=? WHERE id=?
    `).run(business_name, business_name_ne || null, address || null, pan || null, phone || null,
      parseFloat(vat_rate) || 13, invoice_prefix || 'INV', footer_note || '', req.session.user.id);
  }
  req.session.user.business_name = business_name;
  req.session.user.business_name_ne = business_name_ne;
  req.session.flash = { type: 'success', msg: res.locals.t('profile_updated') };
  res.redirect('/app/settings');
});

module.exports = router;
