# Importo — Guía de uso

**Herramienta para importadores de Ciudad del Este, Paraguay.**
Calculá el costo real de cada producto y su precio de venta en segundos.

---

## ¿Para qué sirve?

Cuando comprás productos en Ciudad del Este, el precio final que pagás depende de varios factores: la tasa del día de la tienda, el servicio que usás para mandar el dinero, el dólar oficial, la comisión del shipper y el envío. Esta calculadora une todo eso automáticamente y te muestra cuánto te costó cada producto y a cuánto tenés que venderlo para ganar lo que querés.

---

## Paso 1 — Tasas y configuración

Al abrir la calculadora, los valores se actualizan solos desde internet. Aun así, podés editarlos manualmente si los datos del día son distintos.

| Campo | Qué es |
|---|---|
| **Valor do PIX** | La tasa que te manda la tienda ese día. Ej: "5,32 valor do pix aquí na loja hoje". Se autocompleta desde Madrid Center. |
| **Mejor PIX (BRL/USD)** | El mejor servicio disponible para mandar dólares y que lleguen en reales (Brubank o Astropay vía comparapix.ar). Se completa solo. |
| **Dólar Oficial** | Cotización oficial Córdoba (BBVA). Se usa para calcular cuánto te cuestan los productos en pesos y para la comisión del shipper. Se autocompleta. |
| **Dólar Blue** | Cotización blue Córdoba. Se autocompleta. Se usa solo para mostrarte el precio de venta equivalente en dólares blue. |
| **USDT** | Cotización USDT en Binance P2P. Se autocompleta. Se usa para calcular la comisión del shipper y la fee de transferencia en pesos. |
| **Comisión/producto** | Lo que cobra el shipper por producto, en USD. Generalmente $4. |
| **Envío total (real)** | Lo que de verdad le pagás al fletero por todo el embarque. No se le cobra así al cliente — se usa solo para que la calculadora te muestre tu costo y ROI reales en el resumen. |
| **Clientes** | Se calcula solo, contando nombres distintos en el campo "Cliente" de las filas. Informativo — ya no afecta el precio. |
| **Envío fijo/producto** | Lo que le cobrás al cliente por cada producto, sin importar el costo real del embarque (por eso "fijo"). Si el cliente pide varios productos, cada uno suma este monto. |
| **Fee transferencia USDT** | Fee fija (en USDT) que cobra el exchange por cada transferencia real que hacés al pagar en modo USDT directo. Se cuenta una vez por cada nombre distinto que cargues en el campo "Pedido" de las filas USDT (ver más abajo). |
| **Redondeo precio** | Los precios de venta se redondean hacia arriba a este número, para que coincidan con los precios publicados en el catálogo. |

> El botón **Actualizar cotizaciones** refresca las tasas de mercado (oficial, blue, USDT, PIX) desde internet en cualquier momento. La comisión, los envíos, la fee USDT y el redondeo son configuración tuya — se guardan solos y no se pierden al recargar la página.

---

## Modo de pago

Arriba de la tabla hay un selector para elegir cómo se paga a la tienda. Elegí el modo antes de cargar los productos.

### PIX (USD oficial)
Comprás dólares al tipo de cambio oficial usando apps como Brubank o AstroPay. Luego usás un servicio BRLUSD para enviar esos dólares y que lleguen en reales directamente a la tienda. Es el modo por defecto.

**Cadena de cálculo:**
```
precio_usd × valor_pix     = BRL que quiere la tienda
BRL ÷ mejor_pix            = USD que enviás al servicio
USD × dólar_oficial        = costo en ARS
```

### USDT directo
Mandás USDT directamente a la tienda, sin pasar por la conversión a BRL — no interviene ningún valor en reales en este modo. Requiere que la tienda acepte cripto. Evita un paso en la cadena y puede resultar más barato dependiendo de la cotización del momento.

