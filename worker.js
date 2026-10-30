// Cloudflare Worker — comparapi-proxy
// Handles: USDT/ARS (dolarapi.com "cripto" = precio de Binance P2P), catálogos de perfumes de
// Ponto Com (pontocom.com) y Star Company (starcompany-py.com), scraping del listado paginado, Multipass
// (multipass.com.py) y LG Importados (lgimportados.com), que tienen JSON pero no mandan CORS, y publicación de docs/catalogo.html en GitHub
// (/publish-catalog). Macedonia no pasa por acá: su hosting (SiteGround) le responde con un captcha a todo
// pedido que sale de Cloudflare; el catálogo se baja desde el navegador (ver index.html). Se paga solo en USDT: las rutas de PIX, comparapix, blue y oficial
// se sacaron el 2026-10-10.
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
    if (path === '/binance-usdt')  return await fetchBinanceUSDT();
    if (path === '/blue-cordoba')  return await fetchBlueCordoba();
    if (path === '/pontocom') {
      const q = new URL(req.url).searchParams;
      return await fetchPontocomPage(q.get('cat') || PONTOCOM_MAIN, parseInt(q.get('page'), 10));
    }
    if (path === '/starcompany') {
      return await fetchStarCompanyPage(parseInt(new URL(req.url).searchParams.get('page'), 10));
    }
    if (path === '/multipass') {
      return await fetchMultipassPage(parseInt(new URL(req.url).searchParams.get('page'), 10));
    }
    if (path === '/lgimportados') {
      return await fetchLgPage(parseInt(new URL(req.url).searchParams.get('page'), 10));
    }
    if (path === '/terranova') return await fetchTerraNovaPage(Number(new URL(req.url).searchParams.get('page')));
    if (path === '/bigs') return await fetchBigsPage(Number(new URL(req.url).searchParams.get('page')));
    if (path === '/shoppingchina') return await fetchShoppingChina(new URL(req.url).searchParams);
    if (path === '/publish-catalog' && req.method === 'POST') return await handlePublishCatalog(req);
    return jsonResp({ error: 'not found' }, 404);
  } catch (e) {
    return jsonResp({ error: e.message }, 500);
  }
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
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

// ── Dólar blue en Córdoba — via infodolar.com ─────────────────────
// dolarapi solo tiene el blue nacional (CABA), que en Córdoba suele diferir en $10–20.
// infodolar publica la tabla por provincia pero no manda CORS. Se toma la fila
// "Dólar Blue en Córdoba": la segunda celda colCompraVenta es la venta ("$ 1.591,00").
async function fetchBlueCordoba() {
  const r = await fetch('https://www.infodolar.com/cotizacion-dolar-provincia-cordoba.aspx', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  const html = await r.text();
  const i = html.indexOf('</a> en Córdoba');
  const cells = i < 0 ? [] : [...html.slice(i, i + 2000).matchAll(/colCompraVenta"[^>]*>\s*\$\s*([\d.]+,\d+)/g)];
  const parse = m => m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : null;
  const compra = parse(cells[0]), venta = parse(cells[1]);
  if (!venta) return jsonResp({ error: 'no se encontró el blue de Córdoba' }, 502);
  return jsonResp({ compra, venta, source: 'infodolar' });
}

// ── Ponto Com — catálogo de perfumes ─────────────────────────────
// El sitio no manda CORS, así que el navegador no puede leerlo directo. Una página por request:
// el plan free de Workers corta en 50 fetch externos por invocación y el catálogo tiene 127+ páginas.
//  - Paginación: SOLO funciona `categoria/<slug>/or-cod_desc/paginaN.html`. `/paginaN` a secas
//    devuelve la página 1 sin error. Y el orden por defecto ("relevância") se reacomoda mientras se
//    recorre (duplica y pierde productos) — por eso siempre or-cod_desc.
//  - Charset ISO-8859-1: r.text() asume UTF-8 y rompe los acentos de las marcas.
//  - Cada tarjeta trae data-product='{"name","code","price":"U$ 16,00","stock"}' (entidades escapadas);
//    las agotadas ("indisponível") tienen stock 0 y la clase label-out.
// Solo se aceptan estas categorías, para no ser un proxy abierto.
const PONTOCOM_MAIN = 'perfumes-body-splash-perfume-feminino-masculino-unissex';
const PONTOCOM_CATS = new Set([
  PONTOCOM_MAIN,
  'cuidado-e-beleza',
  'perfumes-arabes', 'perfumes-nicho',                              // señal de categoría
  'body-splash', 'spray-corporal', 'spray', 'perfume-para-cabelo',  // se excluyen del import
]);

async function fetchPontocomPage(cat, page) {
  if (!PONTOCOM_CATS.has(cat)) return jsonResp({ error: 'categoría no permitida' }, 400);
  if (!Number.isInteger(page) || page < 1 || page > 300) return jsonResp({ error: 'page inválida' }, 400);
  const r = await fetch(`https://www.pontocom.com/categoria/${cat}/or-cod_desc/pagina${page}.html`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    cf: { cacheTtl: 900, cacheEverything: true }, // 15 min: dos importaciones seguidas no le pegan 200 veces al sitio
  });
  if (!r.ok) return jsonResp({ error: `pontocom ${r.status}` }, 502);
  const html = new TextDecoder('iso-8859-1').decode(await r.arrayBuffer());

  const items = [];
  for (const card of html.split('<div class="product-wrap">').slice(1)) {
    const m = card.match(/data-product='([^']*)'/);
    if (!m) continue;
    let p;
    try { p = JSON.parse(decodeEntities(m[1])); } catch { continue; }
    items.push({
      code:  String(p.code),
      name:  decodeEntities(String(p.name || '')).replace(/\s+/g, ' ').trim(),
      price: parseArNum(String(p.price || '').replace(/^\s*U\$\s*/, '')), // "1.250,00" → 1250
      stock: Number(p.stock) || 0,
      out:   /label-out/.test(card),
    });
  }

  const out = { page, items };
  if (cat === PONTOCOM_MAIN && page === 1) {
    // Filtro de marcas del sidebar: <input … id="brand_id_2070"> <label …> MAX&CO</label>
    out.brands = [...html.matchAll(/id="brand_id_\d+">\s*<label[^>]*>\s*([^<]+?)\s*<\/label>/g)]
      .map(x => decodeEntities(x[1]));
  }
  return jsonResp(out);
}

function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'); // último: si no, "&amp;quot;" terminaría como comilla
}

