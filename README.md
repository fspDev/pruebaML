# Photobooth - Congreso de Estetica 2026

Demo de photobooth para stand de evento. HTML + CSS + JS vanilla, sin build,
sin dependencias. Pensada para celular (mobile-first, uso tactil).

## Flujo

1. Pantalla inicial con el boton grande "Sacate una foto".
2. **"Arma tu look"**: papel muneca digital sobre un maniqui, con accesorios,
   labial y efectos extra. Todavia sin camara, asi que no pide permisos.
3. Permiso de camara (`getUserMedia`, `facingMode: "user"`) y video en vivo espejado.
4. Selector tactil de 4 marcos + "Sin marco".
5. Obturador con cuenta regresiva 3-2-1, flash y captura en canvas
   (video + look + marco).
6. Pantalla de resultado con el **arquetipo de estilo**, "Listo" (loguea en
   consola) y "Volver a sacar".

## Archivos

| Archivo       | Que hace                                                              |
|---------------|-----------------------------------------------------------------------|
| `index.html`  | Las 5 pantallas (inicio / look / camara / resultado / error).          |
| `styles.css`  | Diseno rosa-dorado-pastel, mobile-first, safe-area, targets >= 48px.   |
| `overlays.js` | `PB_CONFIG` + los marcos, dibujados en canvas (sin imagenes externas). |
| `beauty.js`   | Labios, rubor y color de pelo con MediaPipe. Paletas editables arriba. |
| `look.js`     | Piezas de "Arma tu look", el maniqui y los arquetipos de estilo.       |
| `app.js`      | Camara, seleccion, loop de render, captura y manejo de errores.       |
| `serve.mjs`   | Servidor estatico minimo para probar en local.                        |

## Configuracion rapida

Todo lo editable esta arriba de `overlays.js`:

```js
const PB_CONFIG = {
  eventName: 'Congreso de Estética 2026',
  tagline: 'BEAUTY & STYLE',
  outputWidth: 1080,     // foto final 3:4
  outputHeight: 1440,
  countdownFrom: 3       // 0 = capturar al toque
};
```

El nombre del evento se auto-ajusta de tamano para entrar en el marco.

## Arma tu look

Pantalla intermedia entre el inicio y la camara. Tres categorias, **una pieza
activa por categoria como maximo** (o ninguna):

| Categoria  | Piezas                             | Como se ancla                       |
|------------|------------------------------------|-------------------------------------|
| Accesorios | aros, corona, cintillo, lentes     | a la cara, con landmarks            |
| Labios     | nude, rosa, rojo                   | a la cara (es el mismo `BEAUTY.state.lip` de la pestana "Belleza") |
| Extra      | brillos, destellos, bokeh          | a la foto entera, sin cara          |

Los lentes de sol quedaron en **Accesorios** y no en Extra a proposito: con una
sola pieza activa por categoria, tenerlos junto a los brillos hacia imposible la
combinacion "lentes + brillos", que es justamente una de las que define un
arquetipo.

El preview es un maniqui dibujado en canvas, no la camara: asi se puede armar el
look antes de pedir permiso de camara. Las piezas se dibujan con **la misma
funcion** en el maniqui y sobre la cara real; lo unico que cambia es el sistema
de coordenadas (`drawHead()` lo arma fijo, `faceFrom()` lo deduce de los
landmarks). Por eso lo que se ve en el preview es lo que sale en la foto.

Los accesorios pegados a la cara necesitan el mismo modelo de 3.6 MB que los
labios, y se descarga apenas se toca uno: cuando llegas a la camara ya esta
listo. Los extras no necesitan ningun modelo. Si el modelo no llega a cargar,
la foto sale igual, sin el accesorio.

### Agregar o cambiar piezas

Todo esta arriba de `look.js`. Una pieza es:

```js
{ id: 'corona', name: 'Corona', anchor: 'face', draw: drawCorona }
```

Las de `anchor: 'face'` reciben `(ctx, F)` y dibujan dentro de `withFace()`, en
un sistema donde **el origen es el medio de los ojos y 1 unidad = el ancho de la
cara**. `F.topY`, `F.chinY`, `F.earY` y `F.eyeX` son las alturas reales de esa
cara en esas unidades, asi la pieza se acomoda a caras distintas. Las de
`anchor: 'frame'` reciben `(ctx, w, h)` y pintan sobre la foto entera; si usan
azar tienen que usar `rng(semilla)`, porque el preview y la foto final se
dibujan por separado y tienen que coincidir.

### Arquetipos de estilo

En la pantalla de resultado sale un "Tu estilo es …" calculado con lo elegido.
Las reglas estan en `ARQUETIPOS` (`look.js`), se evaluan en orden y gana la
primera que da `true`:

