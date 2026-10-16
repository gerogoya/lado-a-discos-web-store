# Sprint 6 — catálogo y disponibilidad

## Fix de títulos y vistas GA4

- Las dos rutas de producto resuelven Supabase mediante `ProductLookup`. La ficha, el título del navegador y `page_title` usan el mismo producto. El nombre usa `title` (igual que la ficha) y, si está vacío, `album`.
- Se mantiene la exportación estática, los slugs existentes y los metadatos estáticos previos de las rutas antiguas. Su título inicial puede contener los datos originales; la ficha y `page_title` se corrigen en el navegador al resolver Supabase. La ruta nueva mantiene metadatos genéricos. No se pretende resolver SEO/OG dinámico con este cambio.
- Se elimina la segunda consulta en `ProductDetail` y el fallback a inventario inicial/local. Error, ausencia o borrador muestran un estado neutral, nunca una identidad antigua.
- `AnalyticsPageViews` espera la resolución del producto, conserva URL y query string (incluido `slug` y atribución), y envía una vista por navegación. Una vuelta a la misma URL después de visitar otra página cuenta de nuevo. Cambios de hash no cuentan como otra pantalla.
- Consentimiento tardío mide solo la pantalla actual, sin recuperar visitas anteriores. Admin deshabilita la medición incluso si la etiqueta se cargó previamente. Se mantiene el reinicio de preferencias mediante recarga.
- Las páginas de error resueltas cuentan una vista neutral. Una carga abandonada antes de resolverse no cuenta una vista de producto. No hay reintento automático ni un tiempo artificial que atribuya datos incompletos.

### Requisito antes de publicar

Verificar la propiedad 555398414 y su flujo asociado a `G-NWYWRTJ1DJ`. No se modificó su configuración en este trabajo.

1. El usuario informó el 16 de octubre de 2026 que **Page Views** está desactivada en Medición mejorada. Es el interruptor general de esa opción, no una confirmación visual del ajuste avanzado. No cambiarlo para este fix. Confirmar antes de publicar que corresponde al flujo `G-NWYWRTJ1DJ` y que no hay otra etiqueta enviando `page_view`.
2. El código usa `send_page_view: false` para eliminar la vista de `config` y envía la vista manual cuando se resuelve la pantalla. Si Page Views se activara en Medición mejorada, revisar también **Page changes based on browser history events**: Google indica que `send_page_view: false` no desactiva ese envío por historial.
3. Tras autorización y despliegue, verificar solicitudes reales y DebugView con consentimiento: título, URL, referencia y exactamente una vista por navegación. Revisar después los informes procesados. Las pruebas locales de la cola de gtag no certifican la configuración externa ni la recepción por Google.

Los títulos históricos no se renombran. `view_item`, ecommerce y una tabla de correspondencias del historial quedan fuera de este fix.

Fuentes: https://developers.google.com/analytics/devguides/collection/ga4/views y https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications.

El despliegue inicial (PR #11) reveló una carrera en la entrada directa: el `page_view` podía quedar en la cola antes de que terminara de cargar la etiqueta. La corrección espera `Script.onReady` antes del primer envío. En una exportación estática local, con la etiqueta real y los envíos a GA4 interceptados, las cuatro entradas directas a una ruta antigua y las dos entradas directas a una ruta nueva enviaron exactamente una vista con título y URL correctos. Las 11 pruebas de navegador y la compilación de GitHub Pages pasaron. Queda repetir la comprobación en producción tras publicar esta corrección.

## Incluido

- Cada disco tiene `Visible en listado principal` en Admin. El control solo aparece para Publicado, Reservado y Vendido; al pasar a Borrador se desmarca automáticamente.
- Los productos Publicados existentes se conservan visibles tras la migración. Los Reservados y Vendidos requieren que el administrador active el control.
- El catálogo puede mostrar Publicado, Reservado y Vendido visibles. Los destacados solo muestran productos Publicados y visibles.
- Las tarjetas Reservado/Vendido muestran su disponibilidad centrada sobre la imagen y reemplazan **Agregar** por **Ver más**.
- En la ficha Reservado/Vendido queda solo **Consultar**. No se ofrece agregar al carrito.
- La consulta por WhatsApp incluye `Disponibilidad: En stock`, `Reservado`, `Vendido` o `No publicado`, según el estado del producto.
- Los Borradores no se exponen públicamente, aun con URL directa. Un Publicado no visible conserva su URL directa, pero no aparece en el catálogo.
- Las políticas de Supabase protegen productos, imágenes, identificadores y carga de imágenes con la lista explícita de administradores.
- El Admin verifica esa lista al abrir o iniciar sesión. Una cuenta sin autorización ya no puede entrar a editar y recibir un error de guardado confuso.
- El carrito se guarda de forma segura en el navegador: agregar desde el listado o desde la ficha se conserva al navegar y al recargar.
- La consulta grupal por WhatsApp usa un único mensaje: lista numerada, disponibilidad, precio, enlace de cada producto y total estimado.

## Fuera de alcance por ahora

- No se elimina ni bloquea automáticamente un disco que ya estaba en el carrito cuando luego pasa a Reservado o Vendido.

## Verificación local

- `npm.cmd run db:migrate:local`: migraciones aplicadas con 55 productos y 56 imágenes preservados.
- `npm.cmd run test:admin -- tests/product-availability.spec.ts`: valida visibilidad pública, tarjeta, ficha, WhatsApp y restricción de Borrador.
- `npm.cmd run test:admin -- tests/sprint-5.spec.ts -g "capture desktop"`: revisión visual local completada.
- `npx.cmd tsc --noEmit` y `node scripts/build-local-export.mjs`: correctos.
- `npm.cmd run test:admin -- tests/cart-persistence.spec.ts`: valida ficha → catálogo → recarga y listado → recarga.

## Publicación pendiente de aprobación

No se desplegó ni modificó la base de producción. Antes de publicar habrá que aplicar las migraciones de Supabase en producción y revisar el catálogo allí.
