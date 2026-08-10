// Cloudflare Worker — comparapi-proxy
// Handles: comparapix, USDT/ARS (via CriptoYa), dólar blue Córdoba (infodolar.com),
// dólar oficial (via dolarapi.com), PIX rate — valor do PIX (madridcenterimportados.com BFF)
//
// Deploy: paste this into the Cloudflare Worker dashboard at
// https://dash.cloudflare.com → Workers & Pages → comparapi-proxy → Edit Code

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Publish-Secret',
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
    if (path === '/publish-catalog' && req.method === 'POST') return await handlePublishCatalog(req);
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

// ── Publicar catalogo.html en GitHub Pages ─────────────────────────
// Requiere dos "Environment Variables" (tipo Secret) configuradas en el dashboard
// del Worker (Settings → Variables):
//   GITHUB_TOKEN    — fine-grained PAT, permiso "Contents: Read and write" SOLO
//                      en el repo calculadora-importacion-perfumes, nada más.
//   PUBLISH_SECRET  — cualquier string random largo, el mismo que se pega una vez
//                      en la app (Generador de listas → Publicar catálogo).
// El token nunca sale del Worker — el navegador solo manda el HTML + el secreto compartido.
const GITHUB_OWNER = 'Agustincrov';
const GITHUB_REPO  = 'calculadora-importacion-perfumes';
const CATALOG_PATH = 'docs/catalogo.html';

async function handlePublishCatalog(req) {
  const secret = req.headers.get('X-Publish-Secret');
  if (!secret || !PUBLISH_SECRET || secret !== PUBLISH_SECRET) {
    return jsonResp({ error: 'unauthorized' }, 401);
  }

  let body;
  try { body = await req.json(); } catch { return jsonResp({ error: 'invalid json' }, 400); }
  const html = body?.html;
  if (typeof html !== 'string' || html.length === 0) {
    return jsonResp({ error: 'missing html' }, 400);
  }
  if (html.length > 3_000_000) {
    return jsonResp({ error: 'archivo demasiado grande' }, 413);
  }

  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CATALOG_PATH}`;
  const ghHeaders = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'User-Agent': 'importo-catalog-publisher',
    'Accept': 'application/vnd.github+json',
  };

  // 1. Sha del archivo actual (si existe) — GitHub lo exige para actualizar, no para crear.
  let sha;
  const getResp = await fetch(apiUrl, { headers: ghHeaders });
  if (getResp.ok) {
    sha = (await getResp.json()).sha;
  } else if (getResp.status !== 404) {
    return jsonResp({ error: 'no se pudo leer el archivo actual', detail: await getResp.text() }, 502);
  }

  // 2. Crear/actualizar el archivo
  const putResp = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...ghHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Actualizar catálogo — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
      content: utf8ToBase64(html),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!putResp.ok) {
    return jsonResp({ error: 'no se pudo pushear a GitHub', detail: await putResp.text() }, 502);
  }

  return jsonResp({
    ok: true,
    // GitHub Pages sirve desde /docs como raíz del sitio — NO se antepone "docs/" a la URL pública,
    // aunque el archivo viva en ese path dentro del repo (por eso no reusamos CATALOG_PATH acá).
    url: `https://${GITHUB_OWNER.toLowerCase()}.github.io/${GITHUB_REPO}/catalogo.html`,
  });
}

// ── Helpers ───────────────────────────────────────────────────────
function parseArNum(s) {
  // "1.430,00" → 1430.00
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
