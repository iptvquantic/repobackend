const cache = require('./cache');

// Mock data fallback para quando APIs bloqueiam (429)
const MOCK_PRICES = {
  bitcoin: { usd: 105420, usd_24h_change: 2.34, usd_market_cap: 2085000000000 },
  ethereum: { usd: 2520, usd_24h_change: -1.12, usd_market_cap: 302000000000 },
  solana: { usd: 142.5, usd_24h_change: 5.67, usd_market_cap: 68000000000 },
  'ondo-finance': { usd: 1.85, usd_24h_change: 3.21, usd_market_cap: 2800000000 },
  aave: { usd: 312.4, usd_24h_change: -0.45, usd_market_cap: 4700000000 },
  ethena: { usd: 0.98, usd_24h_change: 0.12, usd_market_cap: 1800000000 }
};

const MOCK_GLOBAL = {
  data: {
    active_cryptocurrencies: 8500,
    total_market_cap: { usd: 3200000000000 },
    total_volume: { usd: 98000000000 },
    market_cap_percentage: { btc: 52.1, eth: 15.3 }
  }
};

const MOCK_FNG = { data: [{ value: 65, value_classification: 'Greed' }] };

const MOCK_USDBRL = { rates: { BRL: 5.72 } };

async function fetchWithRetry(url, opts = {}, retries = 3, backoff = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { 
          'Accept': 'application/json', 
          'User-Agent': 'NEXUS-HUB-Backend/1.0 (Render; Free)', 
          ...opts.headers 
        }
      });

      if (res.status === 429) {
        console.warn('[FETCHER] 429 recebido, tentativa ' + (i+1) + '/' + retries);
        if (i === retries - 1) throw new Error('HTTP 429');
        await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
        continue;
      }

      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
    }
  }
}

module.exports = {
  fetchCoinGeckoPrices: async () => {
    try {
      return await fetchWithRetry('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ondo-finance,aave,ethena&vs_currencies=usd&include_24hr_change=true&include_market_cap=true');
    } catch (e) {
      console.warn('[FALLBACK] Usando mock prices (CoinGecko 429)');
      return MOCK_PRICES;
    }
  },

  fetchCoinGeckoTicker: () => fetchWithRetry('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false'),

  fetchCoinGeckoGlobal: async () => {
    try {
      return await fetchWithRetry('https://api.coingecko.com/api/v3/global');
    } catch (e) {
      console.warn('[FALLBACK] Usando mock global (CoinGecko 429)');
      return MOCK_GLOBAL;
    }
  },

  fetchFearGreed: async () => {
    try {
      return await fetchWithRetry('https://api.alternative.me/fng/?limit=1');
    } catch (e) {
      console.warn('[FALLBACK] Usando mock FNG');
      return MOCK_FNG;
    }
  },

  fetchBinanceRSI: (tf) => {
    const valid = ['1m','5m','15m','1h','4h','1d','1w'];
    if (!valid.includes(tf)) throw new Error('Timeframe invalido: ' + tf);
    return fetchWithRetry('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=' + tf + '&limit=100');
  },

  fetchUsdBrl: async () => {
    try {
      return await fetchWithRetry('https://open.er-api.com/v6/latest/USD');
    } catch (e) {
      console.warn('[FALLBACK] Usando mock USD/BRL');
      return MOCK_USDBRL;
    }
  },

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
