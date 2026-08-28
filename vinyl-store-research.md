# Research inicial: tienda de vinilos usados y nuevos

Fecha: 2026-08-28  
Workspace: `C:\Users\Gero\Documents\5. MY APPS\Vinyl Store web site`

## Objetivo

Crear un sitio ecommerce para el mercado argentino, enfocado en discos de vinilo usados y algunos nuevos, con carrito de compras, administracion privada, carga de fotos, carga/edicion de productos, stock unitario y pagos/envios adecuados para Argentina.

Este documento resume la investigacion inicial, patrones de mercado, estructura sugerida, tecnologia recomendada y posibles direcciones visuales.

## Material local revisado

Carpeta revisada:

`C:\Users\Gero\Documents\5. MY APPS\Vinyl Store web site\Discos doce pulgadas-20260828T030633Z-1-001\Discos doce pulgadas`

Observaciones:

- Hay 53 fotos JPG iniciales de discos de 12 pulgadas.
- Las fotos estan en alta resolucion, mayormente horizontales, aproximadamente 4032x2268 px y entre 2 MB y 4.4 MB.
- Sirven como originales, pero para web conviene generar derivados optimizados:
  - portada cuadrada para tarjetas de producto.
  - imagen grande para pagina de producto.
  - miniatura liviana para busqueda/listados.
- El flujo de administracion deberia permitir subir varias imagenes por producto: tapa frontal, contratapa, disco/label, detalle de desgaste si aplica.

## Referencia principal: Vader Records

URL: https://www.vaderrecords.com.ar/

Estructura y patrones detectados:

- Barra superior con mensajes de confianza: envios a todo el pais, compra de colecciones, estado garantizado, nuevos ingresos.
- Navegacion simple: clasificacion de discos, cuidado, vender discos, nosotros, carrito.
- Hero directo: "Vinilos usados, probados y clasificados".
- Propuesta de valor basada en curaduria, limpieza, prueba de escucha y clasificacion Goldmine.
- Catalogo visible en la home, con buscador, filtros por decada y estado, tarjetas de producto, precios en ARS, descuentos y paginacion.
- Paginas educativas que refuerzan confianza, especialmente "Como clasificamos nuestros discos".

Puntos valiosos para tomar:

- Usar un lenguaje de confianza: probado, clasificado, garantia de reproduccion, estado informado.
- Explicar la escala de condicion.
- Mostrar productos rapido, sin esconder el catalogo detras de una landing larga.
- Hacer visible "Nuevos ingresos".

Puntos a mejorar sobre esa referencia:

- Dar mas peso visual a las fotos reales.
- Mejorar filtros para coleccionistas: artista, genero, decada, origen, sello, condicion del disco, condicion de tapa, precio, nuevo/usado, disponible/sin stock.
- Producto usado = pieza unica. El sitio debe comunicar "ultima unidad" o "stock: 1" con claridad.
- Agregar una administracion mas agil para carga masiva, porque cargar vinilos uno por uno puede volverse lento.

## Tiendas argentinas y patrones de mercado

### STM Discos

URL: https://stmdiscos.com.ar/vinilosusados/page/2/

Patrones observados:

- Categoria "Vinilos Usados".
- Ordenamiento por precio, A-Z, mas nuevo, mas vendido.
- Filtros por categoria, marca y precio.
- Carrito lateral, calculo de envio por codigo postal, umbral de envio gratis.
- Contacto por WhatsApp visible.
- Categorias como rock argentino, rock internacional, maxi singles, pop/synth pop, bandas sonoras, funk/soul/disco, jazz, tango, salsa/latin.

### London Records

URL: https://londonrecords.com.ar/vinilos-usados/

Patrones observados:

- Foco en vinilos de epoca, primeras ediciones USA o Europa.
- Mensaje fuerte de confianza: clasificados, testeados y con garantia.
- Descuento por efectivo o transferencia.
- Precios altos para ediciones buscadas, por lo que la informacion de edicion/origen es importante.

### Buho Records

URL: https://www.buhorecords.com.ar/vinilos-usados/

Patrones observados:

