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

## Encuestas hechas desde Datta (sept 2026)

Además de las encuestas a la medida en `public/e/<nombre>.html` (como el Radar), Datta
tiene un apartado para armarlas sin programar: **Encuestas**, en la barra lateral, visible
para quien tenga rol `admin` o `analista`.

### Cómo funciona

- La definición de cada encuesta vive en la tabla `encuestas`: título, cliente, colores,
  mensaje de bienvenida, preguntas y mensaje de cierre.
- Las respuestas **no** comparten tabla: al publicar, la función
  `crear_tabla_respuestas(slug)` crea `respuestas_<slug>` con su RLS. Esa función valida
  el slug y exige rol de equipo; desde la aplicación no se arma SQL.
- La encuesta se ve en `/e/<slug>`, sin cuenta, porque `proxy.ts` deja pasar todo lo que
  cuelga de `/e/`. Datta genera el enlace y su QR.
- Las respuestas las inserta el servidor con la llave secreta (`/e/<slug>/responder`), así
  que la tabla no tiene ninguna política de escritura abierta y el navegador nunca ve una
  llave de Supabase.
- Lo que llega se comprueba contra la definición: una opción que no existe, una escala
  fuera de rango o una obligatoria vacía se rechazan.

### Tipos de pregunta

Opción única, opción múltiple (con tope opcional), escala y texto abierto (caja de una o
varias líneas, con tope de caracteres). La escala trae Likert 1 a 5,
frecuencia 1 a 5 y Plurum 1 a 10 —la escala de Plurum es de 1 a 10, siempre—, más un
atajo "0 a 10" para los clientes que la piden así. El rango es editable: puede empezar en
0 y llegar hasta once botones, con las etiquetas de los extremos que se quieran.

Las respuestas abiertas no se agrupan: se leen una por una o se descargan en el CSV, y un
tablero conectado solo puede contar cuántos respondieron. Por eso, si un tablero espera
una variable y en la encuesta es de texto abierto, el análisis de compatibilidad lo marca
en rojo.

### Descripciones (bloques de texto)

Además de preguntas, la lista admite bloques de **descripción** (`tipo: "nota"`): solo
texto, con título opcional, que ocupan su propia pantalla con un botón para continuar.
Sirven para presentar una sección o dar instrucciones. Van en el mismo arreglo
`preguntas` para poder ordenarlos entre las preguntas, pero **no se responden**: no se
numeran, no entran al CSV ni a la tabla de respuestas, no las ve el API del tablero y el
análisis de compatibilidad las ignora. En el código eso lo hace `preguntasReales()`.

Cada pregunta tiene además su propia **descripción** opcional, que se muestra en letra más
pequeña debajo del enunciado.

### Preguntas condicionales

Una pregunta puede depender de una respuesta anterior de dos maneras, y las dos se
configuran en el bloque plegable *Cuándo se muestra y qué opciones ofrece*:

- **Condición de visibilidad** (`condicion`): se muestra solo si en una pregunta anterior
  marcaron alguna de las opciones elegidas. Si no, la encuesta la salta.
- **Opciones según una respuesta anterior** (`opcionesSegun`): la pregunta aparece
  siempre, pero su lista de opciones sale de grupos "si respondieron esto → muestra
  estas". Si la respuesta no cae en ningún grupo, se usan las opciones normales de la
  pregunta, que funcionan como respaldo.

Reglas de la implementación, para no romperlas después:

- Una regla **solo puede mirar hacia atrás**. Al publicar se comprueba; si apunta a una
  pregunta posterior, no publica y dice cuál mover. El editor también lo avisa en rojo si
  reordenas y una regla queda apuntando hacia adelante.
- La base de una regla solo puede ser una pregunta de opción única o múltiple: la
  condición se define marcando opciones.
- Renombrar el identificador de una pregunta renombra también las reglas que lo usaban.
- Al volver atrás y cambiar la respuesta que abría una rama, lo contestado en esa rama se
  descarta (`depurarRespuestas`), en el navegador y otra vez en el servidor.
- El servidor recorre las preguntas en orden acumulando lo aceptado: una respuesta a una
  pregunta que no aplicaba no se guarda, y una opción que no le tocaba se rechaza
  (`preguntaVisible` y `opcionesVisibles`, en `lib/encuestas.ts`).
- En el tablero conectado, una variable que viene de una pregunta condicional trae menos
  respuestas que el resto: el análisis de compatibilidad lo avisa en ámbar.

### Requisitos

- Correr `scripts/encuestas.sql` una vez en Supabase.
- `npm install qrcode` en el proyecto: es lo que dibuja el QR. Sin ese paquete todo
  funciona menos el QR, y el panel lo dice.

### Lo que sigue

El envío personalizado por correo (mensaje introductorio y enlace propio por persona)
todavía no está: hoy el enlace es único y la respuesta es anónima.

### Qué ve el cliente

Un usuario de cliente no entra nunca al editor. En su sección **Encuestas** ve, de las
encuestas de sus clientes, solo las que el equipo marcó con **Mostrarle el enlace y el QR
al cliente**: el título, si está abierta o cerrada, el enlace para copiar y el QR para
descargar. Ni las preguntas, ni las respuestas una por una.

Ese interruptor está en el bloque *Enlace y QR* del editor, y existe justamente para que
mientras se arma la encuesta el cliente no la vea. Una encuesta interna (sin cliente) no
se puede compartir así.

Quién lee qué, en la base:

| Quién | Definición | Respuestas | Edita |
|---|---|---|---|
| admin o analista | todas | todas | sí |
| usuario de un cliente | las de su cliente, si están compartidas | las de su cliente (vía un tablero conectado) | no |
| sin cuenta | solo responder | no | no |

### Abierta o cerrada

El estado de la encuesta manda sobre el enlace:

- **Publicada**: el enlace recibe respuestas.
- **Cerrada**: el enlace sigue vivo pero muestra "Esta encuesta ya está cerrada", con los
  colores y el logo que tenga configurados, y la ruta que recibe respuestas contesta 404.
  Sirve para cortar el diligenciamiento sin tener que borrar nada.
- **Borrador**: todavía no existe la tabla de respuestas ni el enlace.

### Conectar una encuesta con un tablero

En el editor, el bloque **Tablero que alimenta**. Al elegir un tablero, Datta compara las
variables que ese tablero declara en su HTML (el bloque `datta-variables`, el mismo de la
segregación de datos) con los identificadores de las preguntas, y avisa de lo que no
encaja: una variable que ninguna pregunta tiene, valores que el tablero espera y la
encuesta no ofrece, o al revés. No bloquea: informa. Antes de guardar pide confirmación,
porque conectar cambia lo que ve la gente en un tablero ya publicado.

Cada pregunta tiene un **identificador** editable (`filial`, `nivel`…): es la llave con la
que se guarda la respuesta y el nombre por el que la busca un tablero. Cambiarlo con
respuestas ya recogidas rompe la correspondencia con las viejas.

Al tablero conectado, Datta le inyecta el slug de su encuesta:

    window.DATTA = { usuario, limites, encuesta: "clima-2026" }

Y el tablero pide los datos a su propia aplicación, sin llevar llaves dentro:

    fetch(`/api/encuestas/${window.DATTA.encuesta}?resumen=1`, {credentials:"same-origin"})

`?resumen=1` devuelve conteos por pregunta (y el promedio de las escalas); sin ese
parámetro devuelve las respuestas fila por fila, pedidas por páginas de 1.000.
