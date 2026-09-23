# Contexto — Datta y la publicación de dashboards

Pega este bloque al inicio de un chat para que el asistente entienda dónde y cómo
se alojan nuestros tableros antes de pedirle cualquier cosa relacionada.

---

## Qué es Datta

Datta es nuestra aplicación propia (Plurum) donde alojamos los dashboards HTML de los
clientes. Vive en `C:\Proyectos\datta`: Next.js + Supabase, repo GitHub
`plurumconsultores/datta`, desplegada en Vercel.

## Cómo se almacenan los tableros

- Los tableros **no** son sitios web independientes ni se despliegan en Vercel. Se guardan
  como HTML en la tabla `dashboards` de Supabase y la app los sirve en la ruta `/d/<slug>`.
- Cada tablero es **un único archivo `.html` autocontenido**: CSS, JavaScript, imágenes y
  librerías van embebidos en el mismo archivo. Sin CDN externos, sin archivos aparte. Si el
  HTML depende de algo externo, no sirve — hay que incrustarlo.
- Publicar es **instantáneo**: no hay build ni despliegue. El cambio se ve al recargar.
- La app se sirve dentro de un **iframe con `sandbox`**. Eso importa al construir el HTML:
  cualquier descarga que inicie el tablero necesita que el iframe tenga `allow-downloads`
  (ya está habilitado). Conviene, de todas formas, ofrecer una alternativa como copiar los
  datos al portapapeles.

## Cómo se sube o actualiza un tablero

Desde `C:\Proyectos\datta`, en una terminal normal (cmd o PowerShell, **sin** privilegios de
administrador):

    cd C:\Proyectos\datta
    npx tsx scripts/cargar-tablero.ts <slug> "<Título>" "<C:\ruta\al\archivo.html>"

El script `scripts/cargar-tablero.ts` es idempotente:

- Si el slug **ya existe**: actualiza solo `title` y `content`, conservando `is_active` y
  `sort_order`.
- Si **no existe**: crea un tablero nuevo con `type='native'`, `is_active=true`, `sort_order=0`.

## Reglas que no se pueden saltar

1. Usar `npx tsx` **directo**. No usar `npm run cargar-tablero -- ...`: en Windows npm parte
   el título en varios argumentos y rompe la carga.
2. Comillas dobles alrededor del título y de la ruta del archivo, siempre.
3. La salida esperada al actualizar es `Tablero actualizado: <slug> (id: ...)`. Si en una
   actualización dice `Tablero creado`, el slug no coincidió y quedó un **duplicado**:
   detenerse y reportarlo.
4. Si Supabase responde con un error de Cloudflare (`523 Origin is unreachable`), el servicio
   está caído. No reintentar en bucle: informar y esperar.
5. **Prohibido** ejecutar `vercel` o `vercel --prod` desde la carpeta de un dashboard. Esa
   carpeta no es un proyecto de Vercel y hacerlo sobrescribe la app Datta en producción (ya
   pasó una vez y hubo que hacer rollback). La app misma se despliega solo desde
   `C:\Proyectos\datta` y por push a GitHub.
6. No modificar el HTML del dashboard al publicarlo. Se sube tal cual.

## Requisitos del entorno

- `C:\Proyectos\datta` debe tener `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y
  `SUPABASE_SECRET_KEY`, y las dependencias instaladas (`node_modules`). Si falta algo, el
  script lo dice y aborta.
- El comando necesita salida a internet hacia Supabase, así que debe ejecutarse en el equipo
  donde vive `C:\Proyectos\datta`.
- Si no se conoce el slug de un tablero existente: abrirlo en Datta y leerlo de la URL, que
  termina en `/d/<slug>`.

## Cambios en la app Datta (no en un tablero)

Si lo que cambia es la aplicación —no el HTML de un tablero— el flujo es distinto: commit y
push a `main`, y Vercel construye. Dos cosas aprendidas por experiencia:

- Que Vercel muestre el despliegue como *Ready* **no garantiza** que el dominio lo esté
  sirviendo. Ha pasado que el dominio sigue en un build anterior y hay que entrar a
  Deployments → fila del commit → ⋯ → **Promote to Production**.
- Para diagnosticar: abrir la **URL propia del despliegue** y compararla con el dominio.
  Si funciona en una y no en la otra, el problema es el enrutamiento del dominio, no el build.

## Tableros publicados

| Slug | Título |
|---|---|
| `seguimiento-eco-d1` | Seguimiento Encuesta ECO - D1 |
| `lamitech-momento-de-vida-2026` | Seguimiento diligenciamiento Momento de Vida - Lamitech |

## Segregación de datos por usuario (sept 2026)

Datta puede limitar lo que un usuario ve **dentro** de un tablero. Se configura en
Administración → Usuarios: un interruptor por usuario y, si está encendido, por cada
tablero al que tiene acceso, "sin limitación" o los valores permitidos de cada variable.

### El tablero declara sus variables

Para que un tablero aparezca como limitable, su HTML debe traer este bloque (en
cualquier parte del documento):

    <script type="application/json" id="datta-variables">
      {"variables": [
        {"clave": "filial", "etiqueta": "Filial",
         "valores": ["TGI", "Enlaza", "Corporativa"]},
        {"clave": "genero", "etiqueta": "Género",
         "valores": ["Femenino", "Masculino", "Otro"]}
      ]}
    </script>

- `clave` es el nombre del campo en los datos del tablero; `valores`, los que puede
  tomar, escritos igual que en los datos.
- `scripts/cargar-tablero.ts` lee ese bloque al subir el tablero y lo guarda en
  `dashboards.variables`. Guardar el HTML desde Administración también lo relee.
- Un tablero sin el bloque funciona igual, pero no se puede limitar: Administración
  muestra "este tablero no declara variables".

### El tablero recibe el límite

Al servir el tablero, Datta le inyecta al principio del HTML:

    window.DATTA = { usuario: "alguien@cliente.com", limites: { filial: ["TGI"] } }

`limites` trae solo las variables que tengan recorte; si el usuario no requiere
segregación, llega vacío. El tablero debe filtrar sus datos con eso antes de dibujar:

    const limites = window.DATTA?.limites ?? {};
    const visibles = FILAS.filter((fila) =>
      Object.entries(limites).every(([campo, permitidos]) =>
        permitidos.includes(String(fila[campo]))));

Ojo con lo que esto es y lo que no: en un tablero con los datos embebidos, filtrar
con `window.DATTA` cambia lo que se **muestra**, pero el dato completo sigue dentro
del archivo. Para segregación de verdad, el tablero debe pedir sus datos a una API
(como `/api/radar`), porque ahí el recorte se aplica en el servidor y las filas
prohibidas nunca salen de Supabase.

### Lo que ya aplica en el servidor

`/api/radar` recorta por `filial`, `genero` y `estado` según lo configurado para el
usuario, sin creerle nada al tablero. A un usuario con límites no le manda el
historial de movimientos, y `?resumen=1` le responde `resumen: null` con
`limitado: true`, porque la función `radar_resumen` cuenta sobre toda la base.
Queda pendiente una versión de esa función que reciba el recorte.