- Catalogo grande de usados.
- Filtros por categorias musicales y precio.
- Condicion visible como "Usado".
- Stock unitario comunicado: "Ultima unidad disponible" / "Solo quedan 1 en stock".
- Cuotas, transferencia, carrito, envio gratis y calculo por CP.

### Exiles Records

URL: https://www.exilesrecords.com/

Patrones observados:

- Mezcla de productos nuevos, usados, rarezas y accesorios.
- Secciones editoriales/comerciales como "New Arrivals" y "Rarezas".
- Productos con etiquetas: NUEVO, USA, edicion limitada, VG+/EX, sin stock.
- Lenguaje mas orientado a coleccionistas y ediciones especificas.

### Contexto Buenos Aires

URL: https://www.timeout.com/es/buenos-aires/mejores-disquerias-buenos-aires-discos-vinilo-zivals-eureka-records-abraxas

Time Out describe a Buenos Aires como una plaza con fuerte cultura de disquerias y compra de CDs/vinilos nuevos y usados. Esto refuerza que el sitio no deberia sentirse como una tienda generica: debe transmitir curaduria, barrio, confianza y conocimiento musical.

## Que esperan los compradores de vinilos usados

Para usados, el comprador necesita mas evidencia que en un producto nuevo:

- Estado del disco y estado de la tapa por separado.
- Fotos reales, no imagenes genericas.
- Si fue probado o solo inspeccionado visualmente.
- Si salta, tiene ruido, marcas, escritura, ring wear, tapa rota, insert faltante, etc.
- Pais/origen, ano, sello, numero de catalogo si se conoce.
- Si es primera edicion, reedicion, importado o nacional.
- Disponibilidad real, porque normalmente hay una sola unidad.
- Formas de pago locales: Mercado Pago, transferencia, cuotas si aplica.
- Envio claro: codigo postal, retiro/punto de entrega, embalaje seguro.
- Contacto rapido por WhatsApp para dudas de estado o envio.

## Modelo de datos recomendado para producto

Campos minimos:

- Titulo
- Artista
- Precio ARS
- Estado: nuevo/usado
- Stock: normalmente 1 para usados
- Estado del vinilo: M, NM, EX/VG++, VG+, VG, G, F/P
- Estado de tapa: M, NM, EX/VG++, VG+, VG, G, F/P
- Genero
- Subgenero/estilo
- Decada
- Ano
- Pais/origen
- Sello
- Numero de catalogo
- Formato: LP, 12", Maxi, EP, Box Set, etc.
- Descripcion corta
- Notas de condicion
- Tracklist opcional
- Imagen principal
- Galeria
- Estado de publicacion: borrador, publicado, reservado, vendido, archivado
- Etiquetas: nuevo ingreso, rareza, oferta, nacional, importado, recomendado

Campos utiles para administracion:

- SKU interno
- Costo de compra
- Precio sugerido
- Fecha de ingreso
- Ubicacion fisica/caja
- Fuente: coleccion propia, compra, consignacion
- Notas privadas

## Estructura sugerida del sitio

### Publico

- Home/catalogo
  - barra superior con confianza: envios, compra de colecciones, discos probados, nuevos ingresos.
  - hero compacto con foto real y propuesta de valor.
  - buscador grande.
  - accesos rapidos: usados, nuevos, nuevos ingresos, rarezas, rock argentino, jazz, tango.
  - grilla de productos.

- Catalogo
  - filtros: genero, precio, condicion, decada, origen, nuevo/usado, disponibilidad.
  - orden: nuevos ingresos, precio menor/mayor, artista A-Z, mas buscados.

- Producto
  - galeria de fotos reales.
  - precio, stock, condicion disco/tapa.
  - boton "Agregar al carrito".
  - boton secundario "Consultar por WhatsApp".
  - datos de edicion.
  - notas de reproduccion/estado.
  - envio/retiro.

- Carrito
  - items, subtotal, envio estimado, descuento transferencia si se decide ofrecer.
  - checkout Mercado Pago.

- Paginas de confianza
  - Como clasificamos los discos.
  - Como comprar.
  - Envios y embalaje.
  - Vende tus discos / compramos colecciones.
  - Contacto.

