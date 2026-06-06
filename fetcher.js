const cache = require('./cache');  // <-- na raiz

async function fetchWithRetry(url, opts = {}, retries = 3, backoff = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { 'Accept': 'application/json', 'User-Agent': 'NEXUS-HUB/1.0', ...opts.headers }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
    }
  }
}

module.exports = {
  fetchCoinGeckoPrices: () => fetchWithRetry('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ondo-finance,aave,ethena&vs_currencies=usd&include_24hr_change=true&include_market_cap=true'),
  fetchCoinGeckoTicker: () => fetchWithRetry('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false'),
  fetchCoinGeckoGlobal: () => fetchWithRetry('https://api.coingecko.com/api/v3/global'),
  fetchFearGreed: () => fetchWithRetry('https://api.alternative.me/fng/?limit=1'),
  fetchBinanceRSI: (tf) => {
    const valid = ['1m','5m','15m','1h','4h','1d','1w'];
    if (!valid.includes(tf)) throw new Error('Timeframe invalido: ' + tf);
    return fetchWithRetry('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=' + tf + '&limit=100');
  },
  fetchUsdBrl: () => fetchWithRetry('https://open.er-api.com/v6/latest/USD'),
  fetchCoinGeckoTrending: () => fetchWithRetry('https://api.coingecko.com/api/v3/search/trending'),
  fetchCoinGeckoHeatmap: () => fetchWithRetry('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true'),
  fetchCoinGeckoTop100: () => fetchWithRetry('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h,7d'),
  fetchRSSNews: async (cat) => {
    const Parser = require('rss-parser');
    const parser = new Parser({ timeout: 5000, headers: { 'User-Agent': 'NEXUS-HUB/1.0' } });
    const feeds = {
      crypto: ['https://cointelegraph.com/rss', 'https://coindesk.com/arc/outboundfeeds/rss/'],
      ai: ['https://www.artificialintelligence-news.com/feed/', 'https://venturebeat.com/category/ai/feed/'],
      macro: ['https://www.fxstreet.com/rss/news', 'https://feeds.bbci.co.uk/news/business/rss.xml'],
      war: ['https://feeds.bbci.co.uk/news/world/rss.xml']
    };
    const selected = feeds[cat] || feeds.crypto;
    const all = [];
    for (const url of selected) {
      try {
        const feed = await parser.parseURL(url);
        all.push(...feed.items.slice(0, 10).map(i => ({ title: i.title, link: i.link, pubDate: i.pubDate, content: i.contentSnippet || '', source: feed.title || url })));
      } catch (e) { console.warn('[RSS] Falha ' + url + ': ' + e.message); }
    }
    return all.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 20);
  }
};
