const ensureCurrentUser = (req, res, next) => {

  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Please login"
    });
  }

  next();
};

module.exports = ensureCurrentUser