// Cloudflare Worker — comparapi-proxy
// Handles: USDT/ARS (dolarapi.com "cripto" = precio de Binance P2P), catálogos de perfumes de
// Ponto Com (pontocom.com) y Star Company (starcompany-py.com), scraping del listado paginado, Multipass
// (multipass.com.py) y LG Importados (lgimportados.com), que tienen JSON pero no mandan CORS, cosmética coreana (Bigs,
// Shopping China, Ponto Com, LG, Mega Eletro, Flash Importados, Star Company e Intershop), perfumes de Intershop y publicación de docs/catalogo.html en GitHub
// (/publish-catalog). Macedonia no pasa por acá: su hosting (SiteGround) le responde con un captcha a todo
// pedido que sale de Cloudflare; el catálogo se baja desde el navegador (ver index.html). Se paga solo en USDT: las rutas de PIX, comparapix, blue y oficial
// se sacaron el 2026-10-10.
//
// Deploy: paste this into the Cloudflare Worker dashboard at
// https://dash.cloudflare.com → Workers & Pages → comparapi-proxy → Edit Code
// Formato de módulos. Secrets: PUBLISH_SECRET y GITHUB_TOKEN.
// Bindings para fotos: FOTOS (bucket R2 privado silkface-fotos) e IMAGES (Images).
// Pegar el módulo completo y hacer Deploy; no forma parte del deploy de assets de la app.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Publish-Secret',
  'Content-Type': 'application/json',
};

export default {
  async fetch(req, env, ctx) {
    return handle(req, env);
  },
};

