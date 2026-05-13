// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { Business } = require('../lib/mongodb');

router.get('/login', (req, res) => {
  res.render('login', { title: 'Login', error: null });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Business.findOne({ email });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.render('login', { title: 'Login', error: res.locals.t('invalid_login') });
    }
    if (!user.active) {
      return res.render('login', { title: 'Login', error: res.locals.t('account_inactive') });
    }

    await Business.updateOne({ _id: user._id }, { last_login: new Date() });

    req.session.user = {
      id: user._id.toString(),
      email: user.email,
      business_name: user.business_name,
      business_name_ne: user.business_name_ne,
      is_admin: !!user.is_admin
    };

    if (user.is_admin) return res.redirect('/admin');
    res.redirect('/app');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { title: 'Login', error: 'An error occurred' });
  }
});

router.get('/signup', (req, res) => {
  res.render('signup', { title: 'Sign Up', error: null, form: {} });
});

router.post('/signup', async (req, res) => {
  try {
    const { email, password, business_name, business_name_ne, address, pan, phone } = req.body;
    const form = { email, business_name, business_name_ne, address, pan, phone };

    if (!password || password.length < 6) {
      return res.render('signup', { title: 'Sign Up', error: res.locals.t('password_short'), form });
    }

    const existing = await Business.findOne({ email });
    if (existing) {
      return res.render('signup', { title: 'Sign Up', error: res.locals.t('email_exists'), form });
    }

    const hash = bcrypt.hashSync(password, 10);
    const newBusiness = await Business.create({
      email,
      password: hash,
      business_name,
      business_name_ne: business_name_ne || null,
      address: address || null,
      pan: pan || null,
      phone: phone || null,
      active: true
    });

    req.session.user = {
      id: newBusiness._id.toString(),
      email,
      business_name,
      business_name_ne,
      is_admin: false
    };
    res.redirect('/app');
  } catch (error) {
    console.error('Signup error:', error);
    res.render('signup', { title: 'Sign Up', error: 'An error occurred', form: {} });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ============= GOOGLE OAUTH =============
const passport = require('passport');
require('../lib/passport-config');

// Login with Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  (req, res) => {
    try {
      const business = req.user;
      
      req.session.user = {
        id: business._id.toString(),
        email: business.email,
        business_name: business.business_name,
        business_name_ne: business.business_name_ne || '',
        is_admin: !!business.is_admin
      };
      
      if (business.is_admin) {
        res.redirect('/admin');
      } else {
        res.redirect('/app');
      }
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect('/auth/login?error=oauth_failed');
    }
  }
);

module.exports = router;
