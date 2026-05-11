// routes/dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../lib/db');

router.get('/', (req, res) => {
  const bid = req.session.user.id;

  // Month start
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const monthRevenue = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) AS total
    FROM invoices WHERE business_id = ? AND invoice_date >= ? AND status != 'cancelled'
  `).get(bid, monthStart).total;

  const outstanding = db.prepare(`
    SELECT COALESCE(SUM(total - paid_amount), 0) AS total
    FROM invoices WHERE business_id = ? AND status IN ('sent', 'partial', 'overdue')
  `).get(bid).total;

  const invoiceCount = db.prepare(`
    SELECT COUNT(*) AS c FROM invoices WHERE business_id = ? AND invoice_date >= ?
  `).get(bid, monthStart).c;

  const topCustomers = db.prepare(`
    SELECT c.name, c.name_ne, COALESCE(SUM(i.total), 0) AS total
    FROM customers c
    LEFT JOIN invoices i ON i.customer_id = c.id AND i.status != 'cancelled'
    WHERE c.business_id = ?
    GROUP BY c.id
    ORDER BY total DESC LIMIT 5
  `).all(bid);

  const lowStock = db.prepare(`
    SELECT name, name_ne, stock, low_stock_threshold, unit
    FROM products
    WHERE business_id = ? AND track_stock = 1 AND stock <= low_stock_threshold
    ORDER BY stock ASC LIMIT 5
  `).all(bid);

  const recentInvoices = db.prepare(`
    SELECT i.*, c.name AS customer_name
    FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id
    WHERE i.business_id = ?
    ORDER BY i.created_at DESC LIMIT 8
  `).all(bid);

  // 6-month revenue trend
  const revenueChart = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
    const r = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) AS total
      FROM invoices WHERE business_id = ? AND invoice_date >= ? AND invoice_date < ?
    `).get(bid, d.toISOString().slice(0, 10), end.toISOString().slice(0, 10)).total;
    revenueChart.push({ month: monthLabel, total: r });
  }

  res.render('dashboard', {
    title: 'Dashboard',
    monthRevenue, outstanding, invoiceCount,
    topCustomers, lowStock, recentInvoices, revenueChart
  });
});

module.exports = router;
