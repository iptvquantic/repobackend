const NodeCache = require('node-cache');

// Cache em memória com TTL padrão de 60s
const cache = new NodeCache({ 
  stdTTL: 60, 
  checkperiod: 120,
  useClones: true
});

module.exports = {
  get: (key) => cache.get(key),
  set: (key, value, ttlSeconds) => cache.set(key, value, ttlSeconds),
  del: (key) => cache.del(key),
  flush: () => cache.flushAll(),
  getStats: () => ({
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    keys: cache.keys(),
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize
  })
};