// ── Star Company — catálogo de perfumes ──────────────────────────
// PrestaShop con un módulo propio de categoría (categoria-premium/121 = PERFUMES). Sin CORS ni API
// pública, igual que Ponto Com. El listado solo muestra productos con stock y acepta hasta n=96 por
// página (~22 páginas). Cada tarjeta: <article class="scp-card"> con .scp-brand, <h2><a href=…/ID-slug.html>
// nombre</a></h2>, .scp-price "U$ 13,99" y .scp-stock "228 In Stock". Una página por request.
async function fetchStarCompanyPage(page) {
  if (!Number.isInteger(page) || page < 1 || page > 100) return jsonResp({ error: 'page inválida' }, 400);
  const r = await fetch(`https://www.starcompany-py.com/categoria-premium/121?fc=module&order=position&n=96&p=${page}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!r.ok) return jsonResp({ error: `starcompany ${r.status}` }, 502);
  const html = await r.text();

  const text = re => (re ? decodeEntities(re[1]).replace(/\s+/g, ' ').trim() : '');
  const items = [];
  for (const card of html.split('<article class="scp-card">').slice(1)) {
    const link = card.match(/<h2><a href="[^"]*\/(\d+)-[^"]*">([^<]*)<\/a>/);
    if (!link) continue;
    items.push({
      code:  link[1],
      name:  text([, link[2]]),
      brand: text(card.match(/class="scp-brand">([^<]*)</)),
      price: parseArNum(text(card.match(/class="scp-price">([^<]*)</)).replace(/^U\$\s*/, '')), // "1.250,00" → 1250
      stock: parseInt(text(card.match(/class="scp-stock[^"]*">([^<]*)</)), 10) || 0,
    });
  }
  const total = html.match(/Existem\s+([\d.]+)\s+produtos/);
  return jsonResp({ page, total: total ? parseInt(total[1].replace(/\./g, ''), 10) : null, items });
}

// ── Multipass — catálogo de perfumes ─────────────────────────────
// PrestaShop clásico (categoría 12 "Perfume"). Con Accept: application/json + X-Requested-With el listado
// devuelve JSON (`products[]` con id_product, name, price_amount, availability) en lugar de HTML. Acepta
// hasta resultsPerPage=36 (más vuelve a 12). Lista también los agotados (availability "unavailable").
async function fetchMultipassPage(page) {
  if (!Number.isInteger(page) || page < 1 || page > 100) return jsonResp({ error: 'page inválida' }, 400);
  const r = await fetch(`https://multipass.com.py/12-perfume?resultsPerPage=36&page=${page}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
    },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!r.ok) return jsonResp({ error: `multipass ${r.status}` }, 502);
  let d;
  try { d = await r.json(); } catch { return jsonResp({ error: 'multipass no devolvió JSON' }, 502); }
  const items = (d.products || []).map(p => ({
    code:  String(p.id_product),
    name:  decodeEntities(String(p.name || '')).replace(/\s+/g, ' ').trim(),
    price: Number(p.price_amount) || 0,
    available: p.availability !== 'unavailable',
  }));
  return jsonResp({ page, total: Number(d.pagination && d.pagination.total_items) || null, items });
}