### Admin

- Login privado.
- Dashboard simple.
- Productos:
  - crear/editar/publicar/despublicar.
  - subir fotos.
  - reordenar galeria.
  - marcar vendido/reservado.
  - duplicar producto para carga rapida.
  - carga por CSV opcional.
- Ordenes:
  - ver pedidos.
  - estado: pendiente, pagado, preparando, enviado, entregado, cancelado.
  - link a comprobante/pago.
- Configuracion:
  - datos de contacto.
  - WhatsApp.
  - textos de envio.
  - umbral de envio gratis.
  - metodos de pago.

## Tecnologia recomendada

### Recomendacion principal: custom simple con Next.js + Supabase + Mercado Pago

Stack propuesto:

- Frontend/backend: Next.js con App Router.
- Base de datos: Supabase Postgres.
- Auth admin: Supabase Auth.
- Storage de fotos: Supabase Storage o Cloudinary.
- Pagos: Mercado Pago Checkout Pro.
- Hosting: Vercel para el sitio, Supabase para datos/storage.

Por que encaja:

- Permite disenar una UI propia, no generica.
- Permite un admin simple y especifico para discos, sin exceso de CMS.
- Supabase cubre base de datos, login y storage sin mantener servidores.
- Mercado Pago Checkout Pro es adecuado para Argentina y redirige al usuario a un entorno seguro de pago.
- Next.js permite catalogo rapido, SEO para productos y paginas de confianza.

Riesgos/costos:

- Hay que construir el admin.
- Hay que implementar bien webhooks de Mercado Pago para no vender dos veces el mismo disco.
- Hay que definir una politica clara de reserva de stock.

### Alternativa rapida: Tiendanube

Ventajas:

- Admin, carrito, pagos, envios, stock y plantillas ya resueltos.
- Muy alineado con Argentina.
- Permite vender mas rapido.

Desventajas:

- Menos control visual y funcional.
- El modelo de producto puede quedar mas generico para vinilos usados.
- Dependencia de plataforma y costos recurrentes.

### Alternativa clasica: WordPress + WooCommerce

Ventajas:

- Admin conocido.
- Plugins de Mercado Pago, envios, SEO y catalogo.
- Es probablemente cercano al enfoque tecnico de muchas tiendas locales.

Desventajas:

- Requiere mantenimiento, seguridad, backups y actualizaciones.
- Puede volverse lento o desordenado si se cargan muchas imagenes sin optimizar.
- Personalizar bien el flujo de usados/stock unitario puede requerir plugins o codigo.

## Recomendacion tecnica final

Si el objetivo es vender rapido con minimo desarrollo, usar Tiendanube.

Si el objetivo es crear una marca propia, controlar la experiencia y tener un admin hecho para discos usados, usar:

Next.js + Supabase + Mercado Pago Checkout Pro.

Para este proyecto recomiendo el stack custom simple, pero manteniendo el alcance inicial chico:

1. Catalogo publico.
2. Producto.
3. Carrito.
4. Checkout Mercado Pago.
5. Admin login.
6. CRUD de productos.
7. Upload de fotos.
8. Ordenes basicas.
9. Paginas de confianza.

No recomiendo empezar con marketplace, cuentas de clientes complejas, wishlist, reviews, recomendaciones por AI, integracion Discogs automatica o POS. Eso puede venir despues.

## Flujo de stock recomendado

Como muchos usados tienen stock 1:

- Producto publicado = disponible.
- Cuando el usuario inicia checkout, crear orden pendiente y reservar el producto por un tiempo limitado, por ejemplo 20-30 minutos.
- Si Mercado Pago confirma pago por webhook, marcar la orden como pagada y el producto como vendido.
- Si el pago expira/falla, liberar el producto.
- En admin, permitir marcar manualmente como reservado/vendido si se vende por WhatsApp o en persona.

## UI: direccion recomendada

La UI deberia sentirse:

