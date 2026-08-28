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
- Admin mock con login local.
- Cambio de estado de producto: publicado, reservado, vendido o borrador.

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

Password demo:

```text
ladoa-demo
```

## Proximas etapas

- Reemplazar datos genericos por informacion real de cada disco.
- Agregar formulario admin para crear y editar productos.
- Conectar Supabase para autenticacion, productos y storage.
- Agregar ordenes y reserva real de stock.
- Integrar Mercado Pago cuando el flujo de compra este estable.

