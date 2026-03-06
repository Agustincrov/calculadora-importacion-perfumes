// Cloudflare Worker — comparapi-proxy
// Handles: comparapix, Binance P2P USDT, dólar blue Córdoba (infodolar.com), dólar oficial (BBVA), PIX rate (madridcenterimportados.com)
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

// ── Dólar Blue Córdoba — infodolar.com ───────────────────────────
// infodolar.com is server-rendered ASPX → HTML scraping works
async function fetchDolarBlue() {
  const r = await fetch('https://www.infodolar.com/cotizacion-dolar-provincia-cordoba.aspx', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
    },
  });
  const html = await r.text();
  let price = null;

  // The page has a "blue" section. Look for the Venta value (Argentine number format: 1.430,00)
  // Strategy 1: find "blue" keyword close to a price pattern
  const m1 = html.match(/[Bb]lue[\s\S]{0,600}?(\d{1,2}\.\d{3},\d{2})/);
  if (m1) {
    price = parseArNum(m1[1]);
  }

  // Strategy 2: all Argentine-format prices → take the last one (sell is after buy)
  if (!price) {
    const all = [...html.matchAll(/(\d{1,2}\.\d{3},\d{2})/g)];
    if (all.length > 0) {
      price = parseArNum(all[all.length - 1][1]);
    }
  }

  return jsonResp({ price });
}

// ── Dólar Oficial BBVA ───────────────────────────────────────────
// BBVA uses Next.js — try to extract from __NEXT_DATA__ embedded JSON.
// Falls back to null; index.html will then use dolarapi.com as fallback.
async function fetchDolarOficial() {
  const r = await fetch('https://www.bbva.com.ar/personas/productos/inversiones/cotizacion-moneda-extranjera.html', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9',
    },
  });
  const html = await r.text();
  let price = null;

  // Try __NEXT_DATA__ (Next.js server-side props)
  const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (nd) {
    try {
      price = extractUSDVenta(JSON.parse(nd[1]));
    } catch (_) {}
  }

  // Try any embedded JSON blob in script tags
  if (!price) {
    for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
      const s = m[1];
      if (!s.includes('USD') && !s.includes('dolar') && !s.includes('divisa')) continue;
      const vm = s.match(/[Uu][Ss][Dd][\s\S]{0,300}?venta["'\s:]+(\d{3,4}(?:[.,]\d{1,2})?)/i)
              || s.match(/venta["'\s:]+(\d{3,4}(?:[.,]\d{1,2})?)[\s\S]{0,300}?[Uu][Ss][Dd]/i);
      if (vm) { price = parseFloat(vm[1].replace(',', '.')); break; }
    }
  }

  return jsonResp({ price });
}

// ── Helpers ───────────────────────────────────────────────────────
function parseArNum(s) {
  // "1.430,00" → 1430.00
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
}

function extractUSDVenta(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const keys = Object.keys(obj);
  const hasVenta = keys.some(k => ['venta','sell','saleRate','sale'].includes(k));
  const hasCode  = keys.some(k => ['code','iso','currency','name'].includes(k));
  if (hasVenta && hasCode) {
    const code = String(obj.code || obj.iso || obj.currency || obj.name || '').toUpperCase();
    if (code.includes('USD') || code.includes('DOLAR') || code.includes('DÓLAR')) {
      return obj.venta || obj.sell || obj.saleRate || obj.sale || null;
    }
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      const r = extractUSDVenta(v);
      if (r !== null) return r;
    }
  }
  return null;
}
