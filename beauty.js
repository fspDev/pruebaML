/* ===============================================
   beauty.js - efectos de maquillaje y color de pelo
   ---------------------------------------------
   Dos modelos de MediaPipe, cargados por separado:
     - FaceLandmarker (3.6 MB) -> labios y rubor
     - ImageSegmenter multiclase (15.6 MB) -> pelo
   El segmentador se baja recien cuando el usuario
   toca un color de pelo, asi el que solo quiere
   labios no paga ese peso.
   =============================================== */

const BEAUTY = (() => {
  'use strict';

  const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1';
  const MODEL_FACE = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  const MODEL_SEG = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite';

  const HAIR_CLASS = 1;   // 0=fondo 1=pelo 2=piel 3=cara 4=ropa 5=otros

  // contornos de labios (indices del face mesh de 478 puntos)
  const LIP_OUT = [61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185];
  const LIP_IN  = [78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191];
  const CHEEK_L = 50, CHEEK_R = 280, FACE_L = 234, FACE_R = 454;

  /* ---------- paletas ---------- */

  const LIPS = [
    { id: 'nude',   name: 'Nude',   color: '#C98474', blush: '#D98C88', alpha: 0.55 },
    { id: 'rosa',   name: 'Rosa',   color: '#E0567F', blush: '#E58AA0', alpha: 0.75 },
    { id: 'rojo',   name: 'Rojo',   color: '#C81D3E', blush: '#D9647A', alpha: 0.85 },
    { id: 'vino',   name: 'Vino',   color: '#8E2144', blush: '#B0607C', alpha: 0.85 },
    { id: 'coral',  name: 'Coral',  color: '#F2674B', blush: '#F08C74', alpha: 0.72 }
  ];

  const HAIRS = [
    { id: 'cobre',    name: 'Cobre',    color: '#B4552A', alpha: 0.80 },
    { id: 'rubio',    name: 'Rubio',    color: '#D9AE63', alpha: 0.75 },
    { id: 'platino',  name: 'Platino',  color: '#CFC5BC', alpha: 0.70 },
    { id: 'rosa',     name: 'Rosa',     color: '#D4568C', alpha: 0.82 },
    { id: 'violeta',  name: 'Violeta',  color: '#7D4EA8', alpha: 0.82 }
  ];

  /* ---------- estado ---------- */

  const state = { lip: null, hair: null };

  let vision = null, fileset = null;
  let landmarker = null, segmenter = null;
  let loadFace = null, loadSeg = null;

  // ultimo resultado de inferencia, reutilizable entre frames
  const last = { pts: null, mask: null, ptsAt: 0, maskAt: 0 };
  const perf = { face: 16, seg: 8 };
  let frameNo = 0;

  const supportsFilter = (() => {
    const c = document.createElement('canvas').getContext('2d');
    c.filter = 'blur(4px)';
    return c.filter === 'blur(4px)';
  })();

  /* ---------- carga perezosa ---------- */

  async function getVision() {
    if (!fileset) {
      vision = await import(/* webpackIgnore: true */ CDN + '/vision_bundle.mjs');
      fileset = await vision.FilesetResolver.forVisionTasks(CDN + '/wasm');
    }
    return { vision, fileset };
  }

  async function build(kind) {
    const { vision: v, fileset: fs } = await getVision();
    // GPU es mucho mas rapido, pero no esta en todos los celulares
    for (const delegate of ['GPU', 'CPU']) {
      try {
        if (kind === 'face') {
          return await v.FaceLandmarker.createFromOptions(fs, {
            baseOptions: { modelAssetPath: MODEL_FACE, delegate },
            runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: false
          });
        }
        return await v.ImageSegmenter.createFromOptions(fs, {
          baseOptions: { modelAssetPath: MODEL_SEG, delegate },
          runningMode: 'VIDEO', outputCategoryMask: true, outputConfidenceMasks: false
        });
      } catch (err) {
        console.warn('[beauty] fallo el delegate ' + delegate + ' para ' + kind, err);
        if (delegate === 'CPU') throw err;
      }
    }
  }

  function ensureFace() {
    if (landmarker) return Promise.resolve(landmarker);
    if (!loadFace) loadFace = build('face').then(m => (landmarker = m));
    return loadFace;
  }

  function ensureSeg() {
    if (segmenter) return Promise.resolve(segmenter);
    if (!loadSeg) loadSeg = build('seg').then(m => (segmenter = m));
    return loadSeg;
  }

  /** Baja solo los modelos que hacen falta para el estado actual. */
  function prepare() {
    const jobs = [];
    if (state.lip) jobs.push(ensureFace());
    if (state.hair) jobs.push(ensureSeg());
    return Promise.all(jobs);
  }

  /* ---------- inferencia ---------- */

  /* Con poca CPU alcanza con inferir un frame de cada dos: la cara
     casi no se mueve entre frames y el resultado anterior sigue sirviendo. */
  function shouldRun(costMs) {
    if (costMs < 30) return true;
    if (costMs < 60) return frameNo % 2 === 0;
    return frameNo % 3 === 0;
  }

  /* Buffers reutilizables: crear un canvas por frame dispara el GC y
     tira los fps abajo en celulares de gama media. */
  const pool = new Map();
  function buffer(name, w, h) {
    let cv = pool.get(name);
    if (!cv) { cv = document.createElement('canvas'); pool.set(name, cv); }
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return cv;
  }

  let maskImageData = null;
  function maskToCanvas(result) {
    const cm = result.categoryMask;
    if (!cm) return null;
    const mw = cm.width, mh = cm.height;
    const arr = cm.getAsUint8Array();
    const cv = buffer('mask', mw, mh);
    const ictx = cv.getContext('2d');
    if (!maskImageData || maskImageData.width !== mw || maskImageData.height !== mh) {
      maskImageData = ictx.createImageData(mw, mh);
    }
    const d = maskImageData.data;
    for (let i = 0, j = 3; i < arr.length; i++, j += 4) {
      d[j] = arr[i] === HAIR_CLASS ? 255 : 0;
    }
    ictx.putImageData(maskImageData, 0, 0);
    return cv;
  }

  /**
   * Corre los modelos sobre el frame actual del video.
   * Se llama una vez por frame de preview y otra vez justo antes de capturar.
   * @param {HTMLVideoElement} video
   * @param {number} tsMs  timestamp monotonico creciente
   * @param {boolean} force  ignora el throttling (para la captura)
   */
  function detect(video, tsMs, force) {
    frameNo++;
    if (!video.videoWidth) return;

    if (state.lip && landmarker && (force || shouldRun(perf.face))) {
      try {
        const t = performance.now();
        const r = landmarker.detectForVideo(video, tsMs);
        perf.face = perf.face * 0.8 + (performance.now() - t) * 0.2;
        last.pts = (r.faceLandmarks && r.faceLandmarks[0]) || null;
        last.ptsAt = tsMs;
      } catch (e) { /* un frame perdido no es grave */ }
    }
    if (!state.lip) last.pts = null;

    if (state.hair && segmenter && (force || shouldRun(perf.seg))) {
      try {
        const t = performance.now();
        const r = segmenter.segmentForVideo(video, tsMs);
        perf.seg = perf.seg * 0.8 + (performance.now() - t) * 0.2;
        last.mask = maskToCanvas(r);
        last.maskAt = tsMs;
        r.close();
      } catch (e) { /* idem */ }
    }
    if (!state.hair) last.mask = null;
  }

  /* ---------- pintado ---------- */

  /* Los modelos devuelven coordenadas normalizadas al frame completo del
     video, pero nosotros dibujamos un recorte tipo cover. Esto mapea de
     un espacio al otro. */
  function mapper(crop, W, H) {
    const { sx, sy, sw, sh } = crop;
    return (p) => [((p.x * crop.vw) - sx) * (W / sw), ((p.y * crop.vh) - sy) * (H / sh)];
  }

  function tintLayer(name, src, W, H, color, drawMask, blur) {
    const cv = buffer(name, W, H);
    const c = cv.getContext('2d');
    c.clearRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    c.drawImage(src, 0, 0, W, H);
    // 'color' toma el tono del relleno y conserva la luminosidad de abajo:
    // por eso quedan los brillos y las sombras del pelo / los labios.
    c.globalCompositeOperation = 'color';
    c.fillStyle = color;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'destination-in';
    if (supportsFilter && blur) c.filter = 'blur(' + blur + 'px)';
    drawMask(c);
    c.filter = 'none';
    return cv;
  }

  /**
   * Aplica los efectos sobre un canvas que ya tiene el frame dibujado.
   * @param {CanvasRenderingContext2D} ctx  destino, sin espejar, con el frame ya dibujado
   * @param {number} W @param {number} H
   * @param {object} crop  {sx,sy,sw,sh,vw,vh} del recorte cover
   */
  function paint(ctx, W, H, crop) {
    const k = Math.min(W, H) / 1000;
    const frame = ctx.canvas;

    // ----- pelo -----
    if (state.hair && last.mask) {
      const mask = last.mask;
      const layer = tintLayer('hair', frame, W, H, state.hair.color, (c) => {
        c.drawImage(mask, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, W, H);
      }, 3 * k);
      ctx.globalAlpha = state.hair.alpha;
      ctx.drawImage(layer, 0, 0);
      ctx.globalAlpha = 1;
    }

    // ----- labios + rubor -----
    if (state.lip && last.pts) {
      const pts = last.pts;
      const M = mapper(crop, W, H);
      const P = (i) => M(pts[i]);

      const layer = tintLayer('lip', frame, W, H, state.lip.color, (c) => {
        c.beginPath();
        LIP_OUT.forEach((i, n) => { const [x, y] = P(i); n ? c.lineTo(x, y) : c.moveTo(x, y); });
        c.closePath();
        LIP_IN.forEach((i, n) => { const [x, y] = P(i); n ? c.lineTo(x, y) : c.moveTo(x, y); });
        c.closePath();
        c.fill('evenodd');
      }, 2.5 * k);
      ctx.globalAlpha = state.lip.alpha;
      ctx.drawImage(layer, 0, 0);
      ctx.globalAlpha = 1;

      // rubor: dos degrades suaves en los pomulos, en soft-light para que
      // se funda con la piel en vez de taparla
      const faceW = Math.abs(P(FACE_R)[0] - P(FACE_L)[0]);
      if (faceW > 4) {
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        for (const idx of [CHEEK_L, CHEEK_R]) {
          const [x, y] = P(idx);
          const rad = faceW * 0.3;
          const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
          g.addColorStop(0, hexA(state.lip.blush, 0.8));
          g.addColorStop(1, hexA(state.lip.blush, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, rad, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ---------- api ---------- */

  return {
    LIPS, HAIRS, state,
    prepare, detect, paint,
    /** true si hay algun efecto encendido (activa el modo canvas) */
    get active() { return !!(state.lip || state.hair); },
    /** true si falta bajar algun modelo para lo que esta elegido */
    get pending() { return !!((state.lip && !landmarker) || (state.hair && !segmenter)); },
    /** para diagnostico */
    get stats() {
      return {
        faceMs: Math.round(perf.face), segMs: Math.round(perf.seg),
        cara: !!last.pts, mascara: !!last.mask,
        modelos: { face: !!landmarker, seg: !!segmenter }
      };
    },
    reset() { state.lip = null; state.hair = null; last.pts = null; last.mask = null; }
  };
})();
