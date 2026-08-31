# Photobooth - Congreso de Estetica 2026

Demo de photobooth para stand de evento. HTML + CSS + JS vanilla, sin build,
sin dependencias. Pensada para celular (mobile-first, uso tactil).

## Flujo

1. Pantalla inicial con el boton grande "Sacate una foto".
2. Permiso de camara (`getUserMedia`, `facingMode: "user"`) y video en vivo espejado.
3. Selector tactil de 4 marcos + "Sin marco".
4. Obturador con cuenta regresiva 3-2-1, flash y captura en canvas (video + marco).
5. Pantalla de resultado con "Listo" (loguea en consola) y "Volver a sacar".

## Archivos

| Archivo       | Que hace                                                              |
|---------------|-----------------------------------------------------------------------|
| `index.html`  | Las 4 pantallas (inicio / camara / resultado / error).                |
| `styles.css`  | Diseno rosa-dorado-pastel, mobile-first, safe-area, targets >= 48px.   |
| `overlays.js` | `PB_CONFIG` + los marcos, dibujados en canvas (sin imagenes externas). |
| `beauty.js`   | Labios, rubor y color de pelo con MediaPipe. Paletas editables arriba. |
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
QR de descarga, formulario de contacto, etc.).
