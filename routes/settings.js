// routes/settings.js - MongoDB version
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { Business } = require('../lib/mongodb');

const upload = multer({
  dest: path.join(__dirname, '..', 'public', 'uploads'),
  limits: { fileSize: 2 * 1024 * 1024 }
});

router.get('/', async (req, res) => {
  try {
    const business = await Business.findById(req.session.user.id);
    res.render('settings', { title: 'Settings', business });
  } catch (error) {
    console.error('Settings load error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.post('/', upload.single('logo'), async (req, res) => {
  try {
    const { business_name, business_name_ne, address, pan, phone, vat_rate, invoice_prefix, footer_note } = req.body;
    
    const updateData = {
      business_name,
      business_name_ne: business_name_ne || null,
      address: address || null,
      pan: pan || null,
      phone: phone || null,
      vat_rate: parseFloat(vat_rate) || 13,
      invoice_prefix: invoice_prefix || 'INV',
      footer_note: footer_note || ''
    };
    
    if (req.file) {
      updateData.logo_path = '/uploads/' + req.file.filename;
    }
    
    await Business.updateOne(
      { _id: req.session.user.id },
      updateData
    );
    
    req.session.user.business_name = business_name;
    req.session.user.business_name_ne = business_name_ne;
    req.session.flash = { type: 'success', msg: res.locals.t('profile_updated') };
    res.redirect('/app/settings');
  } catch (error) {
    console.error('Settings update error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

module.exports = router;
