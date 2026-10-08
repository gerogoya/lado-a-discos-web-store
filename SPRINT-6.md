# Sprint 6 — catálogo y disponibilidad

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
