// routes/products.js - MongoDB version
const express = require('express');
const router = express.Router();
const { Product } = require('../lib/mongodb');
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
  try {
    const q = req.query.q || '';
    const cat = req.query.cat || '';
    const bid = new mongoose.Types.ObjectId(req.session.user.id);
    
    let filter = { business_id: bid };
    if (q) {
      const searchRegex = new RegExp(q, 'i');
      filter.$or = [
        { name: searchRegex },
        { name_ne: searchRegex }
      ];
    }
    if (cat) {
      filter.category = cat;
    }
    
    const products = await Product.find(filter).sort({ name: 1 });
    const categoryDocs = await Product.distinct('category', { business_id: bid, category: { $ne: null } });
    const categories = categoryDocs || [];
    
    res.render('products/list', { title: 'Products', products, q, cat, categories });
  } catch (error) {
    console.error('Products list error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.get('/new', (req, res) => {
  res.render('products/form', { title: 'New Product', product: {}, action: '/app/products' });
});

router.post('/', async (req, res) => {
  try {
    const { name, name_ne, description, price, unit, category, vat_applicable, stock, low_stock_threshold, track_stock } = req.body;
    const bid = new mongoose.Types.ObjectId(req.session.user.id);
    
    await Product.create({
      business_id: bid,
      name,
      name_ne: name_ne || null,
      description: description || null,
      price: parseFloat(price) || 0,
      unit: unit || 'pcs',
      category: category || null,
      vat_applicable: vat_applicable ? true : false,
      stock: parseFloat(stock) || 0,
      low_stock_threshold: parseFloat(low_stock_threshold) || 0,
      track_stock: track_stock ? true : false
    });
    
    req.session.flash = { type: 'success', msg: res.locals.t('created') };
    res.redirect('/app/products');
  } catch (error) {
    console.error('Create product error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.get('/:id/edit', async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      business_id: req.session.user.id
    });
    
    if (!product) return res.redirect('/app/products');
    
    res.render('products/form', { title: 'Edit Product', product, action: `/app/products/${product._id}/edit` });
  } catch (error) {
    console.error('Edit product error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.post('/:id/edit', async (req, res) => {
  try {
    const { name, name_ne, description, price, unit, category, vat_applicable, stock, low_stock_threshold, track_stock } = req.body;
    
    await Product.updateOne(
      { _id: req.params.id, business_id: req.session.user.id },
      {
        name,
        name_ne: name_ne || null,
        description: description || null,
        price: parseFloat(price) || 0,
        unit: unit || 'pcs',
        category: category || null,
        vat_applicable: vat_applicable ? true : false,
        stock: parseFloat(stock) || 0,
        low_stock_threshold: parseFloat(low_stock_threshold) || 0,
        track_stock: track_stock ? true : false
      }
    );
    
    req.session.flash = { type: 'success', msg: res.locals.t('updated') };
    res.redirect('/app/products');
  } catch (error) {
    console.error('Update product error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.post('/:id/delete', async (req, res) => {
  try {
    await Product.deleteOne({
      _id: req.params.id,
      business_id: req.session.user.id
    });
    
    req.session.flash = { type: 'success', msg: res.locals.t('deleted') };
    res.redirect('/app/products');
  } catch (error) {
    console.error('Delete product error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

// API for invoice form
router.get('/api/list', async (req, res) => {
  try {
    const products = await Product.find({ business_id: req.session.user.id })
      .select('name name_ne price unit vat_applicable')
      .sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
