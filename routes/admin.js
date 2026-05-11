// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../lib/db');

router.get('/', (req, res) => {
  const q = req.query.q || '';
  const filter = req.query.filter || 'all';
  let where = 'is_admin = 0';
  let params = [];
  if (q) {
    where += ' AND (business_name LIKE ? OR business_name_ne LIKE ? OR email LIKE ?)';
    const like = '%' + q + '%';
    params.push(like, like, like);
  }
  if (filter === 'active') where += ' AND active = 1';
  if (filter === 'inactive') where += ' AND active = 0';

  const companies = db.prepare(`
    SELECT id, email, business_name, business_name_ne, active, created_at, last_login
    FROM businesses WHERE ${where}
    ORDER BY created_at DESC
  `).all(...params);

  const stats = db.prepare(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(active), 0) AS active,
      COUNT(*) - COALESCE(SUM(active), 0) AS inactive
    FROM businesses WHERE is_admin = 0
  `).get();

  res.render('admin/dashboard', { title: 'Admin', companies, stats, q, filter });
});

router.post('/toggle/:id', (req, res) => {
  const company = db.prepare('SELECT active FROM businesses WHERE id = ? AND is_admin = 0').get(req.params.id);
  if (!company) return res.redirect('/admin');
  db.prepare('UPDATE businesses SET active = ? WHERE id = ?').run(company.active ? 0 : 1, req.params.id);
  req.session.flash = { type: 'success', msg: res.locals.t('updated') };
  res.redirect('/admin' + (req.query.q ? '?q=' + encodeURIComponent(req.query.q) : '') + (req.query.filter ? '&filter=' + req.query.filter : ''));
});

module.exports = router;
