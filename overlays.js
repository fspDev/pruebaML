/* ===============================================
   overlays.js
   Marcos dibujados 100% en canvas (sin imagenes).
   Cada overlay expone draw(ctx, w, h, mini) y se
   dibuja con coordenadas normalizadas, asi el
   preview y la captura final salen identicos.
   =============================================== */

const PB_CONFIG = {
  eventName: 'Congreso de Estética 2026',
  tagline: 'BEAUTY & STYLE',
  outputWidth: 1080,          // foto final (3:4 vertical)
  outputHeight: 1440,
  countdownFrom: 3            // 0 = capturar al toque
};

const FONT_SERIF = '"Cormorant Garamond", Georgia, "Times New Roman", serif';
const FONT_SANS = '"Jost", -apple-system, "Segoe UI", Roboto, sans-serif';

/* ---------- helpers de dibujo ---------- */

function rrect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/* estrella de 4 puntas tipo destello */
function sparkle(ctx, cx, cy, r, fill) {
  const i = r * 0.16;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + i, cy - i, cx + r, cy);
  ctx.quadraticCurveTo(cx + i, cy + i, cx, cy + r);
  ctx.quadraticCurveTo(cx - i, cy + i, cx - r, cy);
  ctx.quadraticCurveTo(cx - i, cy - i, cx, cy - r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function flower(ctx, cx, cy, r, petals, petalColor, coreColor, rot) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot || 0);
  ctx.fillStyle = petalColor;
  for (let i = 0; i < petals; i++) {
    ctx.save();
    ctx.rotate((i * 2 * Math.PI) / petals);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.6, r * 0.36, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function leaf(ctx, cx, cy, len, rot, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -len / 2, len * 0.26, len / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* texto centrado con tracking manual (letterSpacing no
   esta soportado en todos los Safari) */
function trackedText(ctx, text, cx, y, spacing, stroke) {
  const chars = Array.from(text);
  let total = 0;
  for (const c of chars) total += ctx.measureText(c).width + spacing;
  total -= spacing;
  let x = cx - total / 2;
  for (const c of chars) {
    if (stroke) ctx.strokeText(c, x, y);
    ctx.fillText(c, x, y);
    x += ctx.measureText(c).width + spacing;
  }
  return total;
}

function trackedWidth(ctx, text, spacing) {
  const chars = Array.from(text);
  let total = 0;
  for (const c of chars) total += ctx.measureText(c).width + spacing;
  return total - spacing;
}

/* nombre del evento al pie, achicandose hasta entrar */
function wordmark(ctx, w, h, k, color, maxWidthRatio) {
  const maxW = w * (maxWidthRatio || 0.74);
  let size = 44 * k;
  const track = () => size * 0.06;
  ctx.font = `600 ${size}px ${FONT_SERIF}`;
  let guard = 0;
  while (trackedWidth(ctx, PB_CONFIG.eventName, track()) > maxW && guard++ < 40) {
    size *= 0.94;
    ctx.font = `600 ${size}px ${FONT_SERIF}`;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(70,35,50,.45)';
  ctx.shadowBlur = 14 * k;
  ctx.shadowOffsetY = 2 * k;
  ctx.fillStyle = color;
  trackedText(ctx, PB_CONFIG.eventName, w / 2, h - 44 * k, track());
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function frameLine(ctx, w, h, k, inset, lw, color, radius) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw * k;
  rrect(ctx, inset * k, inset * k, w - inset * 2 * k, h - inset * 2 * k, radius * k);
  ctx.stroke();
}

/* ---------- overlays ---------- */

const OVERLAYS = [

  {
    id: 'none',
    name: 'Sin marco',
    draw() { /* limpio */ }
  },

  {
    /* ------ marco de flores ------ */
    id: 'flores',
    name: 'Flores',
    draw(ctx, w, h, mini) {
      const k = Math.min(w, h) / 1000;
      const m = mini ? 1.9 : 1;   // en la miniatura agrandamos los detalles

      frameLine(ctx, w, h, k, 26, 7, 'rgba(255,255,255,.85)', 60);
      frameLine(ctx, w, h, k, 44, 2.5, 'rgba(233,163,186,.75)', 46);

      const rose = '#F3AFC4', roseDeep = '#E58CAB', cream = '#FFF3F6';
      const gold = '#E7C572', green = '#CBD9BE';

      // ramo esquina superior izquierda
      const cluster = (ox, oy, s, flip) => {
        ctx.save();
        ctx.translate(ox, oy);
        if (flip) ctx.rotate(Math.PI);
        const u = s * k * m;
        leaf(ctx, 92 * u, 78 * u, 150 * u, 0.9, green);
        leaf(ctx, 40 * u, 128 * u, 130 * u, 2.1, green);
        leaf(ctx, 150 * u, 40 * u, 120 * u, -0.5, green);
        flower(ctx, 60 * u, 58 * u, 62 * u, 6, rose, gold, 0.3);
        flower(ctx, 138 * u, 92 * u, 46 * u, 6, cream, roseDeep, 0.9);
        flower(ctx, 44 * u, 148 * u, 40 * u, 5, roseDeep, cream, 1.6);
        flower(ctx, 152 * u, 22 * u, 30 * u, 5, cream, gold, 0.2);
        sparkle(ctx, 196 * u, 128 * u, 20 * u, 'rgba(255,255,255,.9)');
        ctx.restore();
      };

      cluster(w * 0.045, h * 0.035, 1, false);
      cluster(w * 0.99, h * 0.99, 0.72, true);

      if (mini) return;

      sparkle(ctx, w * 0.9, h * 0.16, 16 * k, 'rgba(255,255,255,.85)');
      sparkle(ctx, w * 0.1, h * 0.62, 13 * k, 'rgba(255,255,255,.75)');
      wordmark(ctx, w, h, k, '#FFFFFF', 0.55);
    }
  },

  {
    /* ------ corona ------ */
    id: 'corona',
    name: 'Corona',
    draw(ctx, w, h, mini) {
      const k = Math.min(w, h) / 1000;

      frameLine(ctx, w, h, k, 30, 4, 'rgba(233,199,116,.95)', 58);
      frameLine(ctx, w, h, k, 44, 1.6, 'rgba(255,255,255,.7)', 48);

      // corona centrada arriba
      const cw = w * (mini ? 0.62 : 0.36);
      const ch = cw * 0.62;
      const cx = w / 2;
      const cy = h * (mini ? 0.3 : 0.16);
      const l = cx - cw / 2, r = cx + cw / 2, t = cy - ch / 2, b = cy + ch / 2;

      const g = ctx.createLinearGradient(l, t, r, b);
      g.addColorStop(0, '#F9E7B4');
      g.addColorStop(0.45, '#DDB94E');
      g.addColorStop(1, '#B8901F');

      ctx.beginPath();
      ctx.moveTo(l, b);
      ctx.lineTo(l, t + ch * 0.2);
      ctx.lineTo(l + cw * 0.25, b - ch * 0.42);
      ctx.lineTo(cx, t);
      ctx.lineTo(r - cw * 0.25, b - ch * 0.42);
      ctx.lineTo(r, t + ch * 0.2);
      ctx.lineTo(r, b);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.shadowColor = 'rgba(80,45,20,.35)';
      ctx.shadowBlur = 22 * k;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.lineWidth = ch * 0.028;
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.stroke();

      // banda de la base
      ctx.fillStyle = '#C9A227';
      rrect(ctx, l, b - ch * 0.1, cw, ch * 0.22, ch * 0.08);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      rrect(ctx, l + cw * 0.04, b - ch * 0.05, cw * 0.92, ch * 0.05, ch * 0.03);
      ctx.fill();

      // gemas en las puntas
      const gem = (x, y, rad) => {
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fillStyle = '#F0A9C0';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fill();
      };
      gem(cx, t - ch * 0.04, ch * 0.1);
      gem(l, t + ch * 0.16, ch * 0.08);
      gem(r, t + ch * 0.16, ch * 0.08);
      gem(cx, b + ch * 0.02, ch * 0.07);

      sparkle(ctx, l - cw * 0.22, cy + ch * 0.1, 26 * k, 'rgba(255,255,255,.9)');
      sparkle(ctx, r + cw * 0.22, cy - ch * 0.15, 20 * k, 'rgba(255,246,214,.95)');
      sparkle(ctx, r + cw * 0.32, cy + ch * 0.5, 13 * k, 'rgba(255,255,255,.8)');

      if (mini) return;
      wordmark(ctx, w, h, k, '#FFF6E2', 0.7);
    }
  },

  {
    /* ------ glam / brillos ------ */
    id: 'glam',
    name: 'Glam',
    draw(ctx, w, h, mini) {
      const k = Math.min(w, h) / 1000;

      // vineta suave
      const vg = ctx.createRadialGradient(w / 2, h * 0.44, Math.min(w, h) * 0.28, w / 2, h * 0.5, Math.max(w, h) * 0.72);
      vg.addColorStop(0, 'rgba(120,60,85,0)');
      vg.addColorStop(1, 'rgba(108,52,78,.42)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      frameLine(ctx, w, h, k, 34, 2.4, 'rgba(233,199,116,.9)', 54);
      frameLine(ctx, w, h, k, 48, 1.2, 'rgba(255,255,255,.55)', 44);

      // destellos (posiciones fijas, lejos del centro de la cara)
      const stars = [
        [0.12, 0.10, 30], [0.86, 0.13, 22], [0.93, 0.30, 13],
        [0.07, 0.28, 16], [0.16, 0.83, 26], [0.88, 0.78, 20],
        [0.72, 0.06, 14], [0.30, 0.05, 17], [0.95, 0.55, 11],
        [0.05, 0.55, 12], [0.50, 0.94, 15], [0.34, 0.90, 12]
      ];
      for (const [x, y, r] of stars) {
        sparkle(ctx, w * x, h * y, r * k * (mini ? 2.2 : 1), 'rgba(255,255,255,.92)');
      }
      sparkle(ctx, w * 0.22, h * 0.17, 12 * k * (mini ? 2.2 : 1), 'rgba(255,232,180,.95)');
      sparkle(ctx, w * 0.79, h * 0.85, 11 * k * (mini ? 2.2 : 1), 'rgba(255,232,180,.95)');

      if (mini) return;

      // tagline arriba
      ctx.font = `400 ${21 * k}px ${FONT_SANS}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.shadowColor = 'rgba(70,35,50,.5)';
      ctx.shadowBlur = 12 * k;
      trackedText(ctx, PB_CONFIG.tagline, w / 2, 96 * k, 9 * k);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      wordmark(ctx, w, h, k, '#FFFFFF', 0.78);
    }
  },

  {
    /* ------ marco del evento ------ */
    id: 'evento',
    name: 'Evento',
    draw(ctx, w, h, mini) {
      const k = Math.min(w, h) / 1000;
      const bandH = h * (mini ? 0.3 : 0.165);

      // banda inferior rosa -> dorado
      const bg = ctx.createLinearGradient(0, h - bandH, w, h);
      bg.addColorStop(0, 'rgba(217,139,164,.96)');
      bg.addColorStop(0.55, 'rgba(206,132,158,.96)');
      bg.addColorStop(1, 'rgba(201,162,39,.96)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, h - bandH, w, bandH);

      // filo dorado
      ctx.fillStyle = 'rgba(255,240,205,.9)';
      ctx.fillRect(0, h - bandH, w, 3 * k);

      // marco fino
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h - bandH);
      ctx.clip();
      frameLine(ctx, w, h, k, 26, 4, 'rgba(255,255,255,.9)', 56);
      ctx.restore();

      // esquinas decorativas
      sparkle(ctx, w * 0.085, h * 0.075, 24 * k * (mini ? 2 : 1), 'rgba(255,255,255,.9)');
      sparkle(ctx, w * 0.915, h * 0.075, 17 * k * (mini ? 2 : 1), 'rgba(255,244,206,.95)');
      sparkle(ctx, w * 0.93, h * 0.2, 11 * k * (mini ? 2 : 1), 'rgba(255,255,255,.8)');

      if (mini) {
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ctx.fillRect(w * 0.16, h - bandH * 0.62, w * 0.68, 5 * k * 2.4);
        ctx.fillRect(w * 0.28, h - bandH * 0.35, w * 0.44, 4 * k * 2.4);
        return;
      }

      const cy = h - bandH;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // nombre del evento (auto-fit)
      let size = 60 * k;
      const track = () => size * 0.03;
      ctx.font = `600 ${size}px ${FONT_SERIF}`;
      let guard = 0;
      while (trackedWidth(ctx, PB_CONFIG.eventName, track()) > w * 0.84 && guard++ < 40) {
        size *= 0.94;
        ctx.font = `600 ${size}px ${FONT_SERIF}`;
      }
      ctx.fillStyle = '#FFFFFF';
      trackedText(ctx, PB_CONFIG.eventName, w / 2, cy + bandH * 0.52, track());

      // tagline
      ctx.font = `400 ${19 * k}px ${FONT_SANS}`;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      trackedText(ctx, PB_CONFIG.tagline, w / 2, cy + bandH * 0.78, 8 * k);

      // filetes a los costados del tagline
      const tw = trackedWidth(ctx, PB_CONFIG.tagline, 8 * k);
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = 1.4 * k;
      ctx.beginPath();
      ctx.moveTo(w / 2 - tw / 2 - 34 * k, cy + bandH * 0.72);
      ctx.lineTo(w / 2 - tw / 2 - 12 * k, cy + bandH * 0.72);
      ctx.moveTo(w / 2 + tw / 2 + 12 * k, cy + bandH * 0.72);
      ctx.lineTo(w / 2 + tw / 2 + 34 * k, cy + bandH * 0.72);
      ctx.stroke();
    }
  }
];
