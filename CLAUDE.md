# Calculadora de Importación — Checkpoint

## What this project is
A single-file web calculator (`calculadora.html`) for importing products from Ciudad del Este, Paraguay.
It replaces `calculadora_importacion_v5_final.xlsx`.

## How the buying process works

### Phase 1 — Product cost via PIX
Products are priced in USD. The user pays in BRL via PIX, then the BRL is converted to ARS.

- The store sends a daily PIX rate, e.g. `"5,32 valor do pix aquí na loja hoje"` (USD → BRL)
- The BRL → ARS rate is fetched from `api.comparapix.ar/quotes` — best `buy` rate among `isPix: true` providers

**Formula:**
```
costo_brl  = precio_usd × valor_pix
costo_ars1 = costo_brl × mejor_tasa_comparapix
```

**Real example:** 159 USD × 5.32 = 845.88 BRL

### Phase 2 — Fees paid to the shipper
Two separate costs paid after the purchase:

1. **Commission** — $4 USD per product, paid at the **official dollar rate** (USD → ARS oficial)
2. **Shipping** — fixed ARS amount, split equally across all units

**Formulas:**
```
comision_ars  = commission_usd × dolar_oficial
envio_por_unid = envio_total_ars / total_unidades
```

### Total cost and selling price
```
costo_total   = costo_ars1 + comision_ars + envio_por_unid

precio_venta_ars      = costo_total / (1 - margen%)
precio_venta_usd_blue = precio_venta_ars / dolar_blue
ganancia              = precio_venta_ars - costo_total
margen_real           = ganancia / precio_venta_ars
```

The user sells in ARS but prices products as a USD-blue equivalent (e.g. "this costs USD 10 at blue rate").

## APIs used
| API | Endpoint | Used for |
|-----|----------|----------|
| dolarapi.com | `/v1/dolares/oficial` | Dólar oficial (for commission) |
| dolarapi.com | `/v1/dolares/blue` | Dólar blue (for selling price) |
| comparapix.ar | `api.comparapix.ar/quotes` | BRL→ARS rate (PIX services) |

### comparapix.ar response format
```json
{
  "belo": {
    "quotes": [
      { "symbol": "BRLARS", "buy": 292.94, "sell": 277.44, ... },
      { "symbol": "BRLUSDT", "buy": 0.199, ... }
    ],
    "isPix": true,
    "logo": "...",
    "url": "..."
  },
  ...
}
```
Best rate = **min** `buy` value from quotes where `symbol === "BRLARS"` and `isPix === true`.
Lower ARS/BRL = cheaper for the user (they spend fewer pesos to get the same reales).

## Current inputs (rates section)
| ID | Label | Default | Notes |
|----|-------|---------|-------|
| `r-pix` | Valor do PIX (BRL/USD) | 5.32 | Manual — sent by the store each day |
| `r-oficial` | Dólar Oficial (ARS) | 1410 | Auto-fetched |
| `r-blue` | Dólar Blue (ARS) | 1435 | Auto-fetched |
| `r-comision` | Comisión/producto (USD) | 4 | Global default, applies to all products |
| `r-envio` | Envío total (ARS) | 17000 | Fixed, split by total units |
| `r-pix-ars` | BRL→ARS rate | — | Auto-fetched via Worker, editable fallback |

## Table columns (color-coded)
- **Blue (Phase 1):** Costo BRL/unid, Costo ARS/unid
- **Green (Phase 2):** Comisión ARS/unid, Envío ARS/unid, Costo total/unid
- **Purple (Selling):** Margen %, Precio ARS, Precio USD blue, Margen real %

## Features
- Dynamic rows (add/remove)
- All rates auto-fetched on load (single button to refresh)
- Real-time recalculation on any input change
- Export to `.xlsx` via SheetJS CDN (`cdn.jsdelivr.net/npm/xlsx@0.18.5`)
- Color-coded margin badges: green ≥20%, yellow ≥10%, red <10%

## Deployment
- **Live URL:** https://agustincrov.github.io/calculadora-importacion-perfumes
- **GitHub repo:** https://github.com/Agustincrov/calculadora-importacion-perfumes
- **Cloudflare Worker (comparapix proxy):** https://comparapi-proxy.agustincrovato7.workers.dev/
  - Proxies `api.comparapix.ar/quotes` with CORS headers — needed because comparapix blocks browser requests
  - Account: agustincrovato7@gmail.com on Cloudflare

### Updating the live page
Edit `index.html` directly in `~/calculadora-repo/`, then:
```bash
cd ~/calculadora-repo
git add index.html
git commit -m "your message"
git push
```
GitHub Pages updates within ~30 seconds after push.

## Files
| File | Description |
|------|-------------|
| `index.html` | Main app — the file served on GitHub Pages |
| `calculadora_importacion_v5_final.xlsx` | Original spreadsheet (reference only) |
| `actualizar_dolar.py` | Old Python script to update dollar rate in .xlsx (obsolete) |
| `ActualizarDolar.bat` | Old batch launcher for the Python script (obsolete) |
