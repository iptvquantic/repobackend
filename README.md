# NEXUS HUB v3.2 - Backend

Backend proxy Node.js + Express para o dashboard NEXUS HUB.
Resolve CORS, implementa cache e rate limiting.

## Estrutura (Raiz do Repositório)

```
├── package.json          <- Deve estar na RAIZ para o Render funcionar
├── server.js             <- Entry point Express
├── routes/
│   └── api.js            <- 10 endpoints proxy
├── services/
│   ├── fetcher.js        <- Fetch com retry (3x + backoff)
│   └── cache.js          <- Cache em memória (node-cache)
└── public/
    └── index.html        <- Frontend v3.2 (cole seu HTML aqui)
```

## Deploy no Render (Gratuito)

### 1. Preparar no GitHub
- Crie um repositório (ex: `repobackend`)
- Faça upload destes arquivos na **RAIZ** (não em subpasta)
- O `package.json` DEVE estar na raiz do repo

### 2. Configurar no Render
1. Acesse https://dashboard.render.com
2. New > Web Service
3. Conecte seu repositório GitHub
4. **Settings importantes:**
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (ou `node server.js`)
   - **Root Directory:** `.` (deixe padrão, aponta para raiz)
   - **Plan:** Free

5. Deploy!

### 3. Verificar deploy
- Health check: `https://SEU-SERVICO.onrender.com/health`
- Teste API: `https://SEU-SERVICO.onrender.com/api/prices`
- Cache stats: `https://SEU-SERVICO.onrender.com/admin/cache`

### 4. Conectar Frontend
No seu `index.html` (dentro da pasta `public/` ou no GitHub Pages separado):

```javascript
const API_BASE = 'https://SEU-SERVICO.onrender.com';

async function fetchAPI(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}
```

## Endpoints

| Endpoint | Cache | Fonte |
|----------|-------|-------|
| GET /api/prices | 60s | CoinGecko (6 criptos) |
| GET /api/ticker | 120s | CoinGecko (top 10) |
| GET /api/global | 120s | CoinGecko (global) |
| GET /api/fng | 300s | Alternative.me (Fear & Greed) |
| GET /api/rsi?tf=1d | 90s | Binance (klines BTC) |
| GET /api/usdbrl | 300s | Open ER |
| GET /api/trending | 300s | CoinGecko |
| GET /api/heatmap | 120s | CoinGecko (top 50) |
| GET /api/top100 | 120s | CoinGecko (top 100) |
| GET /api/news/:cat | 600s | RSS (crypto/ai/macro/war) |
| GET /health | - | Health check |
| GET /admin/cache | - | Estatísticas |

## Rate Limits
- Geral: 60 req/min por IP
- CoinGecko: 30 req/min por IP

## Variáveis de Ambiente (opcional)
- `PORT` - porta do servidor (padrão: 3000)

## Solução de Problemas

### Build failed ENOENT package.json
**Causa:** package.json não está na raiz do repositório.  
**Solução:** Mova todos os arquivos deste backend para a raiz do repo, não para subpastas.

### CORS Error no frontend
**Causa:** Origem não está na whitelist do CORS.  
**Solução:** Edite `server.js` e adicione sua URL do GitHub Pages no array `origin` do middleware CORS.

### 429 Too Many Requests (CoinGecko)
**Causa:** CoinGecko limita IPs gratuitos.  
**Solução:** O cache de 60-300s já mitiga. Se persistir, aumente os TTLs ou considere API key paga.
