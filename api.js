const express = require('express');
const router = express.Router();
const fetcher = require('./fetcher');
const cache = require('./cache');

async function cachedResponse(res, key, ttl, fn) {
  try {
    const c = cache.get(key);
    if (c) return res.json({ ...c, _cached: true, _cachedAt: new Date().toISOString() });
    const data = await fn();
    cache.set(key, data, ttl);
    res.json({ ...data, _cached: false });
  } catch (e) {
    console.error('[API ERROR] ' + key + ': ' + e.message);
    res.status(502).json({ error: 'Upstream API failed', message: e.message });
  }
}

// CoinGecko: cache 300s (5min) para evitar 429
router.get('/prices', (req, res) => cachedResponse(res, 'prices', 300, fetcher.fetchCoinGeckoPrices));
router.get('/ticker', (req, res) => cachedResponse(res, 'ticker', 300, fetcher.fetchCoinGeckoTicker));
router.get('/global', (req, res) => cachedResponse(res, 'global', 300, fetcher.fetchCoinGeckoGlobal));
router.get('/fng', (req, res) => cachedResponse(res, 'fng', 600, fetcher.fetchFearGreed));
router.get('/rsi', (req, res) => {
  const tf = req.query.tf || '1d';
  cachedResponse(res, 'rsi_' + tf, 120, () => fetcher.fetchBinanceRSI(tf));
});
router.get('/usdbrl', (req, res) => cachedResponse(res, 'usdbrl', 600, fetcher.fetchUsdBrl));
router.get('/trending', (req, res) => cachedResponse(res, 'trending', 600, fetcher.fetchCoinGeckoTrending));
router.get('/heatmap', (req, res) => cachedResponse(res, 'heatmap', 300, fetcher.fetchCoinGeckoHeatmap));
router.get('/top100', (req, res) => cachedResponse(res, 'top100', 300, fetcher.fetchCoinGeckoTop100));
router.get('/news/:cat', (req, res) => {
  const cat = req.params.cat;
  if (!['crypto','ai','macro','war'].includes(cat)) return res.status(400).json({ error: 'Categoria invalida' });
  cachedResponse(res, 'news_' + cat, 600, () => fetcher.fetchRSSNews(cat));
});
router.get('/admin/cache', (req, res) => res.json(cache.getStats()));
router.post('/admin/cache/flush', (req, res) => { cache.flush(); res.json({ ok: true }); });

module.exports = router;
