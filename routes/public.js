// routes/public.js
const express = require('express');
const router = express.Router();
const { Invoice, Customer, Business, InvoiceItem } = require('../lib/mongodb');

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
router.get('/i/:publicId', async (req, res) => {
  try {
    const inv = await Invoice.findOne({ public_id: req.params.publicId })
      .populate('customer_id', 'name name_ne address phone pan')
      .populate('business_id', 'business_name business_name_ne address pan phone logo_path footer_note');

    if (!inv) return res.status(404).render('error', { title: 'Not found', message: 'Invoice not found' });

    const items = await InvoiceItem.find({ invoice_id: inv._id });
    
    res.render('invoice-print', { 
      invoice: inv, 
      items, 
      isPublic: true, 
      title: inv.invoice_number 
    });
  } catch (error) {
    console.error('Public invoice error:', error);
    res.status(500).render('error', { title: 'Error', message: error.message });
  }
});

module.exports = router;
