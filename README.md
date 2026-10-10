# Importo — Import Cost Calculator

A web-based calculator that computes the real landed cost of imported goods and suggests a selling price based on a target margin. Built for product importers who buy in Ciudad del Este, Paraguay and sell in Argentina — adaptable to any country's exchange rates and fee structures.

**Live →** [calculadora-importacion-perfumes.agustincrovato7.workers.dev](https://calculadora-importacion-perfumes.agustincrovato7.workers.dev)

---

## The problem it solves

Calculating the true cost of an imported product requires chaining several variables, some of which change daily: the USDT/ARS rate used to pay the store, the shipper's commission, the transfer fees and shipping. Doing this manually in a spreadsheet is slow and error-prone. A miscalculation directly eats into margin.

On top of that, suppliers send their price lists in different formats (WhatsApp text, Excel, PDF, websites), with the same product spelled differently in each one. Building a single client-facing price list out of them by hand takes hours.

Importo fetches all rates automatically and computes every number in real time as products are entered. It also merges supplier lists into one priced catalog and publishes it as a searchable page for clients.

---

## Features

**Rate fetching**
- Purchases are paid in USDT directly to the store, so the only market rate needed is USDT/ARS: the Binance P2P price, read from dolarapi.com ("cripto" quote) through the proxy — Binance itself blocks Cloudflare Worker traffic
- Refreshes on load and on demand; can be overridden by hand

**Cost calculation (per product)**
- Phase 1: product price in USDT × USDT/ARS rate
- Phase 2: shipper commission (in USDT) + a flat shipping fee per product (configurable, charged to the client regardless of real shipping cost) + a USDT transfer fee (charged once per real transfer — rows tagged with the same "order" name share one — and split across the units)
- Selling price computed from cost + target margin (margin, not markup), rounded up to a configurable step shared with the published price list
- Gain per unit (in ARS and in USD at the USDT rate) and real margin displayed with color-coded badges (green ≥20%, yellow ≥10%, red <10%)

**Usability**
- Supplier catalogs (Excel, PDF or the price-list generator's pool) feed a product autocomplete — name and price auto-fill, tier-based margin applied automatically by original cost
- Client and stock rows, per-client breakdown in the summary, multiple saved lists (tabs)
- Real shipping cost tracked separately from the flat fee charged to clients, for accurate cost/ROI reporting
- Results split across two tables — real cost above, selling price (margin/price/gain) in a compact table below, next to the summary panel
- Export full purchase summary as `.txt`
- Fully reactive — recalculates on every input change, persists business config (commission, shipping, fees, rounding) across reloads

**Price-list generator**
- Imports supplier lists from pasted WhatsApp text, Excel/Numbers, PDF catalogs, or scrapes the Ponto Com online catalog (paginated, through the Worker)
- Detects the brand from the product name (300+ known brands with aliases, accent-insensitive) and classifies it as niche, designer or Arabic
- Merges the same product across suppliers keeping the cheapest, and suggests fuzzy duplicates for one-click review (decisions are remembered)
- Prices every product with margin tiers by original cost (a separate tier set for Arabic brands), using the same costing and rounding as the calculator
- Excludes non-perfume items automatically; per-brand publish filter
- Exports to Excel, or publishes a searchable client catalog (`docs/catalogo.html`) to GitHub Pages in one click — with category, brand and price filters, a cart and a WhatsApp order button

**Access control**
- The app is private, behind Cloudflare Access (email OTP); only the user guide and the client catalog are public

---

## Tech stack

| Layer | Technology |
|---|---|
| App | Vanilla HTML, CSS, JavaScript — zero build step, single file |
| Hosting | Cloudflare Workers (static assets) |
| Rate APIs proxy | Cloudflare Worker (CORS proxy for the USDT rate and the Ponto Com catalog; publishes the client catalog to GitHub) |
| Access control | Cloudflare Access (Zero Trust) — email OTP |
| User guide & client catalog | GitHub Pages |
| Catalog parsing | SheetJS (xlsx) and pdf.js via CDN |

---

## Architecture

```
User
 │
 ├─► Cloudflare Access (auth gate) ──► index.html (calculator app)
 │                                          │
 │                                          └─► Cloudflare Worker (proxy)
 │                                                ├─► dolarapi.com    (USDT/ARS, Binance P2P price)
 │                                                ├─► pontocom.com    (supplier catalog)
 │                                                └─► GitHub API      (publishes docs/catalogo.html)
 │
 └─► GitHub Pages (public, served from /docs only — index.html is NOT public here)
      ├─► docs/guia.html      (user guide)
      └─► docs/catalogo.html  (client-facing searchable price list, auto-published)
```

---

## Project structure

```
/
├── index.html            # Main app: calculator + price-list generator (NOT served by GitHub Pages — private/paid)
├── worker.js             # Cloudflare Worker — rate API proxy, Ponto Com scraper, auto-publish endpoint
├── wrangler.jsonc        # Deploys index.html as a static-assets Worker (behind Cloudflare Access)
├── .assetsignore         # Files kept out of that deploy
└── docs/                 # GitHub Pages source — everything here is public
    ├── guia.html         # User guide
    ├── guia-usuario.md   # End-user guide source (Spanish)
    └── catalogo.html     # Client-facing searchable price list (auto-published)
```

---

## Local development

No build step required. Open any `.html` file directly in a browser.

`wrangler.jsonc` deploys the app itself (`index.html` as static assets). The proxy (`worker.js`, service-worker syntax) is a separate Worker, `comparapi-proxy`; it can be pasted into the Cloudflare dashboard or deployed with [Wrangler](https://developers.cloudflare.com/workers/wrangler/). Publishing the catalog needs two Worker secrets: `GITHUB_TOKEN` (fine-grained PAT, contents write on this repo only) and `PUBLISH_SECRET`.

---

## How the cost calculation works

### Phase 1 — Product cost (paid in USDT)
```
cost_ars = price_usd × usdt_rate
```

### Phase 2 — Shipper fees
```
commission_ars   = commission_usd × usdt_rate                      (every row)
flat_shipping    = flat_shipping_per_product × qty                 (0 for stock rows — no client pays it)
usdt_transfer_fee = (transfer_fee_usdt × usdt_rate × num_transfers) / total_units
```
The real total shipping cost (what you actually pay the courier) is tracked separately and never divided into the price — it only feeds the real cost/ROI numbers in the summary panel.

### Selling price
Margin is set per row, or entered as a target USD gain per unit at the USDT rate (the margin is then back-calculated).
```
selling_price = round_up(total_cost / (1 - margin), rounding_step)
gain_per_unit = selling_price - total_cost
gain_usd      = gain_per_unit / usdt_rate
real_margin   = gain_per_unit / selling_price
```

---

## License

MIT
