# Sprint 5 — revisión local

## Incluido

- Logo original en la tarjeta para compartir (1200 × 630), metadatos Open Graph/Twitter y favicon vectorial con PNG de respaldo e icono de inicio.
- Logo de navegación de 72 px en escritorio y 64 px en celular; Contacto reemplaza Admin en el menú.
- `/admin/` y sus rutas descendientes tienen `noindex, nofollow` en el HTML.
- Contacto al final de la portada: dirección, modalidad de retiro, horarios opcionales, WhatsApp, email opcional, redes y mapa.
- Admin → Contacto permite editar estos datos, mostrar/ocultar el mapa y agregar, ordenar, ocultar o eliminar hasta 20 redes con nombre y URL HTTPS.
- El WhatsApp guardado se aplica al contacto, carrito, consulta de producto y contacto de privacidad.
- Las consultas incluyen una URL absoluta. Los productos posteriores al despliegue usan `/producto/?slug=...`, que funciona en el hosting estático. Los enlaces locales apuntan a localhost; en producción usarán el dominio desde el que se visita la tienda.
- Banner inferior de privacidad de ancho completo, con espacio reservado para no tapar contenido, carrito ni botón de volver arriba. Aceptar/Rechazar tienen la misma accesibilidad. Se conserva el consentimiento previo.

## Revisión

1. Mantener Docker Desktop y Supabase local encendidos.
2. `npm.cmd run db:migrate:local` respalda el esquema público y aplica solo migraciones locales, comprobando que conserva productos e imágenes.
3. `npm.cmd run db:review:local` prepara la cuenta local y su pertenencia a la lista de administradores. Credenciales en `.local/review-access.json` (archivo ignorado por Git).
4. `npm.cmd run dev:local` inicia `http://localhost:3000/` usando exclusivamente Supabase local.
5. Abrir `/admin/`, iniciar sesión con la cuenta local y seleccionar **Contacto**.

## Verificación

- `npm.cmd run test:admin -- tests/sprint-5.spec.ts`: permisos anónimo/no-admin/admin, validación de URL, conflicto entre sesiones, persistencia, orden/visibilidad/eliminación de redes, número centralizado y enlaces a productos, metadatos, consentimiento y espacio del carrito móvil.
- La prueba visual genera capturas `.local/sprint5-*.png`, restaura el contacto original y verifica que no haya desbordamiento horizontal móvil.
- `node scripts/build-local-export.mjs`: compilación estática compatible con GitHub Pages usando configuración local, sin desplegar.
- `node scripts/generate-brand-assets.mjs`: regenera los PNG a partir del favicon SVG y compone la tarjeta con el logo original.

## Publicación pendiente de aprobación

No se ha desplegado ni modificado la base de producción. La imagen de vista previa entregada por WhatsApp/redes y la desindexación de Google solo podrán comprobarse después de publicar y de que esas plataformas vuelvan a consultar las URLs.

La nueva tabla `contact_settings` requiere `public.is_admin()`. Se incluye la migración de la lista de administradores que ya existía en la rama `gfg/supabase-admin-rls`; antes de un futuro despliegue se debe comprobar su estado remoto y conservar los administradores existentes. La migración de contacto mantiene lectura pública y escritura solo para administradores de esa lista. No modifica las políticas del catálogo ni de la portada.

Google Maps se carga de forma diferida y establece su propia conexión con Google; se informa de esto en Privacidad, separadamente de Analytics.
