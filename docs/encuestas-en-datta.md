# Las encuestas en Datta

Cómo se arma una encuesta, cómo la responde la gente y cómo está construida la
extensión por dentro. Documento de referencia para retomar el tema meses después.

Estado: septiembre de 2026. Aplicación: `plurumconsultores/datta` (Next.js 16 +
Supabase, desplegada en Vercel).

---

## 1. Qué es y para qué sirve

Antes, cada encuesta era un HTML a la medida dentro de `public/e/` —como el Radar de
GEB—: había que programarla, crear su tabla en Supabase a mano y publicarla. El
apartado **Encuestas** permite armarlas sin programar, desde la propia aplicación.

Cubre el ciclo completo:

1. Se arma la encuesta en el editor (preguntas, colores, mensajes).
2. Al publicarla, Datta crea su tabla de respuestas y activa un enlace público y su QR.
3. La gente responde desde el enlace, sin cuenta, una pregunta por pantalla.
4. El equipo ve el conteo, la tabla de respuestas y la descarga en CSV.
5. Opcionalmente, un tablero de Datta se alimenta de esa encuesta y muestra el avance.

Lo que **no** cubre todavía: el envío personalizado por correo (mensaje introductorio y
enlace propio por persona). Hoy el enlace es único y la respuesta es anónima. Eso
requiere una tabla de invitaciones con tokens y un servicio de correo.

---

## 2. Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `scripts/encuestas.sql` | Crea la tabla `encuestas`, sus políticas y la función `crear_tabla_respuestas()`. Se corre una sola vez |
| `lib/encuestas.ts` | El corazón: tipos, normalizadores, validación y las reglas de las condicionales |
| `lib/qr.ts` | Genera el QR y arma la URL pública |
| `lib/auth.ts` | `requireEquipo()` (admin o analista) y `requireAdmin()` |
| `app/admin/encuestas/page.tsx` | Lista de encuestas y formulario para crear una nueva |
| `app/admin/encuestas/actions.ts` | Server actions: crear, guardar, publicar, cerrar, conectar, compartir, eliminar |
| `app/admin/encuestas/[id]/page.tsx` | El editor de una encuesta |
| `app/admin/encuestas/[id]/EditorEncuesta.tsx` | Todo el editor: datos, colores, bienvenida, preguntas, cierre |
| `app/admin/encuestas/[id]/ReglasPregunta.tsx` | El bloque plegable de condicionales |
| `app/admin/encuestas/[id]/CompartirEncuesta.tsx` | Enlace, QR y el interruptor de "mostrar al cliente" |
| `app/admin/encuestas/[id]/ConexionTablero.tsx` | Conectar con un tablero, con análisis de compatibilidad |
| `app/admin/encuestas/[id]/respuestas/page.tsx` | Tabla de respuestas (las 200 más recientes) |
| `app/admin/encuestas/[id]/respuestas/csv/route.ts` | Descarga completa en CSV |
| `app/e/[slug]/page.tsx` | La encuesta pública: carga la definición y decide si está abierta |
| `app/e/[slug]/EncuestaPublica.tsx` | El recorrido: bienvenida, preguntas, cierre |
| `app/e/[slug]/responder/route.ts` | Recibe la respuesta, la valida y la guarda |
| `app/encuestas/page.tsx` | Lo que ve un usuario de cliente: enlace y QR, nada más |
| `app/api/encuestas/[slug]/route.ts` | Los datos para un tablero conectado |

**Requisitos de entorno:** correr `scripts/encuestas.sql` una vez en Supabase y tener
instalado el paquete `qrcode` (`npm install qrcode`). Sin ese paquete todo funciona
menos el QR, y el panel lo dice.

---

## 3. Cómo se guardan los datos

### La definición: tabla `encuestas`

Una fila por encuesta. Lo importante:

| Columna | Para qué |
|---|---|
| `slug` | Va en la URL pública (`/e/<slug>`) y en el nombre de la tabla de respuestas |
| `titulo` | Nombre interno y el que ve el cliente |
| `cliente_id` | `bigint`, apunta a `clientes`. Su logo sale en la portada de la encuesta |
| `estado` | `borrador`, `publicada` o `cerrada` |
| `bienvenida`, `preguntas`, `tema`, `despedida` | `jsonb` con toda la definición |
| `visible_cliente` | Si el cliente ve el enlace y el QR dentro de Datta |
| `tabla_respuestas` | Nombre de su tabla, que se llena al publicar |
| `dashboard_slug` | El tablero que se alimenta de ella, si hay alguno |

