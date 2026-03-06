// Cloudflare Worker — comparapi-proxy
// Handles: comparapix, Binance P2P USDT, dólar blue Córdoba + oficial (infodolar.com Córdoba), PIX rate (madridcenterimportados.com — SPA, always null)
//
// Deploy: paste this into the Cloudflare Worker dashboard at
// https://dash.cloudflare.com → Workers & Pages → comparapi-proxy → Edit Code

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

async function handle(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  const path = new URL(req.url).pathname;
  try {
    if (path === '/' || path === '/comparapix') return await proxyComparapix();
    if (path === '/pix-rate')      return await fetchPixRate();
    if (path === '/binance-usdt')  return await fetchBinanceUSDT();
    if (path === '/dolar-blue')    return await fetchDolarBlue();
    if (path === '/dolar-oficial') return await fetchDolarOficial();
    return jsonResp({ error: 'not found' }, 404);
  } catch (e) {
    return jsonResp({ error: e.message }, 500);
  }
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

// ── Comparapix (existing — backward compatible) ───────────────────
async function proxyComparapix() {
  const r = await fetch('https://api.comparapix.ar/quotes', {
    headers: {
      'Origin':  'https://comparapix.ar',
      'Referer': 'https://comparapix.ar/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  const data = await r.json();
  return jsonResp(data);
}

// ── PIX rate — madridcenterimportados.com ────────────────────────
// Extracts the daily R$/USD rate from the store's homepage.
// The value is in: <span class="text-kpurple/90">R$ 5,38</span>
async function fetchPixRate() {
  const r = await fetch('https://www.madridcenterimportados.com/home', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9,pt;q=0.8',
    },
  });
  const html = await r.text();

  // Primary: match the exact span class used on the page
  const m = html.match(/text-kpurple\/90[^>]*>\s*R\$\s*([\d,]+)/);
  let price = null;
  if (m) {
    // Brazilian format: "5,38" → 5.38
    price = parseFloat(m[1].replace(',', '.'));
  }

  return jsonResp({ price });
}

// ── Binance P2P — USDT/ARS sell price ────────────────────────────
// Returns the first non-promoted listing (skip index 0 which is typically the sponsored ad)
async function fetchBinanceUSDT() {
  const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify({
      fiat: 'ARS',
      page: 1,
      rows: 5,
      tradeType: 'SELL',
      asset: 'USDT',
      countries: [],
      proMerchantAds: false,
      shieldMerchantAds: false,
      filterType: 'all',
      periods: [],
      additionalKycVerifyFilter: 0,
      publisherType: null,
      payTypes: [],
      classifies: ['mass', 'profession', 'fiat_merchant', 'crypto_merchant'],
    }),
  });
  const data = await r.json();
  const ads = (data.data || []).filter(a => a.adv?.price);

  let price = null;
  // Promoted ads have classify === 'promoted'; skip them.
  // Fallback: always skip index 0 (the sponsored slot) if no explicit classify marker.
  const nonPromoted = ads.filter(a => a.adv?.classify !== 'promoted');
  if (nonPromoted.length > 1) {
    // Skip the first non-promoted (it occupies the sponsored slot in the UI)
    price = parseFloat(nonPromoted[1].adv.price);
  } else if (nonPromoted.length === 1) {
    price = parseFloat(nonPromoted[0].adv.price);
  } else if (ads.length > 1) {
    price = parseFloat(ads[1].adv.price);
  } else if (ads.length > 0) {
    price = parseFloat(ads[0].adv.price);
  }

  return jsonResp({ price });
}

// ── infodolar.com Córdoba — shared fetch ─────────────────────────
// Server-rendered ASPX — page has two sections:
//   Section 1 (before "blue"): oficial — Compra $X, Venta $Y
//   Section 2 (after "blue"):  blue    — Compra $X, Venta $Y
// Prices appear in Argentine format (e.g. 1.430,00). Compra comes first, Venta second.
async function fetchInfoDolarHtml() {
  const r = await fetch('https://www.infodolar.com/cotizacion-dolar-provincia-cordoba.aspx', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9',
    },
  });
  return r.text();
}

// Extract venta from a section: prices come in pairs compra (1st), venta (2nd).
function extractVenta(section) {
  const matches = [...section.matchAll(/(\d{1,2}\.\d{3},\d{2})/g)];
  if (matches.length >= 2) return parseArNum(matches[1][1]); // 2nd = venta
  if (matches.length === 1) return parseArNum(matches[0][1]);
  return null;
}

async function fetchDolarBlue() {
  const html = await fetchInfoDolarHtml();
  const blueIdx = html.toLowerCase().indexOf('blue');
  if (blueIdx < 0) return jsonResp({ price: null });
  // Take the ~1500 chars after "blue" to stay in the blue section
  const section = html.substring(blueIdx, blueIdx + 1500);
  return jsonResp({ price: extractVenta(section) });
}

async function fetchDolarOficial() {
  const html = await fetchInfoDolarHtml();
  // The oficial section is everything before "blue"
  const blueIdx = html.toLowerCase().indexOf('blue');
  const section = blueIdx > 0 ? html.substring(0, blueIdx) : html;
  return jsonResp({ price: extractVenta(section) });
}

// ── Helpers ───────────────────────────────────────────────────────
function parseArNum(s) {
  // "1.430,00" → 1430.00
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
}
