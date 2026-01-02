module.exports = function requireRole(allowed = []) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (allowed.length && !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