async function handle(req, env) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  const path = new URL(req.url).pathname;
  try {
    if (path === '/fotos/preparar' && req.method === 'POST') return await handlePreparePhotos(req, env);
    if (path.startsWith('/f/') && req.method === 'GET') return await handlePhoto(path.slice(3), env);
    if (path === '/binance-usdt')  return await fetchBinanceUSDT();
    if (path === '/blue-cordoba')  return await fetchBlueCordoba();
    if (path === '/pontocom') {
      const q = new URL(req.url).searchParams;
      return await fetchPontocomPage(q.get('cat') || PONTOCOM_MAIN, parseInt(q.get('page'), 10));
    }
    if (path === '/starcompany') {
      const q = new URL(req.url).searchParams;
      return await fetchStarCompanyPage(parseInt(q.get('page'), 10), q.get('cat') || '121');
    }
    if (path === '/multipass') {
      return await fetchMultipassPage(parseInt(new URL(req.url).searchParams.get('page'), 10));
    }
    if (path === '/lgimportados') {
      const q = new URL(req.url).searchParams;
      return await fetchLgPage(parseInt(q.get('page'), 10), q.get('cat') || 'PERFUMARIA');
    }
    if (path === '/bigs') return await fetchBigsPage(Number(new URL(req.url).searchParams.get('page')));
    if (path === '/shoppingchina') return await fetchShoppingChina(new URL(req.url).searchParams);
    if (path === '/megaeletro') return await fetchMegaEletroPage(new URL(req.url).searchParams);
    if (path === '/flash') return await fetchFlashPage(Number(new URL(req.url).searchParams.get('page')));
    if (path === '/intershop') return await fetchIntershopPage(new URL(req.url).searchParams);
    if (path === '/publish-catalog' && req.method === 'POST') return await handlePublishCatalog(req, env);
    // La app lo consulta antes de publicar una lista que no sea el catálogo: un Worker viejo no la conoce.
    if (path === '/publish-targets') return jsonResp({ targets: Object.keys(PUBLISH_TARGETS) });
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
    let img = '';
    try {
      if (typeof p.image === 'string' && p.image) {
        const url = new URL(p.image, 'https://www.pontocom.com/');
        if (url.protocol === 'https:') img = url.href;
      }
    } catch { /* Una URL inválida no impide importar el producto. */ }
    items.push({
      img,
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

// ── Star Company — perfumes y cosmética ─────────────────────────
// PrestaShop con un módulo propio de categoría (categoria-premium/121 = PERFUMES). Sin CORS ni API
// pública, igual que Ponto Com. El listado solo muestra productos con stock y acepta hasta n=96 por
// página (~22 páginas). Cada tarjeta: <article class="scp-card"> con .scp-brand, <h2><a href=…/ID-slug.html>
// nombre</a></h2>, .scp-price "U$ 13,99" y .scp-stock "228 In Stock". Una página por request.
// cat: 121 = PERFUMES, 100 = COSMETICOS (cosmética coreana, 2026-11-01; misma tarjeta).
const STAR_CATS = ['121', '100'];
async function fetchStarCompanyPage(page, cat) {
  if (!Number.isInteger(page) || page < 1 || page > 100) return jsonResp({ error: 'page inválida' }, 400);
  if (!STAR_CATS.includes(cat)) return jsonResp({ error: 'cat inválida' }, 400);
  const r = await fetch(`https://www.starcompany-py.com/categoria-premium/${cat}?fc=module&order=position&n=96&p=${page}`, {
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
    const src = decodeEntities(card.match(/<a\b[^>]*class="scp-img"[^>]*>([\s\S]*?)<\/a>/)?.[1]?.match(/<img\b[^>]*\bsrc="([^"]*)"/)?.[1] || '');
    const img = src.startsWith('https://') ? src : '';
    items.push({
      img,
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
// cat=COSMETICOS (card 20): la misma API para la línea de cosmética coreana.
const LG_CATS = ['PERFUMARIA', 'COSMETICOS'];
async function fetchLgPage(page, cat = 'PERFUMARIA') {
  if (!Number.isInteger(page) || page < 0 || page > 100) return jsonResp({ error: 'page inválida' }, 400);
  if (!LG_CATS.includes(cat)) return jsonResp({ error: 'cat inválida' }, 400);
  const r = await fetch(`https://www.lgimportados.com/produtos?categoriaPrincipal=${cat}&page=${page}&size=100`, {
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
    img: typeof p.urls?.[0] === 'string' && p.urls[0].startsWith('https://') ? p.urls[0] : '',
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

async function fetchBigsPage(page) {
  if (!Number.isInteger(page) || page < 1 || page > 20) return jsonResp({ error: 'page inválida' }, 400);
  const d = await fetchKbeautyPage(`https://bigs.com.py/188-cosmeticos?page=${page}&resultsPerPage=100&ajax=1`, true);
  if (!Array.isArray(d.products) || !d.pagination) return jsonResp({ error: 'bigs: listado inválido' }, 502);
  const cards = new Map([...String(d.rendered_products || '').matchAll(/<article\b[^>]*data-id-product="(\d+)"[^>]*>[\s\S]*?<\/article>/g)].map(m => [m[1], m[0]]));
  const items = d.products.map(p => {
    const card = cards.get(String(p.id_product)) || '';
    const stock = kbeautyHtmlText(kbeautyHtmlBlocks(card, 'in-stock')[0]).match(/(\d+)\s+In Stock/i);
    return {
      img: typeof p.cover?.bySize?.medium_default?.url === 'string' && p.cover.bySize.medium_default.url.startsWith('https://') ? p.cover.bySize.medium_default.url : '',
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
  // ?brands=1: marcas del filtro de la categoría Cosméticos. ?brandIds=[..]&page=N: esa categoría filtrada por
  // esas marcas, 24 por página (una sola lista para todas las marcas coreanas, sin usar el buscador del sitio).
  const base = 'https://www.shoppingchina.com.py/cosmeticos';
  if (q.get('brands') === '1') {
    const html = await fetchKbeautyPage(base);
    const brands = [...html.matchAll(/name="brand"[^>]*value="(\d+)"[^>]*>\s*<label\b[^>]*>\s*([^<]+?)\s*<\/label>/g)]
      .map(m => ({ id: Number(m[1]), name: decodeEntities(m[2]) }));
    if (!brands.length) return jsonResp({ error: 'shoppingchina: no se encontró el filtro de marcas' }, 502);
    return jsonResp({ brands });
  }
  let ids;
  try { ids = JSON.parse(q.get('brandIds') || ''); } catch { ids = null; }
  if (!Array.isArray(ids) || !ids.length || ids.length > 80 || !ids.every(n => Number.isInteger(n) && n > 0 && n < 1e6)) {
    return jsonResp({ error: 'brandIds inválido' }, 400);
  }
  const page = Number(q.get('page') || 1);
  if (!Number.isInteger(page) || page < 1 || page > 60) return jsonResp({ error: 'page inválida' }, 400);
  const html = await fetchKbeautyPage(base + '?' + new URLSearchParams({ filter: '', brands: JSON.stringify(ids), page }));
  const items = kbeautyHtmlBlocks(html, 'product-item').map(card => {
    const path = card.match(/href="(\/producto\/[a-z0-9-]+)"/)?.[1] || '';
    // Precio en guaraníes: el último "Gs." de la tarjeta (con oferta, los anteriores son los tachados).
    const gs = [...kbeautyHtmlText(card).matchAll(/Gs\.\s*([\d.]+)/g)].pop();
    return { code: path.match(/-(\d+)$/)?.[1] || '', name: kbeautyHtmlText(kbeautyHtmlBlocks(card, 'lightning-prod-desc')[0]), path,
      pyg: gs ? Number(gs[1].replace(/\./g, '')) : null };
  }).filter(x => x.code && x.name);
  const total = kbeautyHtmlText(html).match(/Mostrando productos\b.*?\bde\s+([\d.,]+)\s+en total/i);
  if (!total) return jsonResp({ error: 'shoppingchina: no se encontró el listado' }, 502);
  return jsonResp({ page, total: Number(total[1].replace(/[.,]/g, '')), items });
}

// Mega Eletro (megaeletronicos.com, Laravel): categoría Cosméticos (17) con stock, 42 por página. Cada tarjeta trae
// el producto entero en JSON dentro del onclick de "favoritos" (precio, promo, stock, marca). El sitio corta la
// conexión desde la página 20 (de ~23): se recorre ordenado por nombre de los dos lados (asc y desc, hasta la 12) y la
// app junta los resultados. Con 4 pedidos a la vez responde 429: la app pide de a 2.
async function fetchMegaEletroPage(q) {
  const page = Number(q.get('page')), order = q.get('order') || 'asc';
  if (!Number.isInteger(page) || page < 1 || page > 19) return jsonResp({ error: 'page inválida' }, 400);
  if (order !== 'asc' && order !== 'desc') return jsonResp({ error: 'order inválido' }, 400);
  const html = await fetchKbeautyPage(`https://www.megaeletronicos.com/producto/categoria/cosmeticos/17?available=yes&order_name=${order}&page=${page}`);
  const items = [];
  for (const m of html.matchAll(/addItemToFavorite\((\{[\s\S]*?\})\)"/g)) {
    let x;
    try { x = JSON.parse(decodeEntities(m[1])); } catch { continue; }
    let img = '';
    try {
      if (typeof x.image === 'string' && x.image) {
        const url = new URL(x.image, 'https://resource.megaeletronicos.com');
        if (url.protocol === 'https:') img = url.href;
      }
    } catch { /* Una URL inválida no impide importar el producto. */ }
    const promo = Number(x.price_promo);
    items.push({
      img,
      code: String(x.code || x.id), name: String(x.product_lang?.name_web || x.product_lang?.name || '').replace(/\s+/g, ' ').trim(),
      price: promo > 0 ? promo : Number(x.price) || null, stock: Number(x.stock) || 0, brand: x.brand?.name || '',
    });
  }
  const pages = Math.max(0, ...[...html.matchAll(/[?&](?:amp;)?page=(\d+)/g)].map(m => Number(m[1])));
  if (!items.length && page === 1) return jsonResp({ error: 'megaeletro: no se encontró el listado' }, 502);
  return jsonResp({ page, order, pages, items });
}

// Flash Importados (flashimportados.com): categoría Facial, 50 por página (~25). Tarjeta: "Código: <span>N</span>",
// link /brand/…, <h2> con el nombre y "U$ 17,00"; los agotados no muestran precio.
async function fetchFlashPage(page) {
  if (!Number.isInteger(page) || page < 1 || page > 60) return jsonResp({ error: 'page inválida' }, 400);
  const html = await fetchKbeautyPage(`https://flashimportados.com/category/facial?page=${page}`);
  const items = html.split(/Código:\s*<span>/).slice(1).map(part => {
    const price = part.match(/U\$\s*([\d.]+,\d{2})/);
    return {
      code: part.match(/^(\d+)/)?.[1] || '',
      name: kbeautyHtmlText(part.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1]),
      brand: kbeautyHtmlText(part.slice(0, 800).match(/\/brand\/[^"]*"[^>]*>([^<]*)<\/a>/)?.[1]),
      price: price ? parseArNum(price[1]) : null,
    };
  }).filter(x => x.code && x.name);
  const pages = Math.max(0, ...[...html.matchAll(/[?&](?:amp;)?page=(\d+)/g)].map(m => Number(m[1])));
  if (!items.length && page === 1) return jsonResp({ error: 'flash: no se encontró el listado' }, 502);
  return jsonResp({ page, pages, items });
}

// Intershop Importados (intershop.com.py, Laravel): listado HTML, 120 por página (el sitio acepta cualquier qty, pero
// una página de 1000 pesa 3,4 MB). La tarjeta trae precio "U$35.00", código (intershop-product-ref) y el nombre cortado
// ("…Eau de Par..."); el nombre completo sale del JSON-LD ItemList de la misma página, cruzado por la URL del producto.
const INTERSHOP_CATS = {
  perfumes: 'beleza-7/perfumes-27',
  arabes: 'beleza-7/perfumes-27/perfumes-arabes-141',
  cosmeticos: 'beleza-7/cosmeticos-266',
};
async function fetchIntershopPage(q) {
  const cat = q.get('cat') || 'perfumes', page = Number(q.get('page') || 1);
  if (!INTERSHOP_CATS[cat]) return jsonResp({ error: 'cat inválida' }, 400);
  if (!Number.isInteger(page) || page < 1 || page > 30) return jsonResp({ error: 'page inválida' }, 400);
  const html = await fetchKbeautyPage(`https://intershop.com.py/category/${INTERSHOP_CATS[cat]}?qty=120&sort=name_asc&page=${page}`);
  const fullNames = {};
  for (const m of html.matchAll(/"name":\s*"((?:[^"\\]|\\.)*)",\s*"url":\s*"(https:\/\/intershop\.com\.py\/item\/[^"]+)"/g)) {
    try { fullNames[m[2]] = JSON.parse('"' + m[1] + '"'); } catch { /* Se usa el nombre de la tarjeta. */ }
  }
  const items = html.split('intershop-product-card"').slice(1).map(card => {
    const url = card.match(/href="(https:\/\/intershop\.com\.py\/item\/[^"]+)"/)?.[1] || '';
    const price = card.match(/intershop-product-price">\s*U\$\s*([\d.,]+)/);
    let img = '';
    const tag = card.match(/<img\b[^>]*\bclass=["']([^"']*\s)?intershop-product-img(?:\s[^"']*)?["'][^>]*>/i)?.[0];
    const src = tag?.match(/\ssrc=["']([^"']*)["']/i)?.[1];
    if (src) {
      try {
        const url = new URL(decodeEntities(src), 'https://intershop.com.py/');
        if (url.protocol === 'https:') img = url.href;
      } catch { /* Sin foto válida. */ }
    }
    return {
      code: kbeautyHtmlText(card.match(/intershop-product-ref[^>]*>([^<]*)</)?.[1]) || url.match(/-(\d+)$/)?.[1] || '',
      name: kbeautyHtmlText(fullNames[url] || card.match(/intershop-product-name">([^<]*)</)?.[1]),
      price: price ? Number(price[1].replace(/,/g, '')) || null : null,
      stock: card.includes('add-to-cart-btn') ? 1 : 0,
      img,
    };
  }).filter(x => x.code && x.name);
  const pages = Math.max(1, ...[...html.matchAll(/[?&](?:amp;)?page=(\d+)/g)].map(m => Number(m[1])));
  if (!items.length && page === 1) return jsonResp({ error: 'intershop: no se encontró el listado' }, 502);
  return jsonResp({ page, pages, items });
}

// ── Fotos de Silkface — originales privados, nombres públicos opacos ──
const PHOTO_HOSTS = new Set([
  'www.pontocom.com', 'resource.megaeletronicos.com', 'bigs.com.py',
  'www.starcompany-py.com', 'assets-terranova.egondola.app',
  'api.eleganciacompany.com', 'img.genove.com.py', 'www.lgimportados.com',
  'intershop.com.py', 'compras.macedonia.com.py', 'dados.sfo3.cdn.digitaloceanspaces.com',
]);
const PHOTO_VERSION = 'v2'; // Cambiarla cuando cambie la transformación, así se generan de nuevo.
const PHOTO_MAX_BYTES = 20 * 1024 * 1024;
const PHOTO_TIMEOUT_MS = 15000;
const PHOTO_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';

function photoJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function photoUrlAllowed(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && PHOTO_HOSTS.has(u.hostname) && !u.username && !u.password && !u.port;
  } catch { return false; }
}

function photoLargeUrl(url) {
  const u = new URL(url);
  if (u.hostname === 'www.starcompany-py.com') {
    u.pathname = u.pathname.replace(/-(home_default|medium_default)\//, '-large_default/');
  } else if (u.hostname === 'bigs.com.py') {
    u.pathname = u.pathname.replace(/-medium_default\//, '-large_default/');
  } else if (u.hostname === 'assets-terranova.egondola.app') {
    u.pathname = u.pathname.replace(/_m\.jpg$/, '_e.jpg');
  }
  return u.href === new URL(url).href ? url : u.href;
}

async function fetchPhotoBytes(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PHOTO_TIMEOUT_MS);
  try {
    // No seguir redirecciones: la allowlist también debe limitar el destino efectivo.
    const r = await fetch(url, {
      headers: { 'User-Agent': PHOTO_USER_AGENT }, redirect: 'manual', signal: controller.signal,
    });
    if (r.status !== 200) {
      if (r.body) await r.body.cancel();
      throw new Error(`origen ${r.status}`);
    }
    if (!/^image\//i.test(r.headers.get('Content-Type') || '') || !r.body) {
      if (r.body) await r.body.cancel();
      throw new Error('origen 200 (no es imagen)');
    }
    const reader = r.body.getReader(), chunks = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > PHOTO_MAX_BYTES) {
        await reader.cancel();
        throw new Error('origen 413 (imagen mayor a 20 MiB)');
      }
      chunks.push(value);
    }
    if (!length) throw new Error('origen 200 (imagen vacía)');
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } catch (e) {
    if (controller.signal.aborted || e.name === 'AbortError' || e.name === 'TimeoutError') throw new Error('origen timeout');
    if (e.message?.startsWith('origen ')) throw e;
    throw new Error('origen red');
  } finally { clearTimeout(timer); }
}

async function preparePhoto(url, env) {
  if (!photoUrlAllowed(url)) return { status: 'error', error: 'host no permitido' };
  let names, writing = false;
  try {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${url}|${PHOTO_VERSION}`));
    const key = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('').slice(0, 20);
    names = [400, 800].map(size => `f/${key}-${size}.webp`);
    const small = await env.FOTOS.head(names[0]), large = await env.FOTOS.head(names[1]);
    if (small && large) return { status: 'existe', key };

    let source = photoLargeUrl(url), bytes;
    try { bytes = await fetchPhotoBytes(source); } catch (e) {
      if (source === url) throw e;
      source = url;
      bytes = await fetchPhotoBytes(source);
    }
    for (const [index, size] of [400, 800].entries()) {
      const innerSize = Math.round(size * 0.88);
      const output = await env.IMAGES.input(new Response(bytes).body)
        .transform({ width: innerSize, height: innerSize, fit: 'pad', background: '#FFFFFF' })
        .transform({ border: { color: '#FFFFFF', width: (size - innerSize) / 2 } })
        .output({ format: 'image/webp', quality: 82 });
      const response = output.response();
      if (!response.ok || !response.body) throw new Error(`Images ${response.status}`);
      writing = true;
      await env.FOTOS.put(names[index], response.body, {
        httpMetadata: { contentType: 'image/webp' }, customMetadata: { source },
      });
    }
    return { status: 'ok', key };
  } catch (e) {
    let error = String(e.message || e);
    if (writing) {
      try { await env.FOTOS.delete(names); } catch (cleanup) {
        return { status: 'error', error: `${error}; no se pudo limpiar R2: ${cleanup.message || cleanup}` };
      }
    }
    const quota = String(e.code) === '9422' || /\b9422\b/.test(error);
    return { status: quota ? 'cupo' : 'error', error };
  }
}

async function handlePreparePhotos(req, env) {
  const secret = req.headers.get('X-Publish-Secret');
  if (!secret || !env.PUBLISH_SECRET || secret !== env.PUBLISH_SECRET) return photoJson({ error: 'unauthorized' }, 401);
  let body;
  try { body = await req.json(); } catch { return photoJson({ error: 'invalid json' }, 400); }
  if (!Array.isArray(body?.urls) || body.urls.length < 1 || body.urls.length > 5 || !body.urls.every(url => typeof url === 'string')) {
    return photoJson({ error: 'urls debe contener entre 1 y 5 URLs' }, 400);
  }
  if (!env.FOTOS || !env.IMAGES) return photoJson({ error: 'faltan bindings FOTOS/IMAGES' }, 503);
  const results = Object.create(null);
  for (const url of body.urls) results[url] = await preparePhoto(url, env);
  return photoJson({ results });
}

async function handlePhoto(name, env) {
  if (!/^[0-9a-f]{20}-(400|800)\.webp$/.test(name)) return photoJson({ error: 'not found' }, 404);
  const object = env.FOTOS ? await env.FOTOS.get(`f/${name}`) : null;
  if (!object) return photoJson({ error: 'not found' }, 404);
  return new Response(object.body, {
    headers: {
      'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*', 'ETag': object.httpEtag,
    },
  });
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
// Listas que se pueden publicar (card 21): "target" del POST → archivo del repo y página pública en Pages.
const PUBLISH_TARGETS = {
  catalogo: { path: CATALOG_PATH, page: 'catalogo.html', label: 'catálogo' },
  silkface: { path: 'docs/silkface.html', page: 'silkface.html', label: 'Silkface' },
};

async function handlePublishCatalog(req, env) {
  const secret = req.headers.get('X-Publish-Secret');
  if (!secret || !env.PUBLISH_SECRET || secret !== env.PUBLISH_SECRET) {
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

  // Sin "target" = catálogo de perfumes (lo que mandaban las versiones anteriores de la app).
  const target = PUBLISH_TARGETS[body?.target || 'catalogo'];
  if (!target) return jsonResp({ error: 'destino desconocido' }, 400);
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${target.path}`;
  const ghHeaders = {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
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
      message: `Actualizar ${target.label} — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
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
    // aunque el archivo viva en ese path dentro del repo (por eso se usa target.page y no target.path).
    url: `https://${GITHUB_OWNER.toLowerCase()}.github.io/${GITHUB_REPO}/${target.page}`,
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
