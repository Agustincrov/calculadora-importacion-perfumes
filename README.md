# Importo — Import Cost Calculator

A web-based calculator that computes the real landed cost of imported goods and suggests a selling price based on a target margin. Built for product importers who buy in Ciudad del Este, Paraguay and sell in Argentina — adaptable to any country's exchange rates and fee structures.

**Live →** [calculadora-importacion-perfumes.agustincrovato7.workers.dev](https://calculadora-importacion-perfumes.agustincrovato7.workers.dev)
**Landing →** [agustincrov.github.io/calculadora-importacion-perfumes/landing.html](https://agustincrov.github.io/calculadora-importacion-perfumes/landing.html)

---

## The problem it solves

Calculating the true cost of an imported product requires chaining multiple variables that change daily: the store's PIX rate, the BRL/USD service rate, the official exchange rate, the shipper's commission, and a shared shipping cost split across clients. Doing this manually in a spreadsheet is slow and error-prone. A miscalculation directly eats into margin.

Importo fetches all rates automatically and computes every number in real time as products are entered.

---

## Features

**Rate fetching**
- Official and blue ARS/USD rates (local Córdoba market via proxy)
- Best BRL/USD PIX rate across allowed providers (Brubank, AstroPay) via comparapix.ar
- USDT/ARS rate via Binance P2P
- Store PIX rate (valor do PIX) from Madrid Center
- All rates refresh on load and on demand

**Cost calculation (per product)**
- Full Phase 1 chain: `price_usd × store_pix → BRL → USD via PIX service → ARS at official rate` (3 payment modes: PIX via BRLUSD, USDT direct, or ARS via BRLARS — each with its own chain)
- Phase 2: shipper commission (in USDT) + a flat shipping fee per product (configurable, charged to the client regardless of real shipping cost) + a USDT transfer fee (direct-USDT mode only, split across whichever product rows share the same "order" tag, since that's how many real transfers it takes)
- Selling price computed from cost + target margin (margin, not markup), rounded up to a configurable step shared with the published price list
- Gain per unit and real margin displayed with color-coded badges (green ≥20%, yellow ≥10%, red <10%)

**Usability**
- Excel and PDF catalog import — product names and prices auto-fill on search, tier-based margin applied automatically by original cost
- Real shipping cost tracked separately from the flat fee charged to clients, for accurate cost/ROI reporting
- Results split across two tables — real cost above, selling price (margin/price/gain) in a compact table below, next to the summary panel
- Export full purchase summary as `.txt`
- Copy all selling prices to clipboard in one click
- Fully reactive — recalculates on every input change, persists business config (commission, shipping, fees, rounding) across reloads

**Access control**
- Protected via Cloudflare Access (email OTP)
- Public marketing landing page with Mercado Pago subscription flow
- Post-payment page collects client email and sends it via WhatsApp for manual activation

---

## Tech stack

| Layer | Technology |
|---|---|
| App | Vanilla HTML, CSS, JavaScript — zero build step, single file |
| Hosting | Cloudflare Workers (static assets) |
| Rate APIs proxy | Cloudflare Worker (CORS proxy for comparapix.ar and exchange rate APIs) |
| Access control | Cloudflare Access (Zero Trust) — email OTP |
| Landing & docs | GitHub Pages |
| Catalog parsing | SheetJS (xlsx) via CDN |

---

## Architecture

```
User
 │
 ├─► Cloudflare Access (auth gate) ──► index.html (calculator app)
 │                                          │
 │                                          └─► Cloudflare Worker (proxy)
 │                                                ├─► comparapix.ar  (PIX rates)
 │                                                ├─► infodolar.com   (ARS rates)
 │                                                ├─► Binance P2P     (USDT)
 │                                                └─► Madrid Center   (store PIX)
 │
 └─► GitHub Pages (public, served from /docs only — index.html is NOT public here)
      ├─► docs/landing.html   (marketing + Mercado Pago subscription)
      ├─► docs/gracias.html   (post-payment, WhatsApp activation flow)
      ├─► docs/guia.html      (user guide)
      └─► docs/catalogo.html  (client-facing searchable price list, auto-published)
```

---

## Project structure

```
/
├── index.html            # Main calculator app (NOT served by GitHub Pages — private/paid)
├── worker.js             # Cloudflare Worker — rate API proxy + auto-publish endpoint
└── docs/                 # GitHub Pages source — everything here is public
    ├── landing.html      # Public marketing landing page
    ├── gracias.html      # Post-payment activation page
    ├── guia.html         # User guide
    ├── guia-usuario.md   # End-user guide source (Spanish)
    └── catalogo.html     # Client-facing searchable price list (auto-published)
```

---

## Local development

No build step required. Open any `.html` file directly in a browser.

For the Cloudflare Worker proxy, deploy via [Wrangler](https://developers.cloudflare.com/workers/wrangler/):

```bash
npx wrangler deploy worker.js
```

---

## How the cost calculation works

### Phase 1 — Product cost via PIX
```
brl_per_unit  = price_usd × store_pix_rate
usd_sent      = brl_per_unit / best_pix_service_rate
cost_ars      = usd_sent × official_rate
```

### Phase 2 — Shipper fees
```
commission_ars   = commission_usd × usdt_rate                      (every row)
flat_shipping    = flat_shipping_per_product × qty                 (0 for stock rows — no client pays it)
usdt_transfer_fee = (transfer_fee_usdt × usdt_rate × num_transfers) / usdt_mode_units   (USDT-direct rows only)
```
The real total shipping cost (what you actually pay the courier) is tracked separately and never divided into the price — it only feeds the real cost/ROI numbers in the summary panel.

### Selling price
```
selling_price = round_up(total_cost / (1 - margin), rounding_step)
gain_per_unit = selling_price - total_cost
real_margin   = gain_per_unit / selling_price
```

---

## License

MIT
