function attachLocals(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  res.locals.error = req.session.error || null;
  res.locals.success = req.session.success || null;
  res.locals.input = req.session.input || {};

  delete req.session.error;
  delete req.session.success;
  delete req.session.input;

  next();
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.error = "Please log in to continue.";
    return res.redirect("/login");
  }
  next();
}

function requireGuest(req, res, next) {
  if (req.session.user) {
    req.session.success = "You are already logged in.";
    return res.redirect("/");
  }
  next();
}

module.exports = {
  attachLocals,
  requireAuth,
  requireGuest,
};
