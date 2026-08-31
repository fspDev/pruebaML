/* ===============================================
   look.js - "Arma tu look" (papel muneca digital)
   ---------------------------------------------
   Piezas dibujadas 100% en canvas, igual que los
   marcos de overlays.js. Hay dos familias:

     anchor: 'face'   se pega a la cara con los
                      landmarks de MediaPipe
     anchor: 'frame'  se dibuja sobre la foto
                      entera, sin depender de la cara

   Las de cara se dibujan en un sistema de
   coordenadas local: origen en el medio de los
   ojos, eje x sobre la linea de los ojos y
   1 unidad = ancho de la cara (sien a sien).
   Asi la misma funcion sirve para el maniqui de la
   pantalla de look y para la cara real de la foto.
   =============================================== */

const LOOK = (() => {
  'use strict';

  /* ---------- piezas ---------- */

  const ACCESORIOS = [
    { id: 'aros',     name: 'Aros',     anchor: 'face',  draw: drawAros },
    { id: 'corona',   name: 'Corona',   anchor: 'face',  draw: drawCorona },
    { id: 'cintillo', name: 'Cintillo', anchor: 'face',  draw: drawCintillo },
    { id: 'lentes',   name: 'Lentes',   anchor: 'face',  draw: drawLentes }
  ];

  const EXTRAS = [
    { id: 'brillos',   name: 'Brillos',   anchor: 'frame', draw: drawBrillos },
    { id: 'destellos', name: 'Destellos', anchor: 'frame', draw: drawDestellos },
    { id: 'bokeh',     name: 'Bokeh',     anchor: 'frame', draw: drawBokeh }
  ];

  /* Los labiales salen de BEAUTY para no duplicar la paleta: lo que se elige
     aca es lo mismo que la pestana "Belleza" de la camara. */
  const LABIOS_IDS = ['nude', 'rosa', 'rojo'];
  const LABIOS = LABIOS_IDS
    .map((id) => BEAUTY.LIPS.find((l) => l.id === id))
    .filter(Boolean);

  /* ---------- estado ----------
     El labial vive en BEAUTY.state.lip: es el mismo dato que usa la camara,
     asi las dos pantallas quedan sincronizadas sin copiarlo. */
  const state = { accesorio: null, extra: null };

  function pick(cat, item) {
    if (cat === 'labio') { BEAUTY.state.lip = item; return; }
    state[cat] = item;
  }

  function current(cat) {
    return cat === 'labio' ? BEAUTY.state.lip : state[cat];
  }

  /** true si lo elegido necesita los landmarks de la cara */
  function needsFace() {
    return !!(state.accesorio && state.accesorio.anchor === 'face');
  }

  function reset() {
    state.accesorio = null;
    state.extra = null;
  }

  /* ---------- helpers de dibujo ---------- */

  /* Numeros pseudoaleatorios con semilla: los brillos tienen que caer en el
     mismo lugar en el preview y en la foto final. */
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function gold(ctx, x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#F6E3AE');
    g.addColorStop(0.45, '#E7C572');
    g.addColorStop(1, '#B8912F');
    return g;
  }

  /* Entra al sistema local de la cara: origen entre los ojos, rotado con la
     cabeza y escalado para que 1 unidad = ancho de la cara. */
  function withFace(ctx, F, fn) {
    ctx.save();
    ctx.translate(F.cx, F.cy);
    ctx.rotate(F.a);
    ctx.scale(F.w, F.w);
    fn(ctx);
    ctx.restore();
  }

  /* ---------- piezas: accesorios (sistema local de la cara) ---------- */

  function drawCorona(ctx, F) {
    withFace(ctx, F, (c) => {
      const base = F.topY - 0.02;      // apoyada sobre la frente
      const w = 0.66, h = 0.28;
      const l = -w / 2, r = w / 2, top = base - h;

      // cuerpo de la corona: 5 puntas
      c.beginPath();
      c.moveTo(l, base);
      c.lineTo(l, base - h * 0.34);
      c.lineTo(l + w * 0.14, top + h * 0.30);
      c.lineTo(l + w * 0.28, base - h * 0.40);
      c.lineTo(l + w * 0.42, top + h * 0.06);
      c.lineTo(l + w * 0.5, base - h * 0.44);
      c.lineTo(l + w * 0.58, top + h * 0.06);
      c.lineTo(l + w * 0.72, base - h * 0.40);
      c.lineTo(l + w * 0.86, top + h * 0.30);
      c.lineTo(r, base - h * 0.34);
      c.lineTo(r, base);
      c.closePath();
      c.fillStyle = gold(c, l, top, r, base);
      c.fill();
      c.lineWidth = 0.008;
      c.strokeStyle = 'rgba(140,105,25,.55)';
      c.stroke();

      // banda inferior
      c.beginPath();
      c.rect(l, base - h * 0.16, w, h * 0.16);
      c.fillStyle = 'rgba(255,255,255,.28)';
      c.fill();

      // gemas
      const gemas = [[l + w * 0.14, top + h * 0.34], [l + w * 0.5, top + h * 0.10],
                     [l + w * 0.86, top + h * 0.34]];
      gemas.forEach(([gx, gy], i) => {
        c.beginPath();
        c.arc(gx, gy, i === 1 ? 0.030 : 0.022, 0, Math.PI * 2);
        c.fillStyle = i === 1 ? '#E0567F' : '#FFF3F6';
        c.fill();
        c.lineWidth = 0.006;
        c.strokeStyle = 'rgba(255,255,255,.85)';
        c.stroke();
      });

      // perlitas sobre la banda
      for (let i = 1; i < 6; i++) {
        c.beginPath();
        c.arc(l + (w * i) / 6, base - h * 0.08, 0.012, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255,255,255,.9)';
        c.fill();
      }
    });
  }

  function drawCintillo(ctx, F) {
    withFace(ctx, F, (c) => {
      const y = F.topY + 0.10;         // un poco mas abajo que la corona
      const half = 0.54;

      // arco de oreja a oreja
      c.beginPath();
      c.moveTo(-half, y + 0.16);
      c.quadraticCurveTo(0, y - 0.19, half, y + 0.16);
      c.lineWidth = 0.052;
      c.lineCap = 'round';
      c.strokeStyle = gold(c, -half, y, half, y + 0.2);
      c.stroke();

      c.beginPath();
      c.moveTo(-half, y + 0.16);
      c.quadraticCurveTo(0, y - 0.19, half, y + 0.16);
      c.lineWidth = 0.014;
      c.strokeStyle = 'rgba(255,255,255,.55)';
      c.stroke();

      // mono apoyado sobre la banda, no flotando al lado
      const bx = half * 0.58, by = y - 0.055;
      c.save();
      c.translate(bx, by);
      c.rotate(-0.35);
      c.fillStyle = '#EFB2C1';
      [-1, 1].forEach((s) => {
        c.beginPath();
        c.ellipse(s * 0.075, 0, 0.075, 0.052, s * 0.5, 0, Math.PI * 2);
        c.fill();
      });
      c.beginPath();
      c.arc(0, 0, 0.028, 0, Math.PI * 2);
      c.fillStyle = '#D98BA4';
      c.fill();
      c.restore();
    });
  }

  function drawAros(ctx, F) {
    withFace(ctx, F, (c) => {
      [-1, 1].forEach((s) => {
        // 0.5 es el contorno de la cara (landmarks 234/454): los aros van
        // justo sobre el borde, si no quedan pegados en la mejilla
        const x = s * 0.52;
        const y = F.earY + 0.04;

        // enganche
        c.beginPath();
        c.arc(x, y, 0.020, 0, Math.PI * 2);
        c.fillStyle = gold(c, x - 0.02, y - 0.02, x + 0.02, y + 0.02);
        c.fill();

        // argolla
        c.beginPath();
        c.arc(x, y + 0.085, 0.062, 0, Math.PI * 2);
        c.lineWidth = 0.018;
        c.strokeStyle = gold(c, x - 0.06, y, x + 0.06, y + 0.15);
        c.stroke();

        // brillo del metal
        c.beginPath();
        c.arc(x, y + 0.085, 0.062, Math.PI * 1.05, Math.PI * 1.45);
        c.lineWidth = 0.008;
        c.strokeStyle = 'rgba(255,255,255,.85)';
        c.stroke();

        // gota
        c.beginPath();
        c.ellipse(x, y + 0.168, 0.026, 0.036, 0, 0, Math.PI * 2);
        c.fillStyle = '#EFB2C1';
        c.fill();
      });
    });
  }

  function drawLentes(ctx, F) {
    withFace(ctx, F, (c) => {
      const ex = F.eyeX;               // medio ancho entre pupilas
      // El borde externo tiene que llegar casi al contorno de la cara (0.5):
      // con lentes mas chicos parecen anteojos de lectura, no de sol.
      const lw = ex * 1.85;            // ancho de cada lente
      const lh = lw * 0.62;

      const lente = (cx) => {
        c.beginPath();
        c.ellipse(cx, 0.005, lw / 2, lh / 2, 0, 0, Math.PI * 2);
      };

      // patillas hasta las sienes
      c.lineWidth = 0.026;
      c.lineCap = 'round';
      c.strokeStyle = '#3B2B31';
      [-1, 1].forEach((s) => {
        c.beginPath();
        c.moveTo(s * (ex + lw / 2), 0.005);
        c.lineTo(s * 0.53, F.earY - 0.01);
        c.stroke();
      });

      // puente
      c.beginPath();
      c.moveTo(-ex + lw / 2 - 0.005, -0.012);
      c.quadraticCurveTo(0, -0.055, ex - lw / 2 + 0.005, -0.012);
      c.lineWidth = 0.022;
      c.stroke();

      // cristales
      [-ex, ex].forEach((cx) => {
        lente(cx);
        const g = c.createLinearGradient(cx - lw / 2, -lh / 2, cx + lw / 2, lh / 2);
        g.addColorStop(0, 'rgba(58,42,50,.88)');
        g.addColorStop(1, 'rgba(120,80,95,.80)');
        c.fillStyle = g;
        c.fill();
        c.lineWidth = 0.020;
        c.strokeStyle = '#3B2B31';
        c.stroke();

        // reflejo diagonal
        c.save();
        lente(cx);
        c.clip();
        c.beginPath();
        c.moveTo(cx - lw * 0.42, lh * 0.5);
        c.lineTo(cx - lw * 0.05, -lh * 0.5);
        c.lineTo(cx + lw * 0.12, -lh * 0.5);
        c.lineTo(cx - lw * 0.24, lh * 0.5);
        c.closePath();
        c.fillStyle = 'rgba(255,255,255,.30)';
        c.fill();
        c.restore();
      });
    });
  }

  /* ---------- piezas: extras (sobre la foto entera) ---------- */

  /* Los tres extras se dibujan con semilla fija, asi el preview del maniqui,
     el preview de la camara y la foto final coinciden. */

  function drawBrillos(ctx, w, h) {
    const k = Math.min(w, h) / 1000;
    const rnd = rng(20260831);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      // menos densidad en el centro, para no taparle la cara a nadie
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
      if (Math.hypot(dx, dy) < 0.55 && rnd() < 0.78) continue;
      const r = (3 + rnd() * 9) * k;
      const a = 0.35 + rnd() * 0.5;
      sparkle(ctx, x, y, r, 'rgba(255,255,255,' + a.toFixed(2) + ')');
    }
  }

  function drawDestellos(ctx, w, h) {
    const k = Math.min(w, h) / 1000;
    const rnd = rng(77002);
    const puntos = [
      [0.12, 0.12], [0.86, 0.16], [0.20, 0.85], [0.88, 0.80],
      [0.50, 0.06], [0.08, 0.48], [0.93, 0.52], [0.62, 0.93]
    ];
    puntos.forEach(([px, py]) => {
      const x = px * w, y = py * h;
      const r = (26 + rnd() * 22) * k;

      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.9);
      g.addColorStop(0, 'rgba(255,240,215,.55)');
      g.addColorStop(1, 'rgba(255,240,215,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
      ctx.fill();

      sparkle(ctx, x, y, r, 'rgba(255,255,255,.92)');
      sparkle(ctx, x + r * 0.9, y - r * 0.75, r * 0.36, 'rgba(255,236,200,.85)');
    });
  }

  function drawBokeh(ctx, w, h) {
    const rnd = rng(31415);
    const tonos = ['rgba(249,201,216,', 'rgba(241,221,180,', 'rgba(227,210,240,'];
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = (0.02 + rnd() * 0.055) * Math.min(w, h);
      const t = tonos[Math.floor(rnd() * tonos.length)];
      const a = 0.10 + rnd() * 0.20;

      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, t + (a * 1.3).toFixed(2) + ')');
      g.addColorStop(0.75, t + a.toFixed(2) + ')');
      g.addColorStop(1, t + '0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------- cara real: armar el sistema local desde los landmarks ---------- */

  /* Indices del face mesh de 478 puntos */
  const IDX = {
    sienL: 234, sienR: 454,   // ancho de la cara
    frente: 10, menton: 152,  // alto
    ojoLext: 33, ojoLint: 133,
    ojoRext: 263, ojoRint: 362,
    irisL: 468, irisR: 473,
    orejaL: 132, orejaR: 361
  };

  /**
   * Convierte los landmarks en el sistema local que usan las piezas.
   * @param {Array} pts  landmarks normalizados
   * @param {function} M  mapper de beauty.js: landmark -> [x,y] del lienzo
   * @returns {object|null}
   */
  function faceFrom(pts, M) {
    if (!pts || pts.length < 468) return null;

    const P = (i) => M(pts[i]);
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

    const sienL = P(IDX.sienL), sienR = P(IDX.sienR);
    const w = dist(sienL, sienR);
    if (!(w > 4)) return null;

    // centro de los ojos: iris si el modelo los trae, si no las comisuras
    const ojoL = pts[IDX.irisL] ? P(IDX.irisL) : mid(P(IDX.ojoLext), P(IDX.ojoLint));
    const ojoR = pts[IDX.irisR] ? P(IDX.irisR) : mid(P(IDX.ojoRext), P(IDX.ojoRint));
    const centro = mid(ojoL, ojoR);
    const a = Math.atan2(ojoR[1] - ojoL[1], ojoR[0] - ojoL[0]);

    // pasa un punto del lienzo al sistema local (unidad = ancho de cara)
    const cos = Math.cos(-a), sin = Math.sin(-a);
    const toLocal = (p) => {
      const dx = (p[0] - centro[0]) / w, dy = (p[1] - centro[1]) / w;
      return [dx * cos - dy * sin, dx * sin + dy * cos];
    };

    return {
      cx: centro[0], cy: centro[1], w, a,
      eyeX: Math.abs(toLocal(ojoR)[0]),
      topY: toLocal(P(IDX.frente))[1],
      chinY: toLocal(P(IDX.menton))[1],
      earY: (toLocal(P(IDX.orejaL))[1] + toLocal(P(IDX.orejaR))[1]) / 2
    };
  }

  /* ---------- pintado ---------- */

  /** Piezas pegadas a la cara. Lo llama beauty.js con el frame ya dibujado. */
  function paintOnFace(ctx, W, H, crop, pts, M) {
    const pieza = state.accesorio;
    if (!pieza || pieza.anchor !== 'face' || !pts) return;
    const F = faceFrom(pts, M);
    if (!F) return;
    pieza.draw(ctx, F);
  }

  /** Piezas sobre la foto entera. No dependen de la cara. */
  function paintOnFrame(ctx, W, H) {
    if (state.extra) state.extra.draw(ctx, W, H);
  }

  /* ---------- maniqui ----------
     Silueta simple para ver el look antes de encender la camara. La misma
     cabeza se reusa en las miniaturas del selector, asi cada pieza se ve
     puesta y no como un icono suelto. */

  function fondo(ctx, W, H) {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#FDEFF2');
    bg.addColorStop(1, '#F7E9DC');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  /**
   * Dibuja la cabeza y devuelve su sistema local, el mismo que arma
   * faceFrom() con los landmarks. El maniqui mira siempre de frente.
   */
  function drawHead(ctx, cx, headCy, headW, headH, conRasgos) {
    // pelo (atras)
    ctx.beginPath();
    ctx.ellipse(cx, headCy - headH * 0.04, headW * 0.62, headH * 0.58, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#6E4A44';
    ctx.fill();

    // cara
    ctx.beginPath();
    ctx.ellipse(cx, headCy, headW * 0.5, headH * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F7E0D6';
    ctx.fill();

    // flequillo, recortado contra el ovalo de la cara
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, headCy, headW * 0.5, headH * 0.5, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(cx, headCy - headH * 0.42, headW * 0.56, headH * 0.26, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#6E4A44';
    ctx.fill();
    ctx.restore();

    const w = headW * 0.86;
    const ojosY = headCy - headH * 0.06;
    const F = {
      cx, cy: ojosY, w, a: 0,
      eyeX: 0.21,
      topY: (headCy - headH * 0.5 - ojosY) / w,
      chinY: (headCy + headH * 0.5 - ojosY) / w,
      // a la altura del lobulo, como da el landmark 132/361 en una cara real:
      // si el maniqui usara otra altura, los aros saltarian de lugar entre el
      // preview y la foto
      earY: (headCy + headH * 0.07 - ojosY) / w
    };

    if (conRasgos) {
      withFace(ctx, F, (c) => {
        [-1, 1].forEach((s) => {
          const x = s * F.eyeX;
          c.beginPath();
          c.ellipse(x, 0, 0.052, 0.030, 0, 0, Math.PI * 2);
          c.fillStyle = '#FFFFFF';
          c.fill();
          c.beginPath();
          c.arc(x, 0, 0.021, 0, Math.PI * 2);
          c.fillStyle = '#4A3138';
          c.fill();

          c.beginPath();
          c.moveTo(x - 0.062, -0.082);
          c.quadraticCurveTo(x, -0.112, x + 0.062, -0.078);
          c.lineWidth = 0.016;
          c.lineCap = 'round';
          c.strokeStyle = '#6E4A44';
          c.stroke();
        });

        // nariz
        c.beginPath();
        c.moveTo(0, 0.10);
        c.quadraticCurveTo(0.03, 0.19, -0.012, 0.21);
        c.lineWidth = 0.012;
        c.strokeStyle = 'rgba(160,110,105,.55)';
        c.stroke();
      });
    }

    return F;
  }

  function drawLips(ctx, F, lip) {
    withFace(ctx, F, (c) => {
      const y = 0.36;
      const w = 0.20;

      c.beginPath();
      c.moveTo(-w, y);
      c.quadraticCurveTo(-w * 0.5, y - 0.062, 0, y - 0.022);
      c.quadraticCurveTo(w * 0.5, y - 0.062, w, y);
      c.quadraticCurveTo(w * 0.5, y + 0.082, 0, y + 0.086);
      c.quadraticCurveTo(-w * 0.5, y + 0.082, -w, y);
      c.closePath();
      c.fillStyle = lip ? lip.color : '#D99A94';
      c.globalAlpha = lip ? Math.max(lip.alpha, 0.75) : 1;
      c.fill();
      c.globalAlpha = 1;

      // linea de la boca
      c.beginPath();
      c.moveTo(-w, y);
      c.quadraticCurveTo(0, y + 0.012, w, y);
      c.lineWidth = 0.009;
      c.strokeStyle = 'rgba(120,60,70,.45)';
      c.stroke();
    });
  }

  function drawMannequin(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    fondo(ctx, W, H);

    const cx = W / 2;
    const headH = H * 0.42;
    const headW = headH * 0.76;
    const headCy = H * 0.42;

    // hombros
    ctx.beginPath();
    ctx.moveTo(cx - headW * 1.65, H + 10);
    ctx.quadraticCurveTo(cx - headW * 1.45, headCy + headH * 0.72, cx, headCy + headH * 0.66);
    ctx.quadraticCurveTo(cx + headW * 1.45, headCy + headH * 0.72, cx + headW * 1.65, H + 10);
    ctx.closePath();
    ctx.fillStyle = '#F0D9DD';
    ctx.fill();

    // cuello
    ctx.beginPath();
    ctx.rect(cx - headW * 0.19, headCy + headH * 0.30, headW * 0.38, headH * 0.30);
    ctx.fillStyle = '#F3DCD5';
    ctx.fill();

    const F = drawHead(ctx, cx, headCy, headW, headH, true);
    drawLips(ctx, F, BEAUTY.state.lip);

    // las piezas usan exactamente el mismo codigo que sobre la cara real
    if (state.accesorio && state.accesorio.anchor === 'face') {
      state.accesorio.draw(ctx, F);
    }
    paintOnFrame(ctx, W, H);
  }

  /**
   * Miniatura de una pieza para el selector.
   * @param {string} cat  'accesorio' | 'labio' | 'extra'
   * @param {object|null} pieza  null = opcion "ninguno"
   */
  function drawThumb(ctx, W, H, cat, pieza) {
    ctx.clearRect(0, 0, W, H);
    fondo(ctx, W, H);

    if (cat === 'extra') {
      // el efecto solo, sobre el fondo pastel
      if (pieza) pieza.draw(ctx, W, H);
      else slash(ctx, W, H);
      return;
    }

    // Cabeza de cerca para que la pieza se lea en 68 px, corrida hacia abajo:
    // la corona y el cintillo se dibujan POR ENCIMA de la frente y si la
    // cabeza va centrada quedan cortados contra el borde de la miniatura.
    const headH = H * 0.92;
    const headW = headH * 0.76;
    const F = drawHead(ctx, W / 2, H * 0.68, headW, headH, true);

    if (cat === 'labio') {
      drawLips(ctx, F, pieza);
      if (!pieza) slash(ctx, W, H);
      return;
    }

    drawLips(ctx, F, BEAUTY.state.lip);
    if (pieza) pieza.draw(ctx, F);
    else slash(ctx, W, H);
  }

  /* barra diagonal de la opcion "ninguno", igual que .swatch-none */
  function slash(ctx, W, H) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#EFB2C1';
    ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.055);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(W * 0.26, H * 0.74);
    ctx.lineTo(W * 0.74, H * 0.26);
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- arquetipo de estilo ----------
     Reglas en orden: gana la primera que da true. Editar aca es todo lo que
     hace falta para cambiar los resultados. */

  const ARQUETIPOS = [
    {
      id: 'glam',
      test: (a, l, e) => a === 'corona' && l === 'rojo',
      name: 'Glam Dramática',
      emoji: '✨',
      text: 'Corona y labial rojo: entraste para que te miren.'
    },
    {
      id: 'boho',
      test: (a, l, e) => a === 'cintillo' && l === 'nude',
      name: 'Boho Chic',
      emoji: '🌿',
      text: 'Cintillo y labios nude, del natural bien hecho.'
    },
    {
      id: 'fiesta',
      test: (a, l, e) => a === 'lentes' && !!e,
      name: 'Fiesta Statement',
      emoji: '🕶️',
      text: 'Lentes y brillos: la noche arranca donde estás vos.'
    },
    {
      id: 'reina',
      test: (a) => a === 'corona',
      name: 'Reina del Stand',
      emoji: '👑',
      text: 'La corona no se discute.'
    },
    {
      id: 'romantica',
      test: (a, l) => a === 'aros' && (l === 'rosa' || l === 'nude'),
      name: 'Romántica Moderna',
      emoji: '🎀',
      text: 'Aros y un rosa suave: clásico, pero de ahora.'
    }
  ];

  const LIBRE = {
    id: 'libre',
    name: 'Estilo Libre',
    emoji: '💫',
    text: 'Sin reglas: así como viniste ya estabas bien.'
  };

  /** Calcula el arquetipo con lo que hay elegido en este momento. */
  function archetype() {
    const a = state.accesorio ? state.accesorio.id : null;
    const l = BEAUTY.state.lip ? BEAUTY.state.lip.id : null;
    const e = state.extra ? state.extra.id : null;
    return ARQUETIPOS.find((r) => r.test(a, l, e)) || LIBRE;
  }

  /** Lo elegido, en plano, para loguear o mandar a un backend. */
  function summary() {
    return {
      accesorio: state.accesorio ? state.accesorio.id : null,
      labios: BEAUTY.state.lip ? BEAUTY.state.lip.id : null,
      extra: state.extra ? state.extra.id : null,
      arquetipo: archetype().id
    };
  }

  /* ---------- api ---------- */

  return {
    ACCESORIOS, LABIOS, EXTRAS,
    state, pick, current, needsFace, reset,
    paintOnFace, paintOnFrame,
    drawMannequin, drawThumb,
    archetype, summary
  };
})();