En las filas con este modo aparece un campo extra, **"Pedido"**: escribí ahí un nombre que identifique cada transferencia real que vas a hacer. Si varios productos van en la misma transferencia, ponéles el mismo nombre — así la calculadora cobra la fee de transferencia una sola vez entre esos productos. Si vas a transferir en momentos distintos (por ejemplo, mismo pedido pero repartido en dos días), usá nombres distintos: cada uno cuenta como una transferencia con su propia fee.

---

## Paso 2 — Múltiples listas

Encima de la tabla aparecen pestañas. Cada pestaña es una lista de productos independiente.

- **Crear lista:** hacé clic en el botón **+** para agregar una pestaña nueva.
- **Renombrar:** doble clic sobre el nombre de la pestaña.
- **Eliminar:** hacé clic en la **×** de la pestaña. Necesitás al menos una lista.
- **Guardado automático:** todas las listas se guardan en el navegador (localStorage). Al cerrar y volver a abrir la calculadora, las listas siguen ahí.
- **Resetear:** el botón de reset limpia los productos de la lista activa sin borrar las demás.

Usá una lista por cliente o por compra para mantener todo organizado.

---

## Paso 3 — Cargá tus productos

Hacé clic en **Agregar producto** para sumar una fila a la tabla. Cada fila representa un producto.

Completá los campos editables:

- **Producto** — El nombre del perfume u artículo. Si cargaste un catálogo, escribí parte del nombre y te aparecen sugerencias para completar nombre y precio automáticamente.
- **Precio USD** — El precio en dólares que te cobra la tienda.
- **Cantidad** — Cuántas unidades de ese producto estás comprando.
- **Margen %** — El margen de ganancia que querés aplicar. Un 30% significa que tu ganancia es el 30% del precio de venta final (no es un markup).

Los resultados están repartidos en **dos tablas** para que no haya que scrollear horizontalmente para relacionar costo con venta: la tabla de arriba (costo real) y una tabla más chica debajo, junto al Resumen (precio de venta). Las dos muestran los mismos productos, en el mismo orden — cruzalas por el nombre del producto. Todas las columnas de resultados muestran el valor total (precio × cantidad).

**Tabla de arriba — Fase 1, costo del producto (azul):**
- **BRL total** — Cuántos reales cuesta ese producto en total.
- **USD total** (o **USDT/unid** en modo USDT directo) — Cuántos dólares o USDT enviás en total.
- **Costo ARS total** — Lo que te cuesta en pesos argentinos al dólar oficial.

**Tabla de arriba — Fase 2, gastos del shipper (verde):**
- **Comisión total** — La comisión del shipper por todas las unidades, en pesos.
- **Envío + fee total** — El envío fijo que le cobrás al cliente por ese producto, más (en modo USDT) la parte proporcional de la fee de transferencia. Las filas de tipo STOCK no llevan envío (no hay cliente que lo pague), pero sí llevan la fee USDT si corresponde.
- **Costo total** — El costo real final, sumando producto + comisión + envío/fee.

**Tabla de abajo — Precio de venta (violeta), junto al Resumen:**
- **Margen %** — El mismo campo editable que en la tabla de arriba, movido acá para que quede junto al resto de los números de venta.
- **Precio ARS** — El precio al que tenés que venderlo para lograr el margen que pediste, ya redondeado hacia arriba (Redondeo precio).
- **Precio lista** — Con el envío fijo por producto, hoy coincide con "Precio ARS" (antes eran distintos porque el envío se prorrateaba; ver Ejemplo rápido).
- **USD lista** — Ese mismo precio expresado en dólares blue (útil para publicar).
- **Ganancia** — Cuánto ganás en pesos después de cubrir todos los costos.
- **Ganancia USD** — La ganancia expresada en dólares blue.
- **Margen real** — El margen real que te queda, con colores: verde (20% o más), amarillo (entre 10% y 20%), rojo (menos del 10%).

---