- Argentina/local, no corporativa.
- Confiable y clara.
- Visual, con tapas reales grandes.
- Rapida para buscar.
- Con suficiente detalle para coleccionistas.
- Mobile-first, porque parte del trafico probablemente venga de Instagram, WhatsApp y Marketplace.

Evitaria:

- Landing page larga antes del catalogo.
- Estetica demasiado oscura si complica leer catalogos.
- Exceso de animaciones.
- Tarjetas enormes que muestran pocos productos por pantalla.
- Usar imagenes genericas de vinilos cuando hay fotos reales.

## Modelos visuales propuestos

Tambien cree un archivo visual con estos modelos:

`theme-models.html`

### Modelo A: Disqueria de barrio premium

- Fondo claro neutro, negro suave, rojo vino, detalles verde/azul.
- Enfoque: confianza, curaduria, usados probados.
- Ideal si queres vender usados con percepcion profesional.

### Modelo B: Catalogo de coleccionista

- Layout mas denso, filtros visibles, etiquetas tecnicas.
- Enfoque: artistas, ediciones, origen, condicion, stock.
- Ideal si el publico compara muchos discos antes de comprar.

### Modelo C: Retro moderno

- Energia visual mas musical, acentos mostaza/cian/rojo.
- Enfoque: nuevos ingresos, rarezas, seleccion destacada.
- Ideal si queres una marca mas memorable y social-media friendly.

### Modelo D: Minimal oscuro

- Fondo oscuro, producto destacado, tarjetas sobrias.
- Enfoque: discos como objetos premium.
- Ideal para rarezas y ediciones caras, pero hay que cuidar contraste y legibilidad.

Mi recomendacion inicial: combinar A + B.

Usaria la confianza visual de "Disqueria de barrio premium" para la home y el detalle de producto, con la eficiencia del "Catalogo de coleccionista" para filtros y grillas.

## Roadmap sugerido

### Fase 1: Definicion

- Elegir nombre/marca.
- Elegir modelo visual.
- Definir categorias iniciales.
- Definir escala de condicion y textos.
- Definir formas de pago/envio.

### Fase 2: MVP

- Home/catalogo.
- Pagina producto.
- Carrito.
- Checkout Mercado Pago.
- Admin login.
- CRUD productos.
- Upload de fotos.
- Ordenes basicas.

### Fase 3: Operacion

- Optimizar fotos.
- Carga masiva desde CSV.
- Marcar vendido/reservado.
- Paginas "Como comprar", "Envios", "Clasificacion", "Vende tus discos".
- SEO basico.

### Fase 4: Mejoras

- Integracion WhatsApp mas completa.
- Newsletter.
- Productos relacionados.
- Importacion asistida desde Discogs.
- Estadisticas de ventas.
- Descuentos por transferencia si se quiere manejar fuera de Mercado Pago.

## Fuentes consultadas

- Vader Records: https://www.vaderrecords.com.ar/
- Vader Records, clasificacion de discos: https://www.vaderrecords.com.ar/como-clasificamos-nuestros-discos/
- STM Discos, vinilos usados: https://stmdiscos.com.ar/vinilosusados/page/2/
- London Records, vinilos usados: https://londonrecords.com.ar/vinilos-usados/
- Buho Records, vinilos usados: https://www.buhorecords.com.ar/vinilos-usados/
- Exiles Records: https://www.exilesrecords.com/
- Time Out Buenos Aires, disquerias: https://www.timeout.com/es/buenos-aires/mejores-disquerias-buenos-aires-discos-vinilo-zivals-eureka-records-abraxas
- Mercado Pago Checkout Pro: https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/overview
- Mercado Pago getting started: https://www.mercadopago.com.ar/developers/en/docs/getting-started
- Tiendanube: https://www.tiendanube.com/
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Storage: https://supabase.com/storage
- Supabase Database: https://supabase.com/docs/guides/database/overview
- Next.js App Router / Server Actions: https://nextjs.org/docs/app
- Discogs grading guide: https://support.discogs.com/hc/en-us/articles/360001566193-How-To-Grade-Items
- Theme/design inspiration: https://dribbble.com/search/record-store
- Theme/design inspiration: https://themeforest.net/search/record%20store
