# Sprint 3: opciones del catalogo

## Revision local

El comando `npm run dev:local` conecta el frontend exclusivamente al Supabase local.
No cambia `.env.local`, que conserva la configuracion existente de produccion.

1. Iniciar Docker Desktop y ejecutar `npx supabase start`.
2. Ejecutar `npm run db:migrate:local`. Guarda un respaldo de `public` en `.local/`,
   aplica las migraciones pendientes en la base local y compara los discos e imagenes antes/despues.
3. Ejecutar `npm run db:review:local` para preparar la cuenta de pruebas local.
   Sus credenciales quedan en `.local/review-access.json`, excluido de Git.
4. Ejecutar `npm run dev:local` y abrir `http://localhost:3000/admin/`.
   Si el puerto esta ocupado, establecer `PORT` con otro puerto libre.

`npm run dev` sigue usando la configuracion normal de `.env.local`.
La cuenta de revision solo existe en la base local, no en produccion.

## Comportamiento

- Discos y Opciones del catalogo comparten las mismas listas.
- Generos, formatos y ambos estados se seleccionan; artista, pais y sello usan autocomplete.
- Agregar abre un dialogo sin perder el disco en curso y selecciona el valor guardado.
- Los nombres duplicados se rechazan ignorando mayusculas y espacios repetidos.
- Renombrar actualiza el nombre en los discos asociados. El dialogo informa ese alcance.
- Desactivar oculta una opcion en nuevas selecciones y conserva asociaciones existentes.
- Eliminar solo funciona para opciones sin discos asociados; la base aplica esta restriccion.
- El anio admite 1900 hasta el siguiente anio calendario o Sin especificar.
- Pais y sello son opcionales. Artista, genero, formato y ambos estados requieren seleccion.
- Los errores conservan los datos del formulario y muestran detalle/codigo cuando existe.
- Cada disco admite hasta cinco imagenes. Las miniaturas se pueden ordenar arrastrando o con
  botones; la primera queda como portada del catalogo.
- Agregar imagenes a un disco conserva las existentes. Tambien se pueden quitar y guardar una
  galeria vacia, que usa el logo como imagen alternativa.
- La pagina de detalle muestra una imagen por vez con controles anterior/siguiente e indicador.
- La base valida el limite incluso con escrituras simultaneas. El guardado detecta cambios de otra
  sesion y permite reintentar una carga fallida sin duplicar el disco ni los archivos.
- Pagina principal permite editar eyebrow, H1, texto introductorio y los dos botones del hero.
  Los textos descriptivos admiten negrita y enlaces sin aceptar HTML.
- Cada disco se puede marcar como destacado. El hero muestra hasta cinco discos en un carrusel
  automatico de 4 segundos, con controles anterior, siguiente y pausa. Cada slide muestra artista,
  titulo y precio, y abre el detalle del disco.
- Se pueden crear, ordenar, ocultar y eliminar multiples secciones inferiores. Las ocultas quedan
  disponibles en el admin, pero la politica de lectura publica impide mostrarlas a visitantes.

## Migracion

`supabase/migrations/20260911000000_catalog_options.sql` agrega `catalog_options`,
referencias por identificador, pais, formato, sello y la marca `needs_review`.
Conserva IDs, slugs, textos existentes, imagenes y el campo historico `album`.
Album deja de aparecer en el formulario y en la tienda; los nuevos discos usan el titulo
tambien en esa columna para mantener compatibilidad.

Los valores existentes se vinculan con opciones equivalentes. No se convierten
"Artista por completar" ni "Genero por completar" en opciones del catalogo.
No se inventa un pais, formato o sello para los registros anteriores.
Todos los discos anteriores quedan marcados para revision, porque no hay evidencia
confiable que permita separar automaticamente datos reales de los generados por el prototipo.
La marca no cambia su estado de publicacion ni borra sus valores anteriores.

Las opciones precargadas son las condiciones solicitadas, formatos comunes y 20 paises.
Los generos y artistas provienen de los valores existentes. Los estados legacy adicionales
(por ejemplo M) se conservan para no romper relaciones.

Las columnas de texto se mantienen sincronizadas para que la tienda pueda seguir leyendo
los nombres sin depender de consultas adicionales. La base valida categoria, actividad,
duplicados y relaciones. Los permisos mantienen el modelo existente: usuarios autenticados
administran; visitantes solo leen. No se introduce un nuevo sistema de roles en este sprint.

`supabase/migrations/20260912010000_homepage_content.sql` agrega el contenido unico de portada,
las secciones ordenables y el bucket publico `site-assets`. El guardado de contenido y secciones
es atomico, exige autenticacion y rechaza una edicion basada en una version desactualizada.

`supabase/migrations/20260912020000_featured_product_carousel.sql` agrega el orden de destacados
y protege en base de datos el limite maximo de cinco discos, incluso con guardados simultaneos.

## Verificacion

- `npm run test:catalog`: integracion real con Supabase local, crea y limpia sus datos.
- `npm run test:gallery`: limite, orden, concurrencia, permisos y guardado atomico de galerias.
- `npm run test:homepage`: persistencia, visibilidad publica, permisos y concurrencia de portada.
- `npm run test:admin`: navegador Chrome contra el servidor local; requiere cuenta de revision.
  `ADMIN_TEST_URL` permite indicar otro puerto. Capturas en `.local/` y fallos en `test-results/`.
- `npx tsc --noEmit`: tipos.
- `GITHUB_PAGES=true npm run build`: exportacion estatica; en PowerShell establecer la variable
  de entorno antes de ejecutar el comando y quitarla al terminar.

## Publicacion posterior

La migracion de produccion y el despliegue siguen pendientes de la revision del usuario.
Antes de publicar: respaldar la base de produccion, revisar su esquema contra la migracion,
aplicar la migracion y desplegar el frontend del mismo sprint. Evitar usar el admin anterior
durante esa ventana: los campos seleccionables nuevos requieren el frontend actualizado.
La tienda anterior sigue leyendo las columnas de texto conservadas.

No ejecutar el seed historico sobre datos reales: genera valores de prototipo y hace upsert.
Un rollback de codigo no debe eliminar las tablas nuevas ni las asociaciones ya cargadas;
si hiciera falta revertir la base, usar el respaldo y considerar los cambios posteriores.

`docs/`, `.local/` y las carpetas de material original permanecen excluidas de Git.