Que todo viva en `jsonb` es lo que permite agregar campos nuevos —descripciones,
condicionales— sin tocar la base: las encuestas viejas simplemente no los traen, y
`normalizarPregunta()` les pone los valores por defecto al leerlas.

### Las respuestas: una tabla por encuesta

No comparten tabla. Al publicar, la función `crear_tabla_respuestas(slug)` crea
`respuestas_<slug>` (los guiones pasan a guiones bajos) con esta forma:

```
id          bigint, autonumérico
creado_en   timestamptz
respuestas  jsonb   -- { "identificador_de_pregunta": valor, ... }
meta        jsonb   -- cuántas preguntas tenía la encuesta y cuándo se envió
```

En `meta` **no** se guarda IP ni nada que identifique: la encuesta se ofrece como
anónima y tiene que serlo de verdad.

La función es `security definer`, exige rol de equipo y valida el slug contra una
expresión regular antes de armar el nombre de la tabla. Sin esa validación, construir
el nombre con texto de la aplicación sería una puerta abierta a inyección de SQL.

---

## 4. Quién ve qué

| Quién | Definición | Respuestas | Edita |
|---|---|---|---|
| admin o analista (equipo Plurum) | todas | todas | sí |
| usuario de un cliente | solo las de sus clientes, y solo si están compartidas | las de sus clientes | no |
| sin cuenta (quien responde) | solo las publicadas, para poder dibujarlas | no | no |

Eso lo impone RLS en Supabase, no la aplicación. La regla de lectura es la misma con la
que un cliente ve sus tableros: `puede_ver_todo()` para el equipo, o que la encuesta
esté marcada como visible y el usuario pertenezca a ese cliente.

**Las respuestas las inserta el servidor** con la llave secreta, en
`/e/<slug>/responder`. Por eso la tabla no necesita ninguna política de escritura
abierta y el navegador nunca ve una llave de Supabase — a diferencia del Radar, donde
la llave publishable va dentro del HTML.

---

## 5. Armar una encuesta, paso a paso

1. **Encuestas → Crear encuesta.** Se le pone título, dirección web (el slug) y cliente.
2. **Datos.** Título y cliente. El cliente importa: su logo aparece en la portada y sin
   cliente la encuesta no se le puede compartir a nadie.
3. **Colores.** Principal (botones, opción marcada, barra de avance), fondo y texto.
   Hay un atajo para tomar el color del cliente y otro para volver a los de Plurum.
   La vista previa muestra el resultado en vivo.
4. **Bienvenida.** Título, texto y texto del botón. Buen lugar para decir cuánto tarda,
   para qué es y que es anónima.
5. **Preguntas.** Se agregan, se reordenan con las flechas y se quitan.
6. **Cierre.** Título y texto de agradecimiento.
7. **Publicar.** Valida la encuesta, crea la tabla de respuestas y activa el enlace.

Todo se guarda solo mientras se escribe: hay un guardado automático que espera segundo y
medio a que dejes de teclear y manda la definición completa. No hay botón de guardar.

---

## 6. Tipos de pregunta

| Tipo | Qué es | Notas |
|---|---|---|
| **Opción única** | Una sola respuesta, botones grandes | Avanza sola al marcar |
| **Opción múltiple** | Varias respuestas | Tope opcional de casillas marcables; 0 = sin tope |
| **Escala** | Botones numerados | Hasta 11 puntos |
| **Texto abierto** | Caja de una o varias líneas | Tope de caracteres (máximo 2.000) |
| **Descripción** | Solo texto, no se responde | Ocupa su propia pantalla, con botón de continuar |

### Las escalas

Vienen cuatro preajustes: Likert 1 a 5 (acuerdo), frecuencia 1 a 5, **Plurum 1 a 10** y
un atajo 0 a 10 para los clientes que la piden así.

> La escala de Plurum va de 1 a 10, siempre. El 0 a 10 es una escala aparte, no una
> variante de la de Plurum: por eso el preajuste no lleva el nombre de la marca.

El rango es editable de verdad: se puede empezar en 0 o en cualquier número, y el tope
son **once botones**, no un valor máximo. Las etiquetas de los extremos se escriben a
mano.

### Sobre el texto abierto

No se agrupa solo: se lee una por una o se descarga en el CSV, y un tablero conectado
solo puede contar cuántos respondieron. Por eso, si un tablero espera una variable y en
la encuesta resulta ser de texto abierto, el análisis de compatibilidad lo marca en rojo.

---

## 7. Descripciones y preguntas condicionales

### Descripciones

Hay dos, y son cosas distintas:

