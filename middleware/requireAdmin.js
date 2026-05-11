// middleware/requireAdmin.js
module.exports = function(req, res, next) {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.redirect('/auth/login');
  }
  next();
};
