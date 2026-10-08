# Changelog

Este registro resume cambios, mejoras y correcciones relevantes de Lado A Discos.

## Sprint 6 — Catálogo, disponibilidad y carrito

### Agregado

- Control de administración **Visible en listado principal** para discos Publicados, Reservados y Vendidos.
- Estados de disponibilidad visibles en el catálogo y en las consultas de WhatsApp.
- Consulta grupal del carrito en WhatsApp con una sola introducción, lista numerada, disponibilidad, precio, enlace de cada disco y total estimado.

### Mejorado

- Los discos Reservados o Vendidos que se marcan como visibles muestran su estado sobre la imagen y llevan a su ficha mediante **Ver más**.
- La ficha de un disco Reservado o Vendido permite consultar por WhatsApp, sin ofrecer agregar al carrito.
- El carrito persiste al navegar y recargar, tanto al agregar desde el catálogo como desde una ficha de producto.
- El acceso al Admin comprueba la lista de administradores antes de permitir ediciones.

### Corregido

- Se eliminó el error de guardado confuso al intentar modificar un producto con una cuenta autenticada que no tiene permiso de administración.
- Se corrigió la consulta desde el detalle para que agregue el producto al carrito correctamente.
- Se corrigió el mensaje del carrito para evitar saludos y contenido repetidos por cada disco.

## Sprint 5 — Identidad, contacto y privacidad

### Agregado

- Metadatos para vista previa al compartir enlaces, favicon e imagen de marca.
- Sección de contacto editable desde el Admin: punto de retiro con coordinación previa, horarios, WhatsApp y redes sociales.
- Mapa de la zona de retiro en la página principal.
- Enlace de crédito de desarrollo a Greyline Studio en el pie de página.

### Mejorado

- Logo de mayor presencia en la navegación.
- Aviso de cookies y privacidad horizontal, con consentimiento para Google Analytics.

### Corregido

- Se retiró el enlace Admin del menú público y se añadió `noindex` a las rutas administrativas.
- Las consultas de un producto incluyen un enlace absoluto a su ficha.
