// Cloudflare Worker — comparapi-proxy
// Handles: comparapix, USDT/ARS (via CriptoYa), dólar blue Córdoba (infodolar.com),
// dólar oficial (via dolarapi.com), PIX rate — valor do PIX (madridcenterimportados.com BFF)
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

// ── PIX rate — Madrid Center BFF ─────────────────────────────────
// Madrid Center migrated off the old api-key'd `app.madridcenterimportados.com/v1/cambio`
// to an internal BFF with no auth. Same response shape, moeda2 = valor do PIX (e.g. 5.20).
// Response: [{"id":458,"datcam":"...","moeda1":1.0,"moeda2":5.20,...}]
async function fetchPixRate() {
  const r = await fetch('https://madridcenterimportados.com/bff/main/api/v3/cambio', {
    headers: {
      'accept': 'application/json',
      'origin': 'https://www.madridcenterimportados.com',
      'referer': 'https://www.madridcenterimportados.com/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    },
  });
  const data = await r.json();
  const price = Array.isArray(data) && data.length > 0 ? data[0].moeda2 : null;
  return jsonResp({ price });
}

// ── USDT/ARS — via dolarapi.com "dólar cripto" ────────────────────
// Binance's p2p.binance.com blocks Cloudflare Worker traffic with an HTML
// anti-bot challenge. CriptoYa (the next choice) also blocks Worker-to-Worker
// traffic (its Cloudflare WAF returns error 1106). dolarapi.com has no such
// block and its "cripto" casa is the standard USDT/ARS-equivalent rate.
async function fetchBinanceUSDT() {
  const r = await fetch('https://dolarapi.com/v1/dolares/cripto', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const data = await r.json();
  const price = typeof data?.venta === 'number' ? data.venta : null;
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
  // BBVA's cotización page stopped server-rendering the rate table (now client-fetched),
  // so scraping it no longer works. dolarapi.com is a public, purpose-built API for this.
  const r = await fetch('https://dolarapi.com/v1/dolares/oficial', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const data = await r.json();
  return jsonResp({ price: typeof data?.venta === 'number' ? data.venta : null });
}

// ── Helpers ───────────────────────────────────────────────────────
function parseArNum(s) {
  // "1.430,00" → 1430.00
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
}
