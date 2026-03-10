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
| **USDT** | Cotización USDT en Binance P2P. Se autocompleta. Se usa para calcular la comisión del shipper en pesos. |
| **Comisión/producto** | Lo que cobra el shipper por producto, en USD. Generalmente $4. |
| **Envío total** | El costo total del envío en pesos, que se reparte entre todos los clientes. |
| **Clientes** | Cuántas personas comparten el envío. Si sos vos solo, dejalo en 1. Si son 3 amigos comprando juntos, poné 3. Afecta el "precio lista individual". |

> El botón **Actualizar cotizaciones** refresca todos los valores desde internet en cualquier momento.

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
Mandás USDT directamente a la tienda, sin pasar por la conversión a BRL. Requiere que la tienda acepte cripto. Evita un paso en la cadena y puede resultar más barato dependiendo de la cotización del momento.

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

Todas las columnas de resultados muestran el valor total (precio × cantidad):

**Fase 1 — costo del producto (azul):**
- **BRL total** — Cuántos reales cuesta ese producto en total.
- **USD total** (o **USDT/unid** en modo USDT directo) — Cuántos dólares o USDT enviás en total.
- **Costo ARS total** — Lo que te cuesta en pesos argentinos al dólar oficial.

**Fase 2 — gastos del shipper (verde):**
- **Comisión total** — La comisión del shipper por todas las unidades, en pesos.
- **Envío total** — La parte del envío que le corresponde a ese producto.
- **Costo total** — El costo real final, sumando producto + comisión + envío.

**Precio de venta (violeta):**
- **Precio ARS** — El precio al que tenés que venderlo para lograr el margen que pediste.
- **Precio lista** — Precio con el envío distribuido entre todos los clientes (precio individual para cada comprador).
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

Si la tienda te manda una planilla Excel con sus productos y precios, podés importarla con el botón **Importar catálogo**. A partir de ahí, al escribir el nombre de un producto en la tabla, te aparecen sugerencias para completar el nombre y el precio automáticamente.

Podés importar catálogos de varias tiendas al mismo tiempo. Cada archivo que importás se suma al pool de búsqueda sin reemplazar los anteriores. Cada catálogo cargado aparece como una etiqueta con el nombre del archivo y la cantidad de productos. Para quitar un catálogo, hacé clic en la **×** de su etiqueta.

---

## Copiar precios

Hay dos modos para copiar los precios al portapapeles:

- **Copiar individual** — Cada producto lleva el costo completo del envío cargado a él. Usalo cuando le estás cotizando un solo artículo a un cliente.
- **Copiar bundle** — El envío se divide entre todos los productos de la lista. Usalo cuando el cliente se lleva todo junto.

---

## Exportar resumen

**Exportar resumen** descarga un archivo de texto con todos los datos de la compra: tasas del día, detalle por producto y totales. Ideal para guardar como registro o compartir por WhatsApp.

---

## Ejemplo rápido

Querés comprar un perfume que cuesta **USD 170**, la tienda te manda que el valor do PIX es **5,32**, el dólar oficial está en **$1.395**, la comisión es **$4 USD** y el envío total es **$17.000** entre **3 clientes**.

1. Verificá que "Valor do PIX" diga 5,32 (se autocompleta desde Madrid Center).
2. Cargá el producto con precio 170 y cantidad 1.
3. Poné 3 en "Clientes".
4. Elegí un margen del 30%.

La calculadora te muestra al instante el costo real, el precio de venta sugerido y cuánto ganás por unidad.

---

## Preguntas frecuentes

**¿Tengo que instalar algo?**
No. La calculadora funciona directo desde el navegador, sin instalación ni registro.

**¿Funciona en el celular?**
Sí, aunque se ve mejor en computadora por la cantidad de columnas en la tabla.

**¿Los datos se guardan?**
Sí, las listas de productos se guardan automáticamente en el navegador (localStorage). Al cerrar y volver a abrir la calculadora, tus listas siguen ahí. Las cotizaciones no se guardan — se vuelven a buscar al abrir.

**¿Con qué frecuencia se actualizan las cotizaciones?**
Cada vez que abrís la calculadora o apretás "Actualizar cotizaciones". No se actualizan solas mientras la tenés abierta.

**¿Puedo tener listas para distintos clientes?**
Sí. Usá el botón **+** para crear una pestaña por cliente o por compra. Todas se guardan automáticamente.

**¿Puedo usar los catálogos de varias tiendas a la vez?**
Sí. Cada vez que importás un archivo Excel se agrega al pool de búsqueda. Podés tener varios catálogos activos al mismo tiempo y la búsqueda de productos los recorre todos.
