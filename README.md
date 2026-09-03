# LADO A DISCOS

Sitio inicial para venta de discos de vinilo usados y nuevos en Argentina.

## Stack

- Next.js
- React
- TypeScript
- CSS custom properties
- Supabase para productos, imagenes y admin auth
- Carrito con pedido por WhatsApp

## Funcionalidad actual

- Catalogo con productos cargados desde Supabase y fallback local.
- Busqueda y filtros por genero.
- Pagina de detalle por producto.
- Carrito persistente en el navegador.
- Pedido por WhatsApp con resumen del carrito.
- Admin con login de Supabase Auth.
- Admin para editar estado, precio, titulo, artista, album, descripcion, anio, genero y moneda.
- Alta de nuevos discos con imagenes en Supabase Storage.

## Sprint 1

El admin usa Supabase para persistir productos e imagenes. En desarrollo local puede usarse Supabase CLI; en GitHub Pages se usa Supabase Cloud mediante variables publicas de GitHub Actions.

Limitaciones de esta etapa:

- GitHub Pages es hosting estatico. El catalogo y admin pueden leer/escribir en Supabase desde el navegador, pero las paginas de detalle nuevas no se generan automaticamente hasta un nuevo deploy estatico.
- La autorizacion fina del admin todavia depende de endurecer policies/roles antes de produccion real.

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

Aceptacion de invitaciones admin:

```text
http://127.0.0.1:3000/admin/accept-invite
```

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

## GitHub Pages con Supabase Cloud

En GitHub, configurar estas repository variables en `Settings > Secrets and variables > Actions > Variables`:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

`NEXT_PUBLIC_SUPABASE_URL` debe usar la URL base del proyecto, por ejemplo:

```text
https://ejqedephjqzusvkompeg.supabase.co
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` debe usar la key publica que empieza con `sb_publishable_`.

No subir `SUPABASE_SERVICE_ROLE_KEY` a GitHub Pages.

Configurar tambien `Authentication > URL Configuration` en Supabase:

```text
Site URL:
https://gerogoya.github.io/lado-a-discos-web-store/admin/accept-invite

Redirect URLs:
https://gerogoya.github.io/lado-a-discos-web-store/**
https://gerogoya.github.io/lado-a-discos-web-store/admin/accept-invite
http://localhost:3000/**
http://127.0.0.1:3000/**
```

El invite de Supabase confirma el usuario de esta app y redirige a `admin/accept-invite` para crear la contrasena. No debe redirigir al dashboard de Supabase.

## Proximas etapas

- Reemplazar datos genericos por informacion real de cada disco.
- Evaluar Vercel/Netlify si se necesitan paginas de detalle dinamicas para discos nuevos sin redeploy.
- Agregar ordenes y reserva real de stock.
- Integrar Mercado Pago cuando el flujo de compra este estable.