// ── LG Importados — catálogo de perfumes ─────────────────────────
// La tienda (React) lee su API Spring en el mismo dominio: /produtos?categoriaPrincipal=PERFUMARIA&page=N
// (desde 0)&size=100 (100 es el máximo). La API responde 403 "Invalid CORS request" a cualquier Origin
// ajeno, así que el navegador no puede leerla; sin Origin (como acá) responde normal. Cada producto trae
// descripciones HTML largas: se devuelven solo los campos que usa la app.
async function fetchLgPage(page) {
  if (!Number.isInteger(page) || page < 0 || page > 100) return jsonResp({ error: 'page inválida' }, 400);
  const r = await fetch(`https://www.lgimportados.com/produtos?categoriaPrincipal=PERFUMARIA&page=${page}&size=100`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!r.ok) return jsonResp({ error: `lgimportados ${r.status}` }, 502);
  let d;
  try { d = await r.json(); } catch { return jsonResp({ error: 'lgimportados no devolvió JSON' }, 502); }
  const items = (d.produtos || []).map(p => ({
    code:  String(p.sku),
    name:  String(p.nome || '').replace(/\s+/g, ' ').trim(),
    brand: p.nomeMarca || '',
    price: Number(p.precoPromocional) > 0 ? Number(p.precoPromocional) : Number(p.precoVenda) || 0,
    stock: p.temEstoque === 1 || p.temEstoque === true,
    sub1:  p.subcategoria1 || '',
    sub2:  p.subcategoria2 || '',
  }));
  return jsonResp({ page, total: d.totalElements ?? null, pages: d.totalPages ?? null, items });
}

// ── Cosmética coreana — una página o ficha por pedido ─────────────
async function fetchKbeautyPage(url, json = false) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      'Accept': json ? 'application/json' : 'text/html,application/xhtml+xml',
      ...(json ? { 'X-Requested-With': 'XMLHttpRequest' } : {}),
    },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!r.ok) throw new Error(`${new URL(url).hostname} respondió ${r.status}`);
  return json ? r.json() : r.text();
}

