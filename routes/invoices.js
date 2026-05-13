// routes/invoices.js - MongoDB version
const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const PDFDocument = require('pdfkit');
const { Invoice, InvoiceItem, Customer, Product, Business } = require('../lib/mongodb');
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
  try {
    const status = req.query.status || '';
    const bid = new mongoose.Types.ObjectId(req.session.user.id);
    
    let filter = { business_id: bid };
    if (status) {
      filter.status = status;
    }
    
    const invoices = await Invoice.find(filter)
      .populate('customer_id', 'name')
      .sort({ invoice_date: -1, created_at: -1 });
    
    res.render('invoices/list', { title: 'Invoices', invoices, status });
  } catch (error) {
    console.error('Invoices list error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.get('/new', async (req, res) => {
  try {
    const bid = new mongoose.Types.ObjectId(req.session.user.id);
    const customers = await Customer.find({ business_id: bid }).sort({ name: 1 });
    const products = await Product.find({ business_id: bid }).sort({ name: 1 });
    const business = await Business.findById(bid);

    // Generate next invoice number
    const count = await Invoice.countDocuments({ business_id: bid });
    const nextNum = `${business.invoice_prefix || 'INV'}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    res.render('invoices/form', {
      title: 'New Invoice',
      customers, products, business,
      invoice: {
        invoice_number: nextNum,
        invoice_date: new Date().toISOString().slice(0, 10),
        vat_rate: business.vat_rate || 13,
        apply_vat: true,
        status: 'draft'
      },
      items: []
    });
  } catch (error) {
    console.error('New invoice error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const bid = new mongoose.Types.ObjectId(req.session.user.id);
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
        product_id: itemProdIds[i] ? new mongoose.Types.ObjectId(itemProdIds[i]) : null
      });
    }

    const subtotal = items.reduce((s, it) => s + it.amount, 0);
    const discountAmt = parseFloat(discount) || 0;
    const afterDiscount = subtotal - discountAmt;
    const vRate = parseFloat(vat_rate) || 0;
    const applyV = apply_vat ? true : false;
    const vatAmt = applyV ? afterDiscount * vRate / 100 : 0;
    const total = afterDiscount + vatAmt;

    const publicId = randomUUID();
    const paidAmount = (status === 'paid') ? total : 0;

    const invoice = await Invoice.create({
      business_id: bid,
      customer_id: customer_id ? new mongoose.Types.ObjectId(customer_id) : null,
      invoice_number,
      public_id: publicId,
      invoice_date: new Date(invoice_date),
      due_date: due_date ? new Date(due_date) : null,
      buyer_name: buyer_name || null,
      buyer_address: buyer_address || null,
      buyer_pan: buyer_pan || null,
      subtotal,
      discount: discountAmt,
      vat_rate: vRate,
      vat_amount: vatAmt,
      total,
      paid_amount: paidAmount,
      status: status || 'draft',
      payment_method: payment_method || null,
      notes: notes || null,
      apply_vat: applyV
    });

    // Create invoice items
    for (const item of items) {
      await InvoiceItem.create({
        invoice_id: invoice._id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount
      });
    }

    // Auto-decrement stock if paid
    if (status === 'paid') {
      for (const item of items) {
        if (item.product_id) {
          await Product.updateOne(
            { _id: item.product_id, track_stock: true },
            { $inc: { stock: -item.quantity } }
          );
        }
      }
    }

    req.session.flash = { type: 'success', msg: res.locals.t('created') };
    res.redirect(`/app/invoices/${invoice._id}`);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const bid = new mongoose.Types.ObjectId(req.session.user.id);
    
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      business_id: bid
    }).populate('customer_id').populate('business_id');

    if (!invoice) return res.redirect('/app/invoices');
    
    const items = await InvoiceItem.find({ invoice_id: invoice._id }).populate('product_id');
    
    res.render('invoices/view', { 
      title: invoice.invoice_number, 
      invoice, 
      items
    });
  } catch (error) {
    console.error('View invoice error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.get('/:id/print', async (req, res) => {
  try {
    const bid = new mongoose.Types.ObjectId(req.session.user.id);
    
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      business_id: bid
    }).populate('customer_id').populate('business_id');

    if (!invoice) return res.redirect('/app/invoices');
    
    const items = await InvoiceItem.find({ invoice_id: invoice._id }).populate('product_id');
    
    res.render('invoice-print', { 
      invoice, 
      items, 
      isPublic: false, 
      title: invoice.invoice_number 
    });
  } catch (error) {
    console.error('Print invoice error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.post('/:id/payment', async (req, res) => {
  try {
    const bid = new mongoose.Types.ObjectId(req.session.user.id);
    const amount = parseFloat(req.body.amount) || 0;
    const method = req.body.method;
    
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      business_id: bid
    });

    if (!invoice) return res.redirect('/app/invoices');
    
    const newPaid = invoice.paid_amount + amount;
    let newStatus = invoice.status;
    if (newPaid >= invoice.total) newStatus = 'paid';
    else if (newPaid > 0) newStatus = 'partial';
    
    await Invoice.updateOne(
      { _id: invoice._id },
      { 
        paid_amount: newPaid, 
        status: newStatus, 
        payment_method: method 
      }
    );

    req.session.flash = { type: 'success', msg: 'Payment recorded' };
    res.redirect(`/app/invoices/${invoice._id}`);
  } catch (error) {
    console.error('Payment error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.post('/:id/delete', async (req, res) => {
  try {
    await Invoice.deleteOne({
      _id: req.params.id,
      business_id: req.session.user.id
    });
    
    req.session.flash = { type: 'success', msg: res.locals.t('deleted') };
    res.redirect('/app/invoices');
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.post('/:id/update-buyer', async (req, res) => {
  try {
    const bid = new mongoose.Types.ObjectId(req.session.user.id);
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      business_id: bid
    });

    if (!invoice) {
      return res.json({ success: false, error: 'Invoice not found' });
    }
    
    const { buyer_name, buyer_address, buyer_pan } = req.body;
    const updateData = {};
    
    if (buyer_name !== undefined) updateData.buyer_name = buyer_name || null;
    if (buyer_address !== undefined) updateData.buyer_address = buyer_address || null;
    if (buyer_pan !== undefined) updateData.buyer_pan = buyer_pan || null;
    
    if (Object.keys(updateData).length === 0) {
      return res.json({ success: false, error: 'No fields to update' });
    }
    
    await Invoice.updateOne({ _id: invoice._id }, updateData);
    
    res.json({ success: true, msg: 'Buyer information updated' });
  } catch (error) {
    console.error('Update buyer error:', error);
    res.json({ success: false, error: error.message });
  }
});

// GET /app/invoices/:id/pdf - Download invoice as PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const bid = new mongoose.Types.ObjectId(req.session.user.id);
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      business_id: bid
    })
    .populate('customer_id')
    .populate('business_id')
    .populate({
      path: 'items',
      populate: { path: 'product_id' }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text(invoice.business_id.business_name, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(invoice.business_id.address || '', { align: 'center' });
    doc.text(`PAN: ${invoice.business_id.pan || 'N/A'} | Phone: ${invoice.business_id.phone || 'N/A'}`, { align: 'center' });
    
    doc.moveTo(30, doc.y + 5).lineTo(565, doc.y + 5).stroke();
    doc.moveDown();

    // Title
    doc.fontSize(14).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
    doc.moveDown(0.5);

    // Invoice details
    doc.fontSize(10).font('Helvetica');
    const leftX = 50;
    const rightX = 350;
    
    doc.text(`Invoice #: ${invoice.invoice_number}`, leftX, doc.y);
    doc.text(`Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, rightX, doc.y - 15);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, leftX, doc.y + 15);
    if (invoice.due_date) {
      doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, rightX, doc.y - 15);
    }
    
    doc.moveDown(2);
    doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke();
    doc.moveDown();

    // Bill To section
    doc.font('Helvetica-Bold').text('BILL TO:', leftX);
    doc.font('Helvetica');
    doc.text(invoice.buyer_name || 'N/A', leftX);
    if (invoice.buyer_address) doc.text(invoice.buyer_address, leftX);
    if (invoice.buyer_pan) doc.text(`PAN: ${invoice.buyer_pan}`, leftX);
    
    doc.moveDown();

    // Items table
    const tableTop = doc.y;
    const col1 = 50, col2 = 150, col3 = 320, col4 = 420, col5 = 530;
    
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('S.No', col1, tableTop);
    doc.text('Description', col2, tableTop);
    doc.text('Qty', col3, tableTop, { width: 40, align: 'right' });
    doc.text('Rate', col4, tableTop, { width: 50, align: 'right' });
    doc.text('Amount', col5, tableTop, { width: 50, align: 'right' });

    doc.moveTo(30, tableTop + 15).lineTo(565, tableTop + 15).stroke();

    let y = tableTop + 20;
    doc.font('Helvetica').fontSize(9);
    let subtotal = 0;

    invoice.items.forEach((item, idx) => {
      const amount = item.quantity * item.rate;
      subtotal += amount;
      
      doc.text((idx + 1).toString(), col1, y);
      doc.text(item.description, col2, y, { width: 150 });
      doc.text(item.quantity.toString(), col3, y, { width: 40, align: 'right' });
      doc.text(`Rs ${item.rate.toFixed(2)}`, col4, y, { width: 50, align: 'right' });
      doc.text(`Rs ${amount.toFixed(2)}`, col5, y, { width: 50, align: 'right' });
      
      y += 20;
    });

    doc.moveTo(30, y).lineTo(565, y).stroke();
    y += 10;

    // Totals
    const discount = invoice.discount || 0;
    const vat = invoice.apply_vat ? (subtotal - discount) * (invoice.vat_rate / 100) : 0;
    const total = subtotal - discount + vat;

    doc.font('Helvetica');
    doc.text('Subtotal:', col4, y, { width: 50, align: 'right' });
    doc.text(`Rs ${subtotal.toFixed(2)}`, col5, y, { width: 50, align: 'right' });
    
    y += 15;
    if (discount > 0) {
      doc.text('Discount:', col4, y, { width: 50, align: 'right' });
      doc.text(`-Rs ${discount.toFixed(2)}`, col5, y, { width: 50, align: 'right' });
      y += 15;
    }

    if (vat > 0) {
      doc.text(`VAT (${invoice.vat_rate}%):`, col4, y, { width: 50, align: 'right' });
      doc.text(`Rs ${vat.toFixed(2)}`, col5, y, { width: 50, align: 'right' });
      y += 15;
    }

    doc.font('Helvetica-Bold');
    doc.moveTo(350, y - 5).lineTo(565, y - 5).stroke();
    doc.text('TOTAL:', col4, y, { width: 50, align: 'right' });
    doc.text(`Rs ${total.toFixed(2)}`, col5, y, { width: 50, align: 'right' });

    // Footer
    doc.moveDown(3);
    doc.font('Helvetica').fontSize(9);
    if (invoice.notes) {
      doc.text(`Notes: ${invoice.notes}`);
    }
    if (invoice.payment_method) {
      doc.text(`Payment Method: ${invoice.payment_method}`);
    }
    if (invoice.paid_amount > 0) {
      doc.text(`Paid: Rs ${invoice.paid_amount.toFixed(2)}`);
    }

    doc.fontSize(8).text('Generated by Pokhara Invoice · ' + new Date().toLocaleString(), { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF: ' + error.message });
  }
});

module.exports = router;