- **La descripción de una pregunta**: un campo opcional que sale en letra más pequeña
  debajo del enunciado. Para aclaraciones o instrucciones.
- **El bloque de descripción** (botón *Agregar descripción*): solo texto, con título
  opcional, que ocupa su propia pantalla. Para presentar una sección.

El bloque va en la misma lista que las preguntas para poder ordenarlo entre ellas, pero
no se responde: no se numera, no entra al CSV ni a la tabla de respuestas, el tablero
conectado no lo ve y el análisis de compatibilidad lo ignora.

### Condicionales

En cada pregunta hay un bloque plegable, *Cuándo se muestra y qué opciones ofrece*, con
dos reglas que se usan por separado o juntas:

- **Mostrar esta pregunta solo si…** — se elige una pregunta anterior y se marcan una o
  varias de sus opciones. Se cumple con cualquiera de las marcadas. Si no se cumple, la
  encuesta salta la pregunta.
- **Cambiar las opciones según una respuesta anterior** — grupos de "si respondieron
  esto, muestra estas opciones". Si la respuesta no cae en ningún grupo, se usan las
  opciones normales de la pregunta, que quedan como respaldo.

Reglas de la implementación, para no romperlas después:

- **Una regla solo puede mirar hacia atrás.** Es lo único que se puede evaluar cuando le
  llega el turno a la pregunta. Al publicar se comprueba; si apunta a una pregunta
  posterior, no publica y dice cuál mover. El editor lo avisa en rojo en cuanto
  reordenas, con un botón para quitar la regla.
- **La base de una regla es una pregunta de opción única o múltiple.** Una escala o un
  texto abierto no sirven de base, porque la condición se define marcando opciones.
- **Renombrar el identificador de una pregunta renombra también las reglas** que lo
  usaban, para que cambiar `sede` por `filial` no rompa nada en silencio.
- **Lo contestado en una rama abandonada se descarta.** Si alguien vuelve atrás y cambia
  la respuesta que abría la rama, sus respuestas se limpian en el navegador
  (`depurarRespuestas`) y otra vez en el servidor.
- **El servidor recorre las preguntas en orden acumulando lo aceptado.** Una respuesta a
  una pregunta que no aplicaba no se guarda, y una opción que no le tocaba se rechaza
  con un error 422 (`preguntaVisible` y `opcionesVisibles`, en `lib/encuestas.ts`).

Un ejemplo real, el de la EXCO de Banconal: Subgerencia → Gerencia Ejecutiva (las
opciones dependen de la subgerencia) → Gerencia de Área (dependen de la gerencia, y la
pregunta se salta entera para las gerencias que no tienen áreas) → Región → Lugar de
Trabajo (dependen de la región).

---

## 8. Cómo la ve quien responde

La encuesta vive en `/e/<slug>` y se abre sin cuenta, porque `proxy.ts` deja pasar todo
lo que cuelga de `/e/`.

- **Una pregunta por pantalla**, con barra de avance, botón *Atrás* y la opción de
  saltar las no obligatorias.
- La barra y el "Pregunta 3 de 8" se calculan **sobre el camino que le corresponde** a
  esa persona, no sobre la lista completa: con condicionales, cada quien recorre una
  ruta distinta.
- Si falla el envío, aparece **Reintentar** en vez de perderse la respuesta.
- Si la encuesta está cerrada o no existe, sale un aviso claro, sin preguntas.

Lo que llega se comprueba contra la definición: una opción que no existe, una escala
fuera de rango o una obligatoria vacía se rechazan. Nada del navegador se guarda tal
cual.

---

## 9. Estados y visibilidad

| Estado | Qué significa |
|---|---|
| **Borrador** | Se está armando. No hay enlace ni tabla de respuestas |
| **Publicada** | El enlace recibe respuestas. Existe su tabla |
| **Cerrada** | El enlace muestra el aviso de cerrada. Las respuestas se conservan |

Se cierra y se vuelve a abrir con un clic, cuantas veces haga falta. Publicar es lo
único que no tiene vuelta atrás en un sentido: crea la tabla (que después no se borra
sola).

**Mostrarle el enlace y el QR al cliente** es un interruptor aparte, en el bloque
*Enlace y QR*. Mientras está apagado, el cliente no ve la encuesta en Datta aunque esté
publicada. Existe justamente para que no vea el borrador. Requiere que la encuesta tenga
cliente asignado y esté publicada.

Lo que ve el cliente en su sección *Encuestas*: título, si está abierta o cerrada, el
enlace para copiar y el QR para descargar. **Nunca** el editor ni las respuestas.

---

## 10. Ver y sacar las respuestas