```js
{ id: 'glam', test: (a, l, e) => a === 'corona' && l === 'rojo',
  name: 'Glam Dramática', emoji: '✨', text: '…' }
```

`a`, `l` y `e` son los ids de accesorio, labial y extra (o `null`). Si no matchea
ninguna regla sale "Estilo Libre".

## Filtros de belleza (labios / rubor / pelo)

Pestana "Belleza". Son dos modelos distintos de MediaPipe porque son dos
problemas distintos:

| Efecto           | Modelo                             | Peso    |
|------------------|------------------------------------|---------|
| labios, rubor    | `face_landmarker` (478 puntos)     | 3.6 MB  |
| color de pelo    | `selfie_multiclass_256x256`        | 15.6 MB |
| runtime wasm     | `@mediapipe/tasks-vision`          | 11.2 MB |

El pelo no tiene landmarks: necesita segmentacion pixel a pixel. Por eso el
segmentador se descarga **recien cuando alguien toca un color de pelo**, y el
que solo quiere labial no paga esos 15.6 MB. Sin ningun efecto elegido no se
descarga nada y el `<video>` se muestra directo, sin canvas ni CPU de mas.

Como se ve natural: el tinte se aplica con `globalCompositeOperation = 'color'`,
que toma el tono del color elegido pero **conserva la luminosidad de abajo**.
Asi sobreviven los brillos y las sombras del pelo y de los labios, en vez de
quedar una mancha plana.

Para cambiar la paleta, editar `LIPS` y `HAIRS` arriba de `beauty.js`:

```js
{ id: 'rojo', name: 'Rojo', color: '#C81D3E', blush: '#D9647A', alpha: 0.85 }
```

`alpha` es la intensidad (0 a 1) y `blush` el tono del rubor que acompana a ese
labial. Conviene ajustarlos mirando caras reales en un celular, no en el
escritorio: cambia mucho segun la luz del stand.

Medido en desktop con GPU: ~24 ms el landmarker y ~6 ms el segmentador por
frame. En un celular de gama media esperar 2-3x eso; si el frame se pone caro,
`beauty.js` infiere 1 de cada 2 o 3 frames y reusa el resultado anterior (entre
frames la cara casi no se mueve). Al momento de disparar la foto siempre se
hace una inferencia fresca, sin throttling.

Limitaciones conocidas:
- Una sola cara (`numFaces: 1`).
- El rubor va atado al labial elegido, no es un control separado.
- Los accesorios de cara se dibujan sobre el frame sin espejar y despues se
  espeja todo junto con la selfie: en las piezas asimetricas (el mono del
  cintillo) el detalle cae del lado contrario al del maniqui. Es lo mismo que
  ve alguien en un espejo, pero si molesta hay que dibujarlos despues del
  espejado, como los marcos.
- Sin internet en la primera carga no hay efectos: los modelos vienen de CDN.
  Si el wifi del predio es malo, conviene vendorizar los `.task`/`.tflite` en
  el repo y apuntar `MODEL_FACE` / `MODEL_SEG` a rutas locales.

## Probar en la compu

```bash
node serve.mjs
```

Abrir http://localhost:5173 (la camara funciona porque `localhost` cuenta como
contexto seguro).

## Probar en el celular

`getUserMedia` **solo funciona por HTTPS** o en localhost. Abrir la IP de la LAN
por http no alcanza: el navegador no va a pedir permiso de camara.

Este repo ya publica solo: cada push a `main` dispara
[.github/workflows/deploy.yml](.github/workflows/deploy.yml), que sube el sitio
tal cual (no hay build) a GitHub Pages.

**URL:** https://fspdev.github.io/pruebaML/

Alternativas:
- Vercel: `npx vercel --prod` (framework "Other", root `./`)
- Netlify Drop: arrastrar la carpeta a https://app.netlify.com/drop
- Tunel al server local: `npx cloudflared tunnel --url http://localhost:5173`

## Notas tecnicas

- Los marcos se dibujan por codigo con coordenadas normalizadas, asi el preview
  y la foto final (1080x1440) salen identicos. Para pasar a PNGs reales solo hay
  que reemplazar el `draw()` de cada overlay por un `drawImage()`.
- El video se muestra y se captura espejado (selfie); el marco se dibuja sin
  espejar para que el texto se lea bien.
- El recorte replica `object-fit: cover`, asi que funciona igual con camaras
  verticales u horizontales.
- Sin deteccion facial: el marco es fijo dentro del encuadre.

## Siguiente paso

`btn-done` hoy solo hace `console.log`. Ahi va el envio (subida al backend,
QR de descarga, formulario de contacto, etc.). El log ya incluye
`LOOK.summary()`, con las piezas elegidas y el arquetipo, listo para mandar.
