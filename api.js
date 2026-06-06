const express = require('express');
const router = express.Router();
const fetcher = require('../services/fetcher');
const cache = require('../services/cache');

// Helper para responder com cache ou fetch
async function cachedResponse(res, cacheKey, ttl, fetchFn) {
  try {
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      return res.json({ ...cached, _cached: true, _cachedAt: new Date().toISOString() });
    }

    console.log(`[CACHE MISS] ${cacheKey} - fetching...`);
    const data = await fetchFn();
    cache.set(cacheKey, data, ttl);
    res.json({ ...data, _cached: false });
  } catch (error) {
    console.error(`[API ERROR] ${cacheKey}:`, error.message);
    res.status(502).json({ 
      error: 'Failed to fetch from upstream API', 
      message: error.message,
      cacheKey 
    });
  }
}

// GET /api/prices - 60s cache - Dashboard principal
router.get('/prices', (req, res) => 
  cachedResponse(res, 'prices', 60, fetcher.fetchCoinGeckoPrices)
);

// GET /api/ticker - 120s cache - Ticker infinito
router.get('/ticker', (req, res) => 
  cachedResponse(res, 'ticker', 120, fetcher.fetchCoinGeckoTicker)
);

// GET /api/global - 120s cache - Market Cap & Dominância
router.get('/global', (req, res) => 
  cachedResponse(res, 'global', 120, fetcher.fetchCoinGeckoGlobal)
);

// GET /api/fng - 300s cache - Fear & Greed
router.get('/fng', (req, res) => 
  cachedResponse(res, 'fng', 300, fetcher.fetchFearGreed)
);

// GET /api/rsi?tf=1d - 90s cache - RSI via Binance
router.get('/rsi', (req, res) => {
  const tf = req.query.tf || '1d';
  const cacheKey = `rsi_${tf}`;
  cachedResponse(res, cacheKey, 90, () => fetcher.fetchBinanceRSI(tf));
});

// GET /api/usdbrl - 300s cache - Câmbio
router.get('/usdbrl', (req, res) => 
  cachedResponse(res, 'usdbrl', 300, fetcher.fetchUsdBrl)
);

// GET /api/trending - 300s cache - Trending
router.get('/trending', (req, res) => 
  cachedResponse(res, 'trending', 300, fetcher.fetchCoinGeckoTrending)
);

// GET /api/heatmap - 120s cache - Mapa de calor
router.get('/heatmap', (req, res) => 
  cachedResponse(res, 'heatmap', 120, fetcher.fetchCoinGeckoHeatmap)
);

// GET /api/top100 - 120s cache - Top 100 mundial
router.get('/top100', (req, res) => 
  cachedResponse(res, 'top100', 120, fetcher.fetchCoinGeckoTop100)
);

// GET /api/news/:cat - 600s cache - Notícias RSS
router.get('/news/:cat', (req, res) => {
  const cat = req.params.cat;
  const validCats = ['crypto', 'ai', 'macro', 'war'];
  if (!validCats.includes(cat)) {
    return res.status(400).json({ error: `Categoria inválida. Use: ${validCats.join(', ')}` });
  }
  const cacheKey = `news_${cat}`;
  cachedResponse(res, cacheKey, 600, () => fetcher.fetchRSSNews(cat));
});

// GET /admin/cache - Estatísticas do cache
router.get('/admin/cache', (req, res) => {
  res.json(cache.getStats());
});

// GET /admin/cache/flush - Limpar cache (útil para debug)
router.post('/admin/cache/flush', (req, res) => {
  cache.flush();
  res.json({ message: 'Cache limpo com sucesso' });
});

module.exports = router;
