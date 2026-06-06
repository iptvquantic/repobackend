const cache = require('./cache');

// Fetch com retry automático (3 tentativas, backoff exponencial)
async function fetchWithRetry(url, options = {}, retries = 3, backoff = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NEXUS-HUB-Backend/1.0',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`[FETCHER] Tentativa ${i + 1}/${retries} falhou para ${url}: ${error.message}`);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
    }
  }
}

module.exports = {
  // CoinGecko - Preços do Dashboard (6 criptos)
  fetchCoinGeckoPrices: () => 
    fetchWithRetry('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ondo-finance,aave,ethena&vs_currencies=usd&include_24hr_change=true&include_market_cap=true'),

  // CoinGecko - Ticker (10 criptos)
  fetchCoinGeckoTicker: () => 
    fetchWithRetry('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false'),

  // CoinGecko - Dados globais (market cap, dominância)
  fetchCoinGeckoGlobal: () => 
    fetchWithRetry('https://api.coingecko.com/api/v3/global'),

  // Alternative.me - Fear & Greed Index
  fetchFearGreed: () => 
    fetchWithRetry('https://api.alternative.me/fng/?limit=1'),

  // Binance - Klines para RSI (BTC/USDT)
  fetchBinanceRSI: (timeframe) => {
    const validTfs = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];
    if (!validTfs.includes(timeframe)) {
      throw new Error(`Timeframe inválido: ${timeframe}. Use: ${validTfs.join(', ')}`);
    }
    return fetchWithRetry(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${timeframe}&limit=100`);
  },

  // Open ER - Câmbio USD/BRL
  fetchUsdBrl: () => 
    fetchWithRetry('https://open.er-api.com/v6/latest/USD'),

  // CoinGecko - Trending
  fetchCoinGeckoTrending: () => 
    fetchWithRetry('https://api.coingecko.com/api/v3/search/trending'),

  // CoinGecko - Heatmap (top 50)
  fetchCoinGeckoHeatmap: () => 
    fetchWithRetry('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true'),

  // CoinGecko - Top 100 + variações 24h/7d
  fetchCoinGeckoTop100: () => 
    fetchWithRetry('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h,7d'),

  // RSS News por categoria
  fetchRSSNews: async (category) => {
    const Parser = require('rss-parser');
    const parser = new Parser({
      timeout: 5000,
      headers: { 'User-Agent': 'NEXUS-HUB-Backend/1.0' }
    });

    const feeds = {
      crypto: [
        'https://cointelegraph.com/rss',
        'https://coindesk.com/arc/outboundfeeds/rss/'
      ],
      ai: [
        'https://www.artificialintelligence-news.com/feed/',
        'https://venturebeat.com/category/ai/feed/'
      ],
      macro: [
        'https://www.fxstreet.com/rss/news',
        'https://feeds.bbci.co.uk/news/business/rss.xml'
      ],
      war: [
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://www.reutersagency.com/feed/?taxonomy=markets&post_type=reuters-best'
      ]
    };

    const selectedFeeds = feeds[category] || feeds.crypto;
    const allItems = [];

    for (const feedUrl of selectedFeeds) {
      try {
        const feed = await parser.parseURL(feedUrl);
        const items = feed.items.slice(0, 10).map(item => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          content: item.contentSnippet || item.content || '',
          source: feed.title || feedUrl
        }));
        allItems.push(...items);
      } catch (e) {
        console.warn(`[RSS] Falha ao parsear ${feedUrl}: ${e.message}`);
      }
    }

    // Ordenar por data e limitar a 20
    return allItems
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 20);
  }
};