## Paso 4 — Revisá el resumen

El panel de resumen muestra el total de la operación:

- BRL o USDT a enviar en total.
- USD pagados en total.
- Costo ARS Fase 1 (solo producto).
- Total de comisiones y envío.
- Costo total de la operación.
- Precio de venta total y ganancia total.
- Ganancia en USD blue.
- ROI — cuánto ganás por cada peso invertido.

---

## Catálogos de productos (opcional)

Si la tienda te manda una planilla Excel o un PDF con sus productos y precios, podés importarlo con el botón **Importar catálogo**. A partir de ahí, al escribir el nombre de un producto en la tabla, te aparecen sugerencias para completar el nombre y el precio automáticamente.

El PDF tiene que tener texto seleccionable (no sirve uno escaneado o sacado como foto). Los productos marcados como tester ("TT") se cargan con la palabra TESTER adelante del nombre.

Podés importar catálogos de varias tiendas al mismo tiempo. Cada archivo que importás se suma al pool de búsqueda sin reemplazar los anteriores. Cada catálogo cargado aparece como una etiqueta con el nombre del archivo y la cantidad de productos. Para quitar un catálogo, hacé clic en la **×** de su etiqueta.

---

## Copiar precios

Hay dos modos para copiar los precios al portapapeles:

- **Copiar individual** — Precio por producto ("Precio lista").
- **Copiar bundle** — Precio por producto ("Precio ARS").

Con el envío fijo por producto, hoy los dos dan el mismo número (antes diferían porque el envío se prorrateaba distinto según si el cliente compraba uno o varios productos).

---

## Exportar resumen

**Exportar resumen** descarga un archivo de texto con todos los datos de la compra: tasas del día, detalle por producto y totales. Ideal para guardar como registro o compartir por WhatsApp.

---

## Ejemplo rápido

Querés comprar un perfume que cuesta **USD 170**, la tienda te manda que el valor do PIX es **5,32**, el dólar oficial está en **$1.395**, la comisión es **$4 USD** y tenés cargado un envío fijo de **$10.000/producto**.

1. Verificá que "Valor do PIX" diga 5,32 (se autocompleta desde Madrid Center).
2. Cargá el producto con precio 170 y cantidad 1.
3. Elegí un margen del 30%.

La calculadora te muestra al instante el costo real, el precio de venta sugerido (redondeado según "Redondeo precio") y cuánto ganás por unidad. Si además cargás más productos para el mismo cliente en la misma lista, cada uno suma su propio envío fijo — si te parece mucho para un pedido grande, podés hacerle un descuento manual vos mismo, la calculadora no lo hace sola.

---

## Preguntas frecuentes

**¿Tengo que instalar algo?**
No. La calculadora funciona directo desde el navegador, sin instalación ni registro.

**¿Funciona en el celular?**
Sí, aunque se ve mejor en computadora por la cantidad de columnas en la tabla.

**¿Los datos se guardan?**
Sí, las listas de productos y tu configuración (comisión, envíos, fee USDT, redondeo) se guardan automáticamente en el navegador (localStorage). Al cerrar y volver a abrir la calculadora, todo sigue ahí. Solo las cotizaciones de mercado (oficial, blue, USDT, PIX) no se guardan — se vuelven a buscar al abrir.

**¿Con qué frecuencia se actualizan las cotizaciones?**
Cada vez que abrís la calculadora o apretás "Actualizar cotizaciones". No se actualizan solas mientras la tenés abierta.

**¿Puedo tener listas para distintos clientes?**
Sí. Usá el botón **+** para crear una pestaña por cliente o por compra. Todas se guardan automáticamente.

**¿Puedo usar los catálogos de varias tiendas a la vez?**
Sí. Cada vez que importás un archivo Excel o PDF se agrega al pool de búsqueda. Podés tener varios catálogos activos al mismo tiempo y la búsqueda de productos los recorre todos.
