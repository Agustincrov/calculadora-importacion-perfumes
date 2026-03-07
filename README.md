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
- Full Phase 1 chain: `price_usd × store_pix → BRL → USD via PIX service → ARS at official rate`
- Phase 2: shipper commission (in USDT) + shipping split equally per client
- Selling price computed from cost + target margin (margin, not markup)
- Gain per unit and real margin displayed with color-coded badges (green ≥20%, yellow ≥10%, red <10%)

**Usability**
- Excel catalog import — product names and prices auto-fill on search
- Shipping cost split by number of clients, not units (each client pays a flat share)
- Export full purchase summary as `.txt`
- Copy all selling prices to clipboard in one click
- Fully reactive — recalculates on every input change

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
 └─► GitHub Pages (public)
      ├─► landing.html  (marketing + Mercado Pago subscription)
      └─► gracias.html  (post-payment, WhatsApp activation flow)
```

---

## Project structure

```
/
├── index.html          # Main calculator app
├── landing.html        # Public marketing landing page
├── gracias.html        # Post-payment activation page
├── worker.js           # Cloudflare Worker — rate API proxy
├── docs/
│   └── guia-usuario.md # End-user guide (Spanish)
└── assets/
    └── favicon.webp
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
commission_ars = commission_usd × usdt_rate
shipping_ars   = total_shipping / num_clients / qty
```

### Selling price
```
selling_price = total_cost / (1 - margin)
gain_per_unit = selling_price - total_cost
real_margin   = gain_per_unit / selling_price
```

---

## License

MIT
