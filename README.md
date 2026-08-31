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
| `app.js`      | Camara, seleccion de marco, captura y manejo de errores.              |
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
