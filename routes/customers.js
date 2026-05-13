// routes/customers.js - MongoDB version
const express = require('express');
const router = express.Router();
const { Customer, Invoice } = require('../lib/mongodb');
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
  try {
    const q = req.query.q || '';
    const bid = new mongoose.Types.ObjectId(req.session.user.id);
    let customers;
    
    if (q) {
      const searchRegex = new RegExp(q, 'i');
      customers = await Customer.find({
        business_id: bid,
        $or: [
          { name: searchRegex },
          { name_ne: searchRegex },
          { phone: searchRegex },
          { pan: searchRegex }
        ]
      }).sort({ name: 1 });
    } else {
      customers = await Customer.find({ business_id: bid }).sort({ name: 1 });
    }
    
    res.render('customers/list', { title: 'Customers', customers, q });
  } catch (error) {
    console.error('Customers list error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.get('/new', (req, res) => {
  res.render('customers/form', { title: 'New Customer', customer: {}, action: '/app/customers' });
});

router.post('/', async (req, res) => {
  try {
    const { name, name_ne, address, phone, email, pan, notes } = req.body;
    const bid = new mongoose.Types.ObjectId(req.session.user.id);
    
    await Customer.create({
      business_id: bid,
      name,
      name_ne: name_ne || null,
      address: address || null,
      phone: phone || null,
      email: email || null,
      pan: pan || null,
      notes: notes || null
    });
    
    req.session.flash = { type: 'success', msg: res.locals.t('created') };
    res.redirect('/app/customers');
  } catch (error) {
    console.error('Create customer error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      business_id: req.session.user.id
    });
    
    if (!customer) return res.redirect('/app/customers');
    
    const invoices = await Invoice.find({
      customer_id: customer._id,
      business_id: customer.business_id
    }).sort({ invoice_date: -1 });
    
    const statsResult = await Invoice.aggregate([
      {
        $match: {
          customer_id: customer._id,
          business_id: customer.business_id,
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          billed: { $sum: '$total' },
          paid: { $sum: '$paid_amount' },
          outstanding: { $sum: { $subtract: ['$total', '$paid_amount'] } }
        }
      }
    ]);
    
    const stats = statsResult.length > 0 ? statsResult[0] : { billed: 0, paid: 0, outstanding: 0 };
    
    res.render('customers/view', { title: customer.name, customer, invoices, stats });
  } catch (error) {
    console.error('View customer error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.get('/:id/edit', async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      business_id: req.session.user.id
    });
    
    if (!customer) return res.redirect('/app/customers');
    
    res.render('customers/form', { title: 'Edit', customer, action: `/app/customers/${customer._id}/edit` });
  } catch (error) {
    console.error('Edit customer error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.post('/:id/edit', async (req, res) => {
  try {
    const { name, name_ne, address, phone, email, pan, notes } = req.body;
    
    await Customer.updateOne(
      { _id: req.params.id, business_id: req.session.user.id },
      {
        name,
        name_ne: name_ne || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        pan: pan || null,
        notes: notes || null
      }
    );
    
    req.session.flash = { type: 'success', msg: res.locals.t('updated') };
    res.redirect('/app/customers');
  } catch (error) {
    console.error('Update customer error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.post('/:id/delete', async (req, res) => {
  try {
    await Customer.deleteOne({
      _id: req.params.id,
      business_id: req.session.user.id
    });
    
    req.session.flash = { type: 'success', msg: res.locals.t('deleted') };
    res.redirect('/app/customers');
  } catch (error) {
    console.error('Delete customer error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

module.exports = router;
