// routes/admin.js - MongoDB version
const express = require('express');
const router = express.Router();
const { Business } = require('../lib/mongodb');

router.get('/', async (req, res) => {
  try {
    const q = req.query.q || '';
    const filter = req.query.filter || 'all';
    
    let filterObj = { is_admin: false };
    if (q) {
      const searchRegex = new RegExp(q, 'i');
      filterObj.$or = [
        { business_name: searchRegex },
        { business_name_ne: searchRegex },
        { email: searchRegex }
      ];
    }
    if (filter === 'active') filterObj.active = true;
    if (filter === 'inactive') filterObj.active = false;

    const companies = await Business.find(filterObj)
      .select('email business_name business_name_ne active created_at last_login')
      .sort({ created_at: -1 });

    const stats = await Business.aggregate([
      { $match: { is_admin: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$active', 1, 0] } }
        }
      }
    ]);

    const statsResult = stats.length > 0 ? stats[0] : { total: 0, active: 0 };
    statsResult.inactive = statsResult.total - statsResult.active;

    res.render('admin/dashboard', { title: 'Admin', companies, stats: statsResult, q, filter });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

router.post('/toggle/:id', async (req, res) => {
  try {
    const company = await Business.findOne({
      _id: req.params.id,
      is_admin: false
    });

    if (!company) return res.redirect('/admin');
    
    await Business.updateOne(
      { _id: req.params.id },
      { active: !company.active }
    );

    req.session.flash = { type: 'success', msg: res.locals.t('updated') };
    
    let redirectUrl = '/admin';
    if (req.query.q) redirectUrl += '?q=' + encodeURIComponent(req.query.q);
    if (req.query.filter) redirectUrl += (req.query.q ? '&' : '?') + 'filter=' + req.query.filter;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Toggle company error:', error);
    res.render('error', { title: 'Error', message: error.message });
  }
});

module.exports = router;
