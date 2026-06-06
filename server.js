const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const apiRoutes = require('./api');  // <-- na raiz, não em routes/

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://iptvquantic.github.io', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Rate limit exceeded. Max 60 req/min.' }
});

const coingeckoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'CoinGecko rate limit exceeded. Max 30 req/min.' }
});

app.use(generalLimiter);
app.use('/api/prices', coingeckoLimiter);
app.use('/api/ticker', coingeckoLimiter);
app.use('/api/global', coingeckoLimiter);
app.use('/api/trending', coingeckoLimiter);
app.use('/api/heatmap', coingeckoLimiter);
app.use('/api/top100', coingeckoLimiter);

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'NEXUS HUB Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString() 
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log('NEXUS HUB Backend v1.0 rodando na porta ' + PORT);
});
