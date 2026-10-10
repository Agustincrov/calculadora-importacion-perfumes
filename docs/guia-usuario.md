# Importo — Guía de uso

**Calculadora propia para compras en Ciudad del Este, Paraguay.**
Calculá el costo real de cada producto y su precio de venta en segundos, y armá tu lista de precios para clientes a partir de las listas de tus proveedores.

---

## ¿Para qué sirve?

Cuando comprás productos en Ciudad del Este, el precio final que pagás depende de varios factores: el precio en dólares, la cotización del USDT con que le pagás a la tienda, la comisión del shipper, la fee de transferencia y el envío. Esta calculadora une todo eso automáticamente y te muestra cuánto te costó cada producto y a cuánto tenés que venderlo para ganar lo que querés.

La app tiene dos pestañas:

- **Calculadora** — para un pedido concreto: cargás los productos y ves costo, precio de venta y ganancia de cada uno.
- **Generador de listas** — para tu lista de precios: juntás las listas de tus proveedores, la app les pone precio a todos y publicás un catálogo para tus clientes.

---

## Paso 1 — Tasas y configuración

Todas las compras se pagan en **USDT directo a la tienda** (1 USDT ≈ 1 USD), así que la única cotización que importa es la del USDT. Se actualiza sola al abrir la calculadora; si el dato del día es distinto, podés editarla a mano.

| Campo | Qué es |
|---|---|
| **USDT (ARS)** | Cotización del USDT en pesos: el precio de Binance P2P, tomado de dolarapi.com (difiere por centavos). Se autocompleta. Con esto se calcula el costo de los productos, la comisión del shipper, la fee de transferencia y todos los valores en dólares. |
| **Comisión/producto** | Lo que cobra el shipper por producto, en USD. Se paga al valor del USDT. Generalmente 4. |
| **Envío total (ARS)** | Lo que de verdad le pagás al fletero por todo el embarque. No se le cobra así al cliente: se usa solo para mostrarte tu costo y ROI reales en el resumen. |
| **Envío fijo/producto** | Lo que le cobrás al cliente por cada producto, sin importar el costo real del embarque (por eso "fijo"). Si el cliente pide varios productos, cada uno suma este monto. |
| **Fee transferencia USDT** | Fee fija (en USDT) por cada transferencia real que hacés. Se cuenta una vez por cada nombre distinto del campo "Pedido" (ver más abajo). |
| **Redondeo precio** | Los precios de venta se redondean hacia arriba a este número. Es el mismo que usa el Generador de listas, así los precios de la calculadora y los del catálogo coinciden. |

> El botón **Actualizar cotizaciones** vuelve a buscar el USDT en cualquier momento. La comisión, los envíos, la fee USDT y el redondeo son configuración tuya: se guardan solos y no se pierden al recargar la página.

### Cómo se calcula el costo

```
precio_usd × cotización_usdt = costo del producto en ARS
+ comisión (USD × USDT)
+ envío fijo (solo productos para clientes)
+ parte de la fee de transferencia
= costo total
```

### Pedido (transferencias)

Cada fila tiene un campo **"Pedido"** debajo del cliente: escribí ahí un nombre que identifique cada transferencia real que vas a hacer. Si varios productos van en la misma transferencia, poneles el mismo nombre, así la calculadora cobra la fee de transferencia una sola vez entre esos productos. Si vas a transferir en momentos distintos (por ejemplo, el mismo pedido repartido en dos días), usá nombres distintos: cada uno cuenta como una transferencia con su propia fee. Si no completás ningún pedido, se cuenta una sola transferencia.

---

## Paso 2 — Múltiples listas

Encima de la tabla aparecen pestañas. Cada pestaña es una lista de productos independiente.

- **Crear lista:** hacé clic en el botón **+** para agregar una pestaña nueva.
- **Renombrar:** doble clic sobre el nombre de la pestaña.
- **Eliminar:** hacé clic en la **×** de la pestaña. Necesitás al menos una lista.
- **Guardado automático:** todas las listas se guardan en el navegador. Al cerrar y volver a abrir la calculadora, las listas siguen ahí.
- **Reset:** limpia los productos de la lista activa (queda una fila vacía) sin tocar las demás.

Usá una lista por cliente o por compra para mantener todo organizado.

---

## Paso 3 — Cargá tus productos

Hacé clic en **Agregar producto** para sumar una fila. Cada fila representa un producto.

Completá los campos editables:

- **Tipo** — **CLI** si el producto es para un cliente (paga envío fijo) o **STOCK** si es para vos (sin envío). Hacé clic para cambiarlo.
- **Cliente** — El nombre del cliente (solo en filas CLI). Sirve para contar clientes y para el desglose por cliente del resumen.
- **Producto** — El nombre del perfume. Si tenés listas cargadas, escribí parte del nombre y te aparecen sugerencias con precio y proveedor (si está en varios proveedores, se muestra el más barato). Al elegir una, se completan el nombre, el precio y el margen según los tramos del Generador de listas.
- **Precio USD** — El precio en dólares que te cobra la tienda.
- **Cantidad** — Cuántas unidades de ese producto comprás.
- **Margen %** (en la tabla de abajo) — El margen de ganancia que querés. Un 30% significa que tu ganancia es el 30% del precio de venta final (no es un markup).
- **Gan. USD/unid** (en la tabla de abajo) — Si preferís, escribí directamente cuántos dólares (al valor del USDT) querés ganar por unidad, y el margen se calcula solo.

Los resultados están repartidos en **dos tablas**: la de arriba (costo real) y una más chica debajo, junto al Resumen (precio de venta). Las dos muestran los mismos productos en el mismo orden. Todas las columnas de resultados muestran el valor total (precio × cantidad).

**Tabla de arriba — Fase 1, costo del producto (azul):**
- **USDT total** — Cuántos USDT le mandás a la tienda por esa fila.
- **Costo ARS total** — Lo que te cuesta en pesos solo el producto, al valor del USDT.

**Tabla de arriba — Fase 2, gastos del shipper (verde):**
- **Comisión total** — La comisión del shipper por todas las unidades, en pesos.
- **Envío + fee total** — El envío fijo que le cobrás al cliente, más la parte proporcional de la fee de transferencia. Las filas STOCK no llevan envío, pero sí la fee USDT si corresponde.
- **Costo total** — El costo real final: producto + comisión + envío/fee.

**Tabla de abajo — Precio de venta (violeta), junto al Resumen:**
- **Margen %** — Editable.
- **Precio ARS** — El precio de venta para lograr ese margen, redondeado hacia arriba (Redondeo precio).
- **Precio USD** — Ese precio en dólares, al valor del USDT.
- **Ganancia** — Cuánto ganás en pesos después de cubrir todos los costos.
- **Gan. USD/unid** — La ganancia por unidad en dólares, al valor del USDT. Editable (ver arriba).
- **Margen real** — El margen que te queda después de redondear, con colores: verde (20% o más), amarillo (entre 10% y 20%), rojo (menos del 10%).

---

## Paso 4 — Revisá el resumen

El panel de resumen muestra el total de la operación:

- Unidades totales, USDT a mandar y costo en pesos del producto.
- Comisiones y envío **real** (el que le pagás al fletero).
- Costo total real: producto + comisiones + envío real + fees USDT.
- Venta y ganancia de los productos para clientes (las filas STOCK no suman venta).
- Ganancia en USD (al valor del USDT).
- ROI: ganancia sobre costo total real.
- Si hay más de un cliente, un desglose por cliente con unidades, costo, venta y ganancia.

---

## Catálogos en la calculadora

El botón **Importar catálogo** de la calculadora carga una planilla Excel o un PDF de un proveedor. Desde ahí, al escribir un producto en la tabla te aparecen sugerencias con nombre y precio.

Las listas que cargás desde la calculadora y las que cargás desde el Generador de listas son **las mismas**: se ven en las dos pestañas y las dos las usan. Cada lista aparece como una etiqueta con su nombre y cantidad de productos; para quitarla, hacé clic en la **×**.

El PDF tiene que tener texto seleccionable (no sirve uno escaneado o sacado como foto). Los productos marcados como tester ("P.TT.") se cargan con la palabra TESTER adelante del nombre.

---

## Generador de listas

En la pestaña **Generador de listas** armás tu lista de precios para clientes a partir de las listas de tus proveedores.

### 1. Importar listas de proveedor

Podés cargar varias listas, de cualquiera de estas formas:

- **Texto de WhatsApp:** pegá el mensaje del proveedor (con las marcas en negrita y viñetas ▪) y apretá **Procesar texto pegado**.
- **Excel/Numbers/PDF:** uno o varios archivos a la vez.
- **Traer catálogo Ponto Com:** carga directo desde pontocom.com todos los perfumes y kits de perfume con stock, sin descargar nada. Tarda entre 10 y 30 segundos. No se cargan los agotados ("indisponível"), los body splash, sprays corporales, perfumes para cabello ni decants. Si ya lo habías traído antes, se reemplaza por la versión nueva en vez de duplicarse. Si aparecen marcas que la app todavía no conoce, te avisa cuáles son, porque se van a preciar con los tramos de margen generales.

**Borrar todo** quita todas las listas cargadas y el resultado.

**Marcas conocidas:** la marca de cada producto se detecta buscando su nombre dentro del nombre del producto (la app ya conoce más de 300 marcas). Si falta una, agregala acá, o corregila directamente en la tabla de revisión: la próxima vez la reconoce sola.

### 2. Configuración de precios