function kbeautyHtmlText(s) {
  return decodeEntities(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// Delimita el elemento completo para no incluir tarjetas del menú o productos recomendados.
function kbeautyHtmlBlocks(html, className) {
  const out = [];
  const tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  let m, start = -1, tag = '', depth = 0;
  while ((m = tags.exec(html))) {
    const closing = m[0][1] === '/';
    if (start < 0) {
      const cls = m[0].match(/\bclass=["']([^"']*)["']/i);
      if (!closing && cls && cls[1].split(/\s+/).includes(className)) {
        start = m.index; tag = m[1].toLowerCase(); depth = 1;
      }
    } else if (m[1].toLowerCase() === tag) {
      depth += closing ? -1 : 1;
      if (!depth) { out.push(html.slice(start, tags.lastIndex)); start = -1; }
    }
  }
  return out;
}

async function fetchTerraNovaPage(page) {
  if (!Number.isInteger(page) || page < 1 || page > 80) return jsonResp({ error: 'page inválida' }, 400);
  const suffix = page === 1 ? '' : `,${page},destaque`;
  const html = await fetchKbeautyPage(`https://www.shoppingterranova.com.py/CategoriaId_4${suffix}/ESTETICA-FACIAL.html`);
  const listing = kbeautyHtmlBlocks(html, 'collapse-products')[0];
  if (!listing) return jsonResp({ error: 'terranova: no se encontró el listado' }, 502);
  const total = kbeautyHtmlText(listing).match(/([\d.]+)\s+productos/);
  const items = kbeautyHtmlBlocks(listing, 'prod-item').map(card => ({
    code: kbeautyHtmlText(kbeautyHtmlBlocks(card, 'prod-cod')[0]).replace(/^Cód\.\s*/i, ''),
    name: kbeautyHtmlText(card.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]),
    price: Number(kbeautyHtmlText(kbeautyHtmlBlocks(card, 'price')[0]).match(/USD\s*([\d,]+\.\d{2})/)?.[1]?.replace(/,/g, '')) || null,
  })).filter(x => x.code && x.name);
  return jsonResp({ page, total: total ? Number(total[1].replace(/\./g, '')) : null, items });
}

async function fetchBigsPage(page) {
  if (!Number.isInteger(page) || page < 1 || page > 60) return jsonResp({ error: 'page inválida' }, 400);
  const d = await fetchKbeautyPage(`https://bigs.com.py/188-cosmeticos?page=${page}&ajax=1`, true);
  if (!Array.isArray(d.products) || !d.pagination) return jsonResp({ error: 'bigs: listado inválido' }, 502);
  const cards = new Map([...String(d.rendered_products || '').matchAll(/<article\b[^>]*data-id-product="(\d+)"[^>]*>[\s\S]*?<\/article>/g)].map(m => [m[1], m[0]]));
  const items = d.products.map(p => {
    const card = cards.get(String(p.id_product)) || '';
    const stock = kbeautyHtmlText(kbeautyHtmlBlocks(card, 'in-stock')[0]).match(/(\d+)\s+In Stock/i);
    return {
      code: String(p.reference || p.id_product), name: kbeautyHtmlText(p.name), price: Number(p.price_amount) || null,
      brand: kbeautyHtmlText(kbeautyHtmlBlocks(card, 'manufacturer')[0]), stock: stock ? Number(stock[1]) : null,
    };
  });
  return jsonResp({ page, pages: Number(d.pagination.pages_count), items });
}

async function fetchShoppingChina(q) {
  const product = q.get('product');
  if (product !== null) {
    if (!/^\/producto\/[a-z0-9-]+$/.test(product)) return jsonResp({ error: 'product inválido' }, 400);
    const html = await fetchKbeautyPage(`https://www.shoppingchina.com.py${product}`);
    let data;
    for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const parsed = JSON.parse(m[1]);
        const list = Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed];
        data = list.find(x => x['@type'] === 'Product') || data;
      } catch { /* Un bloque ajeno inválido no impide leer el producto. */ }
    }
    const section = kbeautyHtmlBlocks(html, 'product-variation-container')[0] || '';
    const usd = kbeautyHtmlText(section).match(/U\$\s*([\d.]+,\d{2})\s*TAX FREE/i);
    const availability = data?.offers?.availability || '';
    return jsonResp({
      code: product.match(/-(\d+)$/)?.[1] || '',
      name: kbeautyHtmlText(section.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1] || data?.name),
      price: usd ? parseArNum(usd[1]) : null,
      inStock: /\/InStock$/.test(availability) ? true : /\/OutOfStock$/.test(availability) ? false : null,
      brand: kbeautyHtmlText(data?.brand?.name),
    });
  }
  const query = (q.get('query') || '').trim(), page = Number(q.get('page') || 1);
  if (!query || query.length > 60) return jsonResp({ error: 'query inválida' }, 400);
  if (!Number.isInteger(page) || page < 1 || page > 20) return jsonResp({ error: 'page inválida' }, 400);
  const html = await fetchKbeautyPage('https://www.shoppingchina.com.py/site/search?' + new URLSearchParams({ query, page }));
  const items = kbeautyHtmlBlocks(html, 'product-item').map(card => {
    const path = card.match(/href="(\/producto\/[a-z0-9-]+)"/)?.[1] || '';
    return { code: path.match(/-(\d+)$/)?.[1] || '', name: kbeautyHtmlText(kbeautyHtmlBlocks(card, 'lightning-prod-desc')[0]), path };
  }).filter(x => x.code && x.name);
  const text = kbeautyHtmlText(html);
  const total = text.match(/Mostrando productos\b.*?\bde\s+([\d.,]+)\s+en total/i) || text.match(/Mostrando (?:todos\/as los\/as|tod[oa]s?\s+l[oa]s?)\s+([\d.,]+)\s+productos/i);
  if (!items.length && !/Mostrando|No se encontr|No hay productos/i.test(text)) return jsonResp({ error: 'shoppingchina: no se encontró el listado' }, 502);
  return jsonResp({ page, total: total ? Number(total[1].replace(/[.,]/g, '')) : items.length, items });
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
  // "1.250,00" → 1250.00 (precios de Ponto Com)
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
