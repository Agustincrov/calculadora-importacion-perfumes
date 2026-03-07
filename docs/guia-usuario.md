# Calculadora de Importación — Guía de uso

**Herramienta para importadores de Ciudad del Este, Paraguay.**
Calculá el costo real de cada producto y su precio de venta en segundos.

Acceso: [agustincrov.github.io/calculadora-importacion-perfumes](https://agustincrov.github.io/calculadora-importacion-perfumes)

---

## ¿Para qué sirve?

Cuando comprás productos en Ciudad del Este, el precio final que pagás depende de varios factores: la tasa del día de la tienda, el servicio que usás para mandar el dinero, el dólar oficial, la comisión del shipper y el envío. Esta calculadora une todo eso automáticamente y te muestra cuánto te costó cada producto y a cuánto tenés que venderlo para ganar lo que querés.

---

## Paso 1 — Tasas y configuración

Al abrir la calculadora, los valores se actualizan solos desde internet. Aun así, podés editarlos manualmente si los datos del día son distintos.

| Campo | Qué es |
|---|---|
| **Valor do PIX** | La tasa que te manda la tienda ese día. Ej: "5,32 valor do pix aquí na loja hoje" |
| **Mejor PIX (BRL/USD)** | El mejor servicio disponible para mandar dólares y que lleguen en reales. Se completa solo. |
| **Dólar Oficial** | Cotización oficial del día. Se usa para calcular cuánto te cuestan los productos en pesos. |
| **Dólar Blue** | Se usa solo para mostrarte el precio de venta equivalente en dólares blue. |
| **USDT** | Cotización del USDT. Se usa para calcular la comisión del shipper en pesos. |
| **Comisión/producto** | Lo que cobrás al shipper por producto, en USD. Generalmente $4. |
| **Envío total** | El costo total del envío en pesos, que se reparte entre todos los clientes. |
| **Clientes** | Cuántas personas comparten el envío. Si sos vos solo, dejalo en 1. Si son 3 amigos comprando juntos, poné 3. |

> El boton **Actualizar cotizaciones** refresca todos los valores desde internet en cualquier momento.

---

## Paso 2 — Cargá tus productos

Hacé clic en **Agregar producto** para sumar una fila a la tabla. Cada fila representa un producto (o el pedido de un cliente).

Completá los campos editables:

- **Producto** — El nombre del perfume u artículo. Si cargaste un catálogo, podés buscarlo escribiendo.
- **Precio USD** — El precio en dólares que te cobra la tienda.
- **Cantidad** — Cuántas unidades de ese producto estás comprando.
- **Margen %** — El margen de ganancia que querés aplicar. Un 30% significa que tu ganancia es el 30% del precio de venta final.

El resto de las columnas se calculan solas:

- **BRL/unid** — Cuántos reales cuesta ese producto.
- **USD pagás** — Cuántos dólares reales mandás al servicio PIX.
- **Costo ARS** — Lo que te cuesta en pesos argentinos (al dólar oficial).
- **Comisión** — La comisión del shipper por esa unidad, en pesos.
- **Envío** — La parte del envío que le corresponde a ese producto.
- **Costo total** — El costo real final por unidad, sumando todo.
- **Precio ARS** — El precio al que tenés que venderlo para lograr el margen que pediste.
- **USD blue** — Ese mismo precio expresado en dólares blue (útil para publicar).
- **Ganancia** — Cuánto ganás por unidad después de cubrir todos los costos.
- **Margen real** — El margen real que te queda, mostrado con colores: verde (20% o más), amarillo (entre 10% y 20%), rojo (menos del 10%).

---

## Paso 3 — Revisá el resumen

El panel de la derecha muestra el total de la operación:

- Cuántos BRL y USD necesitás juntar en total.
- Cuánto gastás en pesos entre producto, comisiones y envío.
- Cuánto vas a cobrar en total y cuánto ganás.
- El ROI (retorno sobre la inversión): cuánto ganás por cada peso que invertís.

---

## Catálogo de productos (opcional)

Si la tienda te manda una planilla Excel con sus productos y precios, podés importarla con el botón **Importar catálogo**. A partir de ahí, al escribir el nombre de un producto en la tabla, te aparecen sugerencias para completar el nombre y el precio automáticamente.

---

## Exportar y compartir

**Exportar resumen** — Descarga un archivo de texto con todos los datos de la compra: tasas del día, detalle por producto y totales. Ideal para guardar como registro o compartir por WhatsApp.

**Copiar precios** — Copia al portapapeles la lista de productos con su precio en pesos y en dólares blue. Perfecto para pegar directo en un grupo o catálogo.

---

## Ejemplo rápido

Querés comprar un perfume que cuesta **USD 170**, la tienda te manda que el valor do PIX es **5,32**, el dólar oficial está en **$1.395**, la comisión es **$4 USD** y el envío total es **$17.000** entre **3 clientes**.

1. Poné 5,32 en "Valor do PIX".
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

**¿Los datos que cargo se guardan?**
No se guardan en ningún servidor. Todo queda en tu pantalla y desaparece al cerrar la pestaña. Por eso está el botón de exportar resumen.

**¿Con qué frecuencia se actualizan las cotizaciones?**
Cada vez que abrís la calculadora o apretás "Actualizar cotizaciones". No se actualizan solas mientras la tenés abierta.
