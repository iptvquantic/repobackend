const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120, useClones: true });
module.exports = {
  get: (k) => cache.get(k),
  set: (k, v, t) => cache.set(k, v, t),
  del: (k) => cache.del(k),
  flush: () => cache.flushAll(),
  getStats: () => ({
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    keys: cache.keys()
  })
};
