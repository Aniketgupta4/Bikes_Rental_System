module.exports = {
  ensureAuth: (req, res, next) => {
    if (req.session && req.session.user) return next();
    res.redirect("/login");
  },

  ensureUser: (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === "user") return next();
    res.redirect("/login");
  },

  ensureAdmin: (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === "admin") return next();
    res.redirect("/login");
  }
};
