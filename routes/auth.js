// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../lib/db');

router.get('/login', (req, res) => {
  res.render('login', { title: 'Login', error: null });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM businesses WHERE email = ?').get(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('login', { title: 'Login', error: res.locals.t('invalid_login') });
  }
  if (!user.active) {
    return res.render('login', { title: 'Login', error: res.locals.t('account_inactive') });
  }

  db.prepare("UPDATE businesses SET last_login = datetime('now') WHERE id = ?").run(user.id);

  req.session.user = {
    id: user.id,
    email: user.email,
    business_name: user.business_name,
    business_name_ne: user.business_name_ne,
    is_admin: !!user.is_admin
  };

  if (user.is_admin) return res.redirect('/admin');
  res.redirect('/app');
});

router.get('/signup', (req, res) => {
  res.render('signup', { title: 'Sign Up', error: null, form: {} });
});

router.post('/signup', (req, res) => {
  const { email, password, business_name, business_name_ne, address, pan, phone } = req.body;
  const form = { email, business_name, business_name_ne, address, pan, phone };

  if (!password || password.length < 6) {
    return res.render('signup', { title: 'Sign Up', error: res.locals.t('password_short'), form });
  }

  const existing = db.prepare('SELECT id FROM businesses WHERE email = ?').get(email);
  if (existing) {
    return res.render('signup', { title: 'Sign Up', error: res.locals.t('email_exists'), form });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO businesses (email, password, business_name, business_name_ne, address, pan, phone, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(email, hash, business_name, business_name_ne || null, address || null, pan || null, phone || null);

  req.session.user = {
    id: result.lastInsertRowid,
    email,
    business_name,
    business_name_ne,
    is_admin: false
  };
  res.redirect('/app');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
