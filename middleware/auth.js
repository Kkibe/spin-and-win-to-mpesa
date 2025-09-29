const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
      return next();
    }
    res.redirect('/login');
  };

  const isNotAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.user) {
      return next();
    }
    res.redirect('/');
  };

  module.exports = {
    isAuthenticated,
    isNotAuthenticated
  };