// Middleware to check if user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/login');
}

// Middleware to check if user is admin
function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).send('Access denied. Admin privileges required.');
}

// Middleware to check if account is approved
function ensureApproved(req, res, next) {
  if (req.isAuthenticated() && req.user.is_approved) {
    return next();
  }
  res.redirect('/auth/pending');
}

module.exports = {
  ensureAuthenticated,
  ensureAdmin,
  ensureApproved
};
