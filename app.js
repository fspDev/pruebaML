/* ===============================================
   app.js - logica del photobooth
   =============================================== */

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  const el = {
    screens: document.querySelectorAll('.screen'),
    startEvent: $('#start-event'),
    startTagline: $('#start-tagline'),
    camEvent: $('#cam-event'),
    btnStart: $('#btn-start'),
    btnCloseCam: $('#btn-close-cam'),
    btnFlip: $('#btn-flip'),
    btnCapture: $('#btn-capture'),
    btnRetake: $('#btn-retake'),
    btnDone: $('#btn-done'),
    btnRetry: $('#btn-retry'),
    btnErrorHome: $('#btn-error-home'),
    stage: $('#stage'),
    video: $('#video'),
    overlayCanvas: $('#overlay-canvas'),
    stageLoading: $('#stage-loading'),
    countdown: $('#countdown'),
    flash: $('#flash'),
    filters: $('#filters'),
    resultImg: $('#result-img'),
    errorTitle: $('#error-title'),
    errorText: $('#error-text'),
    errorHelp: $('#error-help'),
    rotateHint: $('#rotate-hint')
  };

  const state = {
    stream: null,
    facing: 'user',           // 'user' = frontal (selfie)
    overlay: OVERLAYS.find((o) => o.id === 'flores') || OVERLAYS[0],
    busy: false,
    lastPhoto: null
  };

  /* ---------- navegacion entre pantallas ---------- */

  function showScreen(id) {
    el.screens.forEach((s) => s.classList.toggle('is-active', s.id === id));
  }

  /* ---------- overlay del preview ---------- */

  function drawPreviewOverlay() {
    const rect = el.stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    const c = el.overlayCanvas;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    state.overlay.draw(ctx, w, h, false);
  }

  /* ---------- chips de marcos ---------- */

  function buildFilters() {
    el.filters.innerHTML = '';
    OVERLAYS.forEach((ov) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (ov.id === state.overlay.id ? ' is-active' : '');
      chip.dataset.id = ov.id;
      chip.setAttribute('aria-label', 'Marco ' + ov.name);

      const thumb = document.createElement('span');
      thumb.className = 'chip-thumb';
      const cv = document.createElement('canvas');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(64 * dpr);
      cv.height = Math.round(74 * dpr);
      thumb.appendChild(cv);

      const name = document.createElement('span');
      name.className = 'chip-name';
      name.textContent = ov.name;

      chip.appendChild(thumb);
      chip.appendChild(name);
      chip.addEventListener('click', () => selectOverlay(ov.id));
      el.filters.appendChild(chip);
    });
    drawThumbs();
  }

  function drawThumbs() {
    el.filters.querySelectorAll('.chip').forEach((chip) => {
      const ov = OVERLAYS.find((o) => o.id === chip.dataset.id);
      const cv = chip.querySelector('canvas');
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      // fondo pastel para que se lea el marco
      const g = ctx.createLinearGradient(0, 0, cv.width, cv.height);
      g.addColorStop(0, '#F6D6DF');
      g.addColorStop(1, '#EBD6BC');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ov.draw(ctx, cv.width, cv.height, true);
    });
  }

  function selectOverlay(id) {
    const ov = OVERLAYS.find((o) => o.id === id);
    if (!ov) return;
    state.overlay = ov;
    el.filters.querySelectorAll('.chip').forEach((c) => {
      c.classList.toggle('is-active', c.dataset.id === id);
    });
    drawPreviewOverlay();
  }

  /* ---------- camara ---------- */

  function isMirrored() {
    return state.facing === 'user';
  }

  async function startCamera() {
    showScreen('screen-camera');
    el.stageLoading.classList.remove('is-hidden');
    drawPreviewOverlay();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showCameraError({ name: 'InsecureContext' });
      return;
    }

    stopCamera();

    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: state.facing },
        width: { ideal: 1440 },
        height: { ideal: 1920 }
      }
    };

    try {
      state.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      // reintento sin restricciones de resolucion (celulares viejos)
      try {
        state.stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: state.facing }
        });
      } catch (err2) {
        showCameraError(err2);
        return;
      }
    }

    el.video.srcObject = state.stream;
    el.video.classList.toggle('no-mirror', !isMirrored());

    try {
      await el.video.play();
    } catch (e) { /* iOS a veces resuelve solo con el autoplay */ }

    const reveal = () => {
      el.stageLoading.classList.add('is-hidden');
      drawPreviewOverlay();
    };
    if (el.video.readyState >= 2) reveal();
    else el.video.addEventListener('loadeddata', reveal, { once: true });
  }

  function stopCamera() {
    if (state.stream) {
      state.stream.getTracks().forEach((t) => t.stop());
      state.stream = null;
    }
    el.video.srcObject = null;
  }

  function showCameraError(err) {
    const name = (err && err.name) || 'Error';
    let title = 'No pudimos abrir la cámara';
    let text = 'Revisá los permisos y volvé a intentar.';
    let help = '';

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
      title = 'Necesitamos tu permiso 💗';
      text = 'Para sacar la foto tenemos que usar la cámara del celular. Tocá "Reintentar" y elegí <b>Permitir</b>.';
      help = 'Si ya lo bloqueaste antes:<br>' +
        '<b>iPhone (Safari):</b> tocá "aA" en la barra de direcciones › Ajustes del sitio web › Cámara › Permitir.<br>' +
        '<b>Android (Chrome):</b> tocá el candado 🔒 junto a la dirección › Permisos › Cámara › Permitir.';
    } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
      title = 'No encontramos la cámara';
      text = 'Este dispositivo no tiene una cámara disponible para el navegador.';
    } else if (name === 'NotReadableError' || name === 'TrackStartError') {
      title = 'La cámara está ocupada';
      text = 'Otra app la está usando. Cerrala y volvé a intentar.';
    } else if (name === 'InsecureContext') {
      title = 'Hace falta una conexión segura';
      text = 'Los navegadores sólo dan acceso a la cámara por <b>HTTPS</b> (o desde localhost).';
      help = 'Abrí la demo con una URL https:// para poder usar la cámara desde el celular.';
    }

    el.errorTitle.innerHTML = title;
    el.errorText.innerHTML = text;
    el.errorHelp.innerHTML = help;
    stopCamera();
    showScreen('screen-error');
    console.warn('[photobooth] error de cámara:', name, err);
  }

  /* ---------- captura ---------- */

  function renderPhoto() {
    const W = PB_CONFIG.outputWidth;
    const H = PB_CONFIG.outputHeight;
    const vw = el.video.videoWidth;
    const vh = el.video.videoHeight;
    if (!vw || !vh) return null;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // recorte tipo object-fit: cover, igual que el preview
    const target = W / H;
    let sx, sy, sw, sh;
    if (vw / vh > target) {
      sh = vh; sw = vh * target; sx = (vw - sw) / 2; sy = 0;
    } else {
      sw = vw; sh = vw / target; sx = 0; sy = (vh - sh) / 2;
    }

    ctx.save();
    if (isMirrored()) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    ctx.drawImage(el.video, sx, sy, sw, sh, 0, 0, W, H);
    ctx.restore();

    // el overlay se dibuja sin espejar para que el texto se lea bien
    state.overlay.draw(ctx, W, H, false);

    return canvas.toDataURL('image/jpeg', 0.92);
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function runCountdown() {
    const n = PB_CONFIG.countdownFrom;
    if (!n) return;
    el.countdown.classList.add('is-on');
    for (let i = n; i > 0; i--) {
      el.countdown.innerHTML = '<span>' + i + '</span>';
      await wait(900);
    }
    el.countdown.classList.remove('is-on');
    el.countdown.innerHTML = '';
  }

  async function onCapture() {
    if (state.busy || !state.stream) return;
    state.busy = true;
    el.btnCapture.disabled = true;

    try {
      await runCountdown();

      el.flash.classList.remove('is-on');
      void el.flash.offsetWidth;      // reinicia la animacion
      el.flash.classList.add('is-on');

      const dataUrl = renderPhoto();
      if (!dataUrl) {
        console.warn('[photobooth] el video todavía no tenía frames');
        return;
      }
      state.lastPhoto = dataUrl;
      el.resultImg.src = dataUrl;
      await wait(160);
      showScreen('screen-result');
    } finally {
      state.busy = false;
      el.btnCapture.disabled = false;
      el.countdown.classList.remove('is-on');
      el.countdown.innerHTML = '';
    }
  }

  /* ---------- eventos ---------- */

  el.btnStart.addEventListener('click', startCamera);

  el.btnCloseCam.addEventListener('click', () => {
    stopCamera();
    showScreen('screen-start');
  });

  el.btnFlip.addEventListener('click', () => {
    if (state.busy) return;
    state.facing = state.facing === 'user' ? 'environment' : 'user';
    startCamera();
  });

  el.btnCapture.addEventListener('click', onCapture);

  el.btnRetake.addEventListener('click', async () => {
    showScreen('screen-camera');
    if (!state.stream) await startCamera();
    else drawPreviewOverlay();
  });

  el.btnDone.addEventListener('click', () => {
    console.log('[photobooth] Foto confirmada ✔', {
      evento: PB_CONFIG.eventName,
      marco: state.overlay.id,
      camara: state.facing,
      tomadaEl: new Date().toISOString(),
      tamanioAprox: state.lastPhoto
        ? Math.round((state.lastPhoto.length * 3) / 4 / 1024) + ' KB'
        : null
    });
    // Siguiente paso (fuera del alcance de esta demo): envío / formulario.
    stopCamera();
    showScreen('screen-start');
  });

  el.btnRetry.addEventListener('click', startCamera);

  el.btnErrorHome.addEventListener('click', () => showScreen('screen-start'));

  /* ---------- layout / orientacion ---------- */

  function checkOrientation() {
    const landscape = window.innerWidth > window.innerHeight;
    el.rotateHint.classList.toggle('is-on', landscape && window.innerHeight < 480);
  }

  function onResize() {
    checkOrientation();
    drawPreviewOverlay();
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
  if (window.ResizeObserver) {
    new ResizeObserver(() => drawPreviewOverlay()).observe(el.stage);
  }

  // la camara se pausa al mandar el celu a background
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !state.stream) return;
    el.video.play().catch(() => {});
  });

  /* ---------- init ---------- */

  el.startEvent.textContent = PB_CONFIG.eventName;
  el.camEvent.textContent = PB_CONFIG.eventName;
  el.startTagline.textContent = PB_CONFIG.tagline;
  document.title = 'Photobooth · ' + PB_CONFIG.eventName;

  buildFilters();
  checkOrientation();

  // redibujar cuando terminen de cargar las tipografias
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('600 40px "Cormorant Garamond"'),
      document.fonts.load('400 20px "Jost"')
    ]).then(() => {
      drawThumbs();
      drawPreviewOverlay();
    }).catch(() => {});
  }

  console.log('[photobooth] listo ·', PB_CONFIG.eventName);
})();
