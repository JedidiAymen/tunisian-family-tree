// Usage: call as enforceFamilyOwnership(resourceFamilyId)
module.exports = function enforceFamilyOwnership(resourceFamilyIdProvider) {
  return function (req, res, next) {
    // resourceFamilyIdProvider can be a function(req) -> id or a string key on req
    let resourceFamilyId;
    if (typeof resourceFamilyIdProvider === 'function') {
      resourceFamilyId = resourceFamilyIdProvider(req);
    } else if (typeof resourceFamilyIdProvider === 'string') {
      resourceFamilyId = req[resourceFamilyIdProvider];
    }
    if (!resourceFamilyId) return res.status(400).json({ error: 'Missing resource family id' });
    if (resourceFamilyId !== req.user.familyId) return res.status(403).json({ error: 'Resource belongs to different family' });
    next();
  };
};
