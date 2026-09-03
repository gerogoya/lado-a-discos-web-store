# LADO A DISCOS

Sitio inicial para venta de discos de vinilo usados y nuevos en Argentina.

## Stack

- Next.js
- React
- TypeScript
- CSS custom properties
- Datos mock locales
- Carrito con pedido por WhatsApp

## Funcionalidad actual

- Catalogo con 53 productos mock generados desde fotos locales.
- Busqueda y filtros por genero.
- Pagina de detalle por producto.
- Carrito persistente en el navegador.
- Pedido por WhatsApp con resumen del carrito.
- Admin con login local de Supabase.
- Admin local para editar estado, precio, titulo, artista, album, anio, genero y moneda.
- Alta local de nuevos discos con imagenes.

## Sprint 1 local

El repo sigue trabajando sin base de datos externa. Los cambios del admin se guardan en `localStorage`, por lo que sirven para validar el flujo desde este equipo antes de conectar un backend real.

Limitaciones de esta etapa:

- El login demo no es seguridad real.
- Las imagenes cargadas desde el admin se guardan localmente en el navegador.
- Los discos nuevos aparecen en el catalogo local, pero no generan paginas de detalle estaticas para GitHub Pages.
- Para persistencia real, el siguiente paso recomendado es Supabase Postgres para productos y Supabase Storage para imagenes.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abrir:

```text
http://127.0.0.1:3000
```

Admin:

```text
http://127.0.0.1:3000/admin
```

El admin usa un usuario local de Supabase Auth.

## Supabase local

Crear `.env.local` desde `.env.example` y completar los valores locales de Supabase:

```bash
npx supabase status
```

Usar `Project URL` como `NEXT_PUBLIC_SUPABASE_URL` y `Publishable` como `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Para cargar los productos iniciales y subir las imagenes locales a Supabase Storage, completar tambien `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` con la key `SERVICE_ROLE_KEY` local y ejecutar:

```bash
npm run db:seed:products
```

## Proximas etapas

- Reemplazar datos genericos por informacion real de cada disco.
- Mover productos e imagenes del mock local a una base real cuando el flujo este validado.
- Conectar Supabase para autenticacion, productos y storage.
- Agregar ordenes y reserva real de stock.
- Integrar Mercado Pago cuando el flujo de compra este estable.
