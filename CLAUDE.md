# Calculadora de Importación — Checkpoint

## What this project is
A single-file web calculator (`index.html`) for importing products from Ciudad del Este, Paraguay.
Replaces `calculadora_importacion_v5_final.xlsx`. Hosted on GitHub Pages, shared with other importers.

---

## How the buying process works

### Phase 1 — Product cost via PIX (USD route)
Products are priced in USD. The store sends a daily PIX rate ("valor do pix"), e.g. `"5,32 valor do pix aquí na loja hoje"`.

The user buys USD at the **official rate** via apps like Brubank or AstroPay, then uses a **BRLUSD PIX service** to send BRL to the store. This is cheaper than converting ARS→BRL directly.

**Chain:**
```
price_usd × valor_pix          = brl_unid    (BRL the store wants)
brl_unid  / pix_usd_rate       = usd_unid    (USD sent to the PIX service)
usd_unid  × dolar_oficial      = costo_ars1  (ARS cost at official rate)
```

**Real example:** 170 USD × 5.32 = 904.4 BRL → 904.4 / 5.14 = 175.9 USD → 175.9 × 1395 = $245,380 ARS

### Phase 2 — Fees paid to the shipper
1. **Commission** — $4 USD per product, paid at the **official rate** in ARS
2. **Shipping** — fixed ARS amount, split equally across all units

```
comision_ars   = commission_usd × dolar_oficial
envio_por_unid = envio_total / total_unidades
```

### Total cost and selling price
```
costo_total          = costo_ars1 + comision_ars + envio_por_unid
precio_venta_ars     = costo_total / (1 - margen%)
precio_venta_usd_blue = precio_venta_ars / dolar_blue
ganancia             = precio_venta_ars - costo_total
margen_real          = ganancia / precio_venta_ars
```

Sells in ARS priced as USD-blue equivalent. **Margin** (not markup) — 30% means profit is 30% *of* the selling price, not 30% added on top.

---

## APIs used
| API | Endpoint | Used for |
|-----|----------|----------|
| dolarapi.com | `/v1/dolares/oficial` | Dólar oficial (Phase 1 + commission) |
| dolarapi.com | `/v1/dolares/blue` | Dólar blue (selling price display) |
| comparapix.ar | via Cloudflare Worker | BRLUSD rate (best PIX service) |

### comparapix.ar response format
```json
{
  "brubank": {
    "quotes": [
      { "symbol": "BRLUSD", "buy": 0.1953 }
    ],
    "isPix": true
  }
}
```

**Best BRLUSD rate** = lowest `buy` value from quotes where `symbol === "BRLUSD"` and `isPix === true`, excluding `dolarapp` and `binance` (USDT-based).
Lowest BRLUSD buy = most BRL per USD = cheapest for the user.
Convert to display: `brl_per_usd = 1 / buy` (e.g. 1/0.1953 = 5.12 BRL/USD).

**Why BRLUSD not BRLARS:** Using ARS→BRL route loses money. Buying official USD first then paying via BRLUSD service is significantly cheaper because the official rate (~1395) is lower than blue (~1435).

---

## Rate inputs
| ID | Label | Default | Notes |
|----|-------|---------|-------|
| `r-pix` | Valor do PIX (BRL/USD) | 5.32 | Manual — sent by the store each day |
| `r-pix-usd` | Mejor PIX (BRL/USD) | — | Auto-fetched (best BRLUSD from comparapix) |
| `r-oficial` | Dólar Oficial (ARS) | 1410 | Auto-fetched — used for Phase 1 AND commission |
| `r-blue` | Dólar Blue (ARS) | 1435 | Auto-fetched — used for selling price only |
| `r-comision` | Comisión/producto (USD) | 4 | Global, applies to all products |
| `r-envio` | Envío total (ARS) | 17000 | Fixed, split by total units |

## Table columns (color-coded)
- **Blue (Phase 1):** BRL/unid · USD que pagás · Costo ARS/unid
- **Green (Phase 2):** Comisión ARS/unid · Envío ARS/unid · Costo total/unid
- **Purple (Selling):** Margen % · Precio ARS · Precio USD blue · Margen real %

## Features
- Dynamic rows (add/remove)
- All rates auto-fetched on load + refresh button
- Real-time recalculation on any input change
- Export to `.txt` notes file (clean summary with rates, products, totals)
- Color-coded margin badges: green ≥20%, yellow ≥10%, red <10%

---

## Deployment
- **Live URL:** https://agustincrov.github.io/calculadora-importacion-perfumes
- **GitHub repo:** https://github.com/Agustincrov/calculadora-importacion-perfumes
- **Cloudflare Worker (comparapix proxy):** https://comparapi-proxy.agustincrovato7.workers.dev/
  - Proxies `api.comparapix.ar/quotes` — needed because comparapix blocks browser CORS requests
  - Cloudflare account: agustincrovato7@gmail.com

### Updating the live page
```bash
cd ~/calculadora
git add index.html
git commit -m "your message"
git push
```
GitHub Pages updates ~30 seconds after push. Credentials stored via `git config --global credential.helper store`.

## Files
| File | Description |
|------|-------------|
| `index.html` | Main app — single file served on GitHub Pages |
| `CLAUDE.md` | This file — project context for Claude |
| `calculadora_importacion_v5_final.xlsx` | Original spreadsheet (reference only, obsolete) |
| `actualizar_dolar.py` | Old Python script (obsolete) |
| `ActualizarDolar.bat` | Old batch launcher (obsolete) |
