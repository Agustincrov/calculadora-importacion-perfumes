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

// ── PIX rate — Madrid Center API ─────────────────────────────────
// Returns the daily R$/USD rate. Field moeda2 = valor do PIX (e.g. 5.38).
// Response: [{"id":304,"datcam":"...","moeda1":1.0,"moeda2":5.38,...}]
async function fetchPixRate() {
  const r = await fetch('https://app.madridcenterimportados.com/v1/cambio', {
    headers: {
      'accept': 'application/json',
      'origin': 'https://www.madridcenterimportados.com',
      'referer': 'https://www.madridcenterimportados.com/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      'x-api-key': 'madrid_x78BZI-kpnzZf6JZCHdeJ9XEusvYLSqwLYsEhGPGGdA',
    },
  });
  const data = await r.json();
  const price = Array.isArray(data) && data.length > 0 ? data[0].moeda2 : null;
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
  if (nonPromoted.length > 0) {
    price = parseFloat(nonPromoted[0].adv.price);
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


async function fetchDolarBlue() {
  // infodolar.com Córdoba — server-rendered ASPX
  // The blue row has two <td class="colCompraVenta"> with data-order attributes.
  // First = compra, second = venta. Anchor on the href to avoid other "blue" occurrences.
  // Example: data-order="$ 1.430,00"
  const html = await fetchInfoDolarHtml();
  const m = html.match(/cotizacion-dolar-blue[\s\S]{0,1000}?data-order="\$\s*([\d.,]+)"[\s\S]{0,500}?data-order="\$\s*([\d.,]+)"/i);
  return jsonResp({ price: m ? parseArNum(m[2]) : null }); // m[2] = venta
}

async function fetchDolarOficial() {
  // BBVA Argentina — Vue SSR page (data-v-* attrs = Vue scoped styles, content IS in HTML)
  // Row: <td> Dolares </td><td> $&nbsp;1.390,00 </td><td> $&nbsp;1.440,00 </td>
  // 2nd td = compra, 3rd td = venta
  const r = await fetch('https://www.bbva.com.ar/personas/productos/inversiones/cotizacion-moneda-extranjera.html', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9',
    },
  });
  const html = await r.text();
  const m = html.match(/>\s*Dolares\s*<\/td>[\s\S]{0,300}?\$&nbsp;[\d.,]+[\s\S]{0,300}?\$&nbsp;([\d.,]+)/i);
  return jsonResp({ price: m ? parseArNum(m[1]) : null });
}

// ── Helpers ───────────────────────────────────────────────────────
function parseArNum(s) {
  // "1.430,00" → 1430.00
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
}
