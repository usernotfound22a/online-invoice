// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { Invoice, Customer, Product } = require('../lib/mongodb');
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
  try {
    const bid = new mongoose.Types.ObjectId(req.session.user.id);

    // Month start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthRevenueResult = await Invoice.aggregate([
      { $match: { business_id: bid, invoice_date: { $gte: monthStart }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$paid_amount' } } }
    ]);
    const monthRevenue = monthRevenueResult.length > 0 ? monthRevenueResult[0].total : 0;

    const outstandingResult = await Invoice.aggregate([
      { $match: { business_id: bid, status: { $in: ['sent', 'partial', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: { $subtract: ['$total', '$paid_amount'] } } } }
    ]);
    const outstanding = outstandingResult.length > 0 ? outstandingResult[0].total : 0;

    const invoiceCount = await Invoice.countDocuments({ business_id: bid, invoice_date: { $gte: monthStart } });

    const topCustomers = await Invoice.aggregate([
      { $match: { business_id: bid, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$customer_id', total: { $sum: '$total' } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$customer.name', name_ne: '$customer.name_ne', total: 1, _id: 0 } }
    ]);

    const lowStock = await Product.find({ 
      business_id: bid, 
      track_stock: true, 
      $expr: { $lte: ['$stock', '$low_stock_threshold'] } 
    }).limit(5).sort({ stock: 1 });

    const recentInvoices = await Invoice.find({ business_id: bid })
      .populate('customer_id', 'name')
      .sort({ created_at: -1 })
      .limit(8);

    // 6-month revenue trend
    const revenueChart = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
      const revenueData = await Invoice.aggregate([
        { $match: { business_id: bid, invoice_date: { $gte: d, $lt: end } } },
        { $group: { _id: null, total: { $sum: '$paid_amount' } } }
      ]);
      const total = revenueData.length > 0 ? revenueData[0].total : 0;
      revenueChart.push({ month: monthLabel, total });
    }

    res.render('dashboard', {
      title: 'Dashboard',
      monthRevenue,
      outstanding,
      invoiceCount,
      topCustomers,
      lowStock,
      recentInvoices,
      revenueChart
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

module.exports = router;
