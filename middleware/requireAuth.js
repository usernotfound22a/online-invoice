// middleware/requireAuth.js
module.exports = function(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  if (req.session.user.is_admin) {
    return res.redirect('/admin');
  }
  next();
};