- **Costo:** se calcula igual que en la calculadora (USDT directo), asumiendo una sola transferencia.
- **Envío fijo y redondeo:** se toman de la pestaña Calculadora, así los precios coinciden.
- **Tramos de margen:** el margen depende de cuánto cuesta el producto en dólares (por ejemplo, hasta USD 60 → 32%). Hay un juego de tramos general y otro para las **marcas árabes**, que compiten por precio y llevan menos margen. Podés editar, agregar o quitar tramos.

Apretá **Generar lista de precios**.

### 3. Posibles duplicados

El mismo perfume suele venir escrito distinto en cada proveedor. Si un producto está igual en varias listas, la app se queda con el más barato. Si dos nombres se parecen pero no son iguales, te los muestra en **Posibles duplicados a revisar**: elegí **Es el mismo** o **Son distintos**. La app recuerda tu respuesta y no te lo vuelve a preguntar.

Nunca se mezclan tamaños distintos, versiones masculina y femenina, testers con productos normales, ni variantes como Intense, Elixir o recargable.

### 4. Revisión final

La tabla muestra cada producto con su marca, proveedor (🔗 si está en varios), costo, margen, precio final y ganancia (en pesos y en dólares al USDT).

- Podés **corregir la marca** (queda recordada para la próxima vez).
- Podés **cambiar el precio final** a mano (↺ vuelve al calculado).
- **+** agrega el producto como fila en la lista activa de la Calculadora.
- **×** lo excluye de la lista. Los productos que no son perfume (cremas, productos para el cabello, infantiles) se excluyen solos 🚫. Podés verlos y restaurarlos con **Mostrar excluidos**.
- **Filtro de marcas para publicar:** destildá las marcas que no querés publicar. Se recuerda, y las marcas que aparecen por primera vez se marcan como "nueva".

### 5. Publicar

- **Publicar catálogo:** sube la lista como una página buscable a `agustincrov.github.io/calculadora-importacion-perfumes/catalogo.html`, siempre el mismo link. La primera vez hay que configurar la clave de publicación (abajo del botón).
- **Descargar página buscable:** descarga ese mismo archivo (`catalogo.html`) en vez de publicarlo.
- **Exportar Excel:** descarga la lista con marca, producto y precio.

En el catálogo, tus clientes pueden buscar, filtrar por categoría (nicho, diseñador, árabe), marca y rango de precio, armar un carrito y mandarte el pedido por WhatsApp. El carrito descuenta $10.000 por cada unidad extra ("Descuento envío combinado").

Los precios del catálogo quedan fijos al momento de publicar: si cambian las cotizaciones, volvé a generar y publicar.

---

## Exportar resumen

**Exportar resumen** descarga un archivo de texto con todos los datos de la compra: USDT y configuración del día, detalle por producto (costo, precio de venta y ganancia) y totales. Sirve para guardar como registro o compartir por WhatsApp.

---

## Ejemplo rápido

Querés comprar un perfume que cuesta **USD 50**. El USDT está en **$1.500**, la comisión es **4 USD**, el envío fijo es **$10.000/producto** y la fee de transferencia es **3 USDT**.

1. Verificá que "USDT" diga 1.500.
2. Cargá el producto con precio 50 y cantidad 1.
3. Poné un margen del 30%.

Costo: 50 × 1.500 = $75.000 + comisión $6.000 + envío $10.000 + fee $4.500 = **$95.500**. Precio de venta: $95.500 ÷ 0,70 = $136.428, redondeado a **$136.500**. Ganancia: **$41.000** (USD 27,33).

Si cargás más productos para el mismo cliente, cada uno suma su propio envío fijo, y la fee de transferencia se reparte entre todos los productos del mismo pedido.

---

## Preguntas frecuentes

**¿Tengo que instalar algo?**
No. La calculadora funciona directo desde el navegador.

**¿Funciona en el celular?**
Sí, aunque se ve mejor en computadora por la cantidad de columnas.

**¿Los datos se guardan?**
Sí, en el navegador que estés usando: las listas de productos, tu configuración, las listas de proveedores, los tramos de margen, las marcas que agregaste o corregiste, tus respuestas sobre duplicados y el filtro de marcas. La cotización del USDT no se guarda: se vuelve a buscar al abrir. Si cambiás de navegador o de computadora, no vas a ver tus datos.

**¿Con qué frecuencia se actualiza el USDT?**
Cada vez que abrís la calculadora o apretás "Actualizar cotizaciones". No se actualizan solas mientras la tenés abierta.

**¿Puedo tener listas para distintos clientes?**
Sí. Usá el botón **+** para crear una pestaña por cliente o por compra, o cargá varios clientes en la misma lista con el campo "Cliente".

**¿Puedo usar los catálogos de varias tiendas a la vez?**
Sí. Cada lista que importás se suma a las anteriores, y tanto la búsqueda de la calculadora como el Generador de listas las recorren todas.