En *Ver respuestas*: el total, las **200 más recientes** en tabla, y la descarga en CSV
con todas.

El CSV usa separador `;` y lleva BOM al inicio, para que Excel en español lo abra con
las columnas separadas y sin romper las tildes. Se pide por páginas de 1.000 porque
Supabase devuelve como máximo mil filas por llamada, y sin paginar se perderían
respuestas sin ningún aviso.

Para borrar respuestas de prueba antes de salir en vivo, en el SQL Editor de Supabase:

```sql
delete from public.respuestas_<slug_con_guiones_bajos>;
```

---

## 11. Conectar una encuesta con un tablero

En el editor, el bloque *Tablero conectado*. Antes de guardar hace dos cosas:

1. **Análisis de compatibilidad.** Compara las variables que el tablero declara en su
   HTML (el bloque `datta-variables`, el mismo de la segregación de datos) con los
   identificadores de las preguntas, y avisa de lo que no encaja: una variable que
   ninguna pregunta tiene (rojo), valores que el tablero espera y la encuesta no ofrece,
   o al revés (ámbar). No bloquea: informa.
2. **Ventana de confirmación**, porque conectar cambia lo que ve la gente en un tablero
   que ya está publicado.

Cada pregunta tiene un **identificador** editable (`filial`, `nivel`, `sede`…): es la
llave con la que se guarda la respuesta y el nombre por el que la busca un tablero.
Cambiarlo con respuestas ya recogidas rompe la correspondencia con las viejas.

Al tablero conectado, Datta le inyecta el slug de su encuesta:

```js
window.DATTA = { usuario, limites, encuesta: "clima-2026" }
```

Y el tablero pide los datos a la propia aplicación, sin llevar llaves dentro:

```js
fetch(`/api/encuestas/${window.DATTA.encuesta}?resumen=1`, { credentials: "same-origin" })
```

`?resumen=1` devuelve conteos por pregunta y el promedio de las escalas; sin ese
parámetro devuelve las respuestas fila por fila. Como se sirve en el mismo origen, la
cookie de sesión viaja sola desde el iframe y **RLS impone los permisos**: el tablero le
muestra los datos a su cliente y a nadie ajeno.

---

## 12. Capacidad y límites

No hay límite de respuestas en la base: cada encuesta tiene su tabla y el identificador
es un `bigint`. Los topes están en el código, y son distintos según para qué se lee:

| Dónde | Tope |
|---|---|
| Recibir respuestas | sin tope |
| Contador de respuestas recibidas | sin tope |
| Descarga del CSV | 100.000 |
| Tablero conectado (`/api/encuestas/...`) | 50.000 |
| Tabla en *Ver respuestas* | 200 (a propósito, y lo dice) |

Los dos topes grandes existen para que una consulta desbocada no tumbe la página, no
porque la base no aguante; subirlos es cambiar dos números. El límite práctico es el
espacio de Supabase: una respuesta de 48 preguntas pesa cerca de 2 KB, así que 100.000
respuestas son unos 200 MB.

---

## 13. Cargar muchas preguntas de una vez

El editor sirve para diez o veinte preguntas. Para un instrumento grande —la EXCO de
Banconal son 48 bloques, con listas de 165 opciones— es más sano generar el `jsonb` y
cargarlo con un `update` en el SQL Editor:

```sql
update public.encuestas
   set preguntas = $json$ [ ... ] $json$::jsonb,
       actualizado_en = now()
 where trim(titulo) = 'Nombre exacto de la encuesta';
```

Recomendaciones aprendidas de esa carga:

- Guardar antes lo que la encuesta tenía, en una tabla de respaldo. El script de la EXCO
  (`scripts/exco-2026-preguntas.sql`) trae ese paso y el comando para revertir.
- Terminar con un `select` que cuente los bloques, para confirmar que entró todo.
- Comprobar la lógica antes de cargar: con las funciones de `lib/encuestas.ts` se puede
  simular el recorrido de toda la población y verificar que cada persona encuentra sus
  valores entre las opciones que le tocan.

---

## 14. Lo que falta

- **Envío personalizado por correo**: mensaje introductorio y enlace propio por persona.
  Necesita una tabla de invitaciones con tokens y un servicio de correo. Es también lo
  que permitiría traer las demográficas de la base del cliente en vez de preguntarlas.
- **Buscador en preguntas de muchas opciones**: con 128 lugares de trabajo en botones,
  la pantalla queda larga en celular.
- **Contador de respuestas para el cliente**: hoy el cliente ve el enlace y el QR, pero
  no cuántos han respondido.
