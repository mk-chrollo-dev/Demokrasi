// Konva.js game UI for Presidency Run.
// Replaces game-ui.js. Loaded as a regular <script> in game.html.
// Depends on: window.client (client.js), window.Konva (CDN),
//             window.CARD_REGISTRY (/js/cards-browser.js),
//             window.HEADLINES (/js/news-headlines.js)

// ── Stage ─────────────────────────────────────────────────────────────────

const STAGE_W = 1280;
const STAGE_H = 720;

const stage = new Konva.Stage({
  container: 'konva-container',
  width: STAGE_W,
  height: STAGE_H,
});

// Viewport scaling for screens narrower than 1280px
function applyViewportScale() {
  const container = document.getElementById('konva-container');
  if (!container) return;
  const vw = window.innerWidth;
  if (vw < STAGE_W) {
    const s = vw / STAGE_W;
    stage.width(Math.round(STAGE_W * s));
    stage.height(Math.round(STAGE_H * s));
    stage.scale({ x: s, y: s });
    stage.draw();
  } else if (stage.scaleX() !== 1) {
    stage.width(STAGE_W);
    stage.height(STAGE_H);
    stage.scale({ x: 1, y: 1 });
    stage.draw();
  }
}
window.addEventListener('resize', applyViewportScale);

function disableSmoothing(layer) {
  const c = layer.getCanvas()._canvas;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
}

const L = {
  bg:      new Konva.Layer(),
  board:   new Konva.Layer(),
  effects: new Konva.Layer(),
  hands:   new Konva.Layer(),
  play:    new Konva.Layer(),
  ui:      new Konva.Layer(),
  anim:    new Konva.Layer(),
};
Object.values(L).forEach(l => { stage.add(l); disableSmoothing(l); });

// ── Layout ────────────────────────────────────────────────────────────────

const LAYOUT = {
  ticker:    { x: 0,    y: 0,   w: 1280, h: 36 },
  p2hand:    { x: 0,    y: 40,  w: 260,  h: 210 },
  p2fp:      { x: 1080, y: 40,  w: 196,  h: 210 },
  aspects:   { x: 280,  y: 50,  w: 720,  h: 265 },
  center:    { x: 260,  y: 36,  w: 760,  h: 648 },
  playarea:  { x: 0,    y: 260, w: 260,  h: 186 },
  roundinfo: { x: 1082, y: 260, w: 194,  h: 150 },
  p1fp:      { x: 1082, y: 416, w: 194,  h: 200 },
  p1hand:    { x: 0,    y: 460, w: 260,  h: 256 },
  endturn:   { x: 1090, y: 600, w: 180,  h: 40  },
  activate:  { x: 1090, y: 546, w: 180,  h: 46  },
};

const CARD = { w: 86, h: 120 };
const CARD_GAP = 22;

// ── Assets ────────────────────────────────────────────────────────────────

const ASSETS = {
  pres_soekarno:  '/assets/presidents/soekarno.png',
  pres_soeharto:  '/assets/presidents/soeharto.png',
  pres_megawati:  '/assets/presidents/megawati.png',
  pres_prabowo:   '/assets/presidents/prabowo.png',
  pres_jokowi:    '/assets/presidents/jokowi.png',
  frame_soekarno: '/assets/frames/frame_soekarno.png',
  frame_soeharto: '/assets/frames/frame_soeharto.png',
  frame_megawati: '/assets/frames/frame_megawati.png',
  frame_prabowo:  '/assets/frames/frame_prabowo.png',
  frame_jokowi:   '/assets/frames/frame_jokowi.png',
  card_back:      '/assets/card-back.png',
  bg_tile:        '/assets/bg-tile.png',
  fp_slot:        '/assets/fp-slot.png',
  icon_speech:    '/assets/icons/icon_speech.png',
  icon_money:     '/assets/icons/icon_money.png',
  icon_road:      '/assets/icons/icon_road.png',
  icon_crowd:     '/assets/icons/icon_crowd.png',
  icon_newspaper: '/assets/icons/icon_newspaper.png',
  icon_handshake: '/assets/icons/icon_handshake.png',
  icon_building:  '/assets/icons/icon_building.png',
  icon_star:      '/assets/icons/icon_star.png',
  icon_shield:    '/assets/icons/icon_shield.png',
  icon_lightning: '/assets/icons/icon_lightning.png',
  icon_sword:     '/assets/icons/icon_sword.png',
  icon_heart:     '/assets/icons/icon_heart.png',
  icon_book:      '/assets/icons/icon_book.png',
  icon_gear:      '/assets/icons/icon_gear.png',
  icon_chart:     '/assets/icons/icon_chart.png',
  icon_skull:     '/assets/icons/icon_skull.png',
  icon_envelope:  '/assets/icons/icon_envelope.png',
  icon_flag:      '/assets/icons/icon_flag.png',
  icon_clock:     '/assets/icons/icon_clock.png',
  icon_broom:     '/assets/icons/icon_broom.png',
  asp_ekonomi:    '/assets/aspects/ekonomi.png',
  asp_kesehatan:  '/assets/aspects/kesehatan.png',
  asp_keamanan:   '/assets/aspects/keamanan.png',
  asp_pendidikan: '/assets/aspects/pendidikan.png',
  asp_infra:      '/assets/aspects/infra.png',
  btn_normal:     '/assets/ui/btn-normal.png',
  btn_hover:      '/assets/ui/btn-hover.png',
  btn_danger:     '/assets/ui/btn-danger.png',
  pip_active:     '/assets/ui/pip-active.png',
  pip_empty:      '/assets/ui/pip-empty.png',
  pip_done:       '/assets/ui/pip-done.png',
};

window.IMG = {};

function preloadAll(onProgress, onComplete) {
  const keys = Object.keys(ASSETS);
  let loaded = 0;
  let failed = 0;
  for (const key of keys) {
    Konva.Image.fromURL(ASSETS[key], (node) => {
      window.IMG[key] = node.image();
      loaded++;
      onProgress((loaded + failed) / keys.length);
      if (loaded + failed === keys.length) onComplete();
    }, () => {
      // silently continue if asset missing
      failed++;
      onProgress((loaded + failed) / keys.length);
      if (loaded + failed === keys.length) onComplete();
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getCardData(instanceId) {
  const baseId = instanceId.replace(/_\d+$/, '');
  const card = (window.CARD_REGISTRY || {})[baseId];
  if (!card) return null;
  return { ...card, instanceId };
}

function getIconImg(iconType) {
  const key = 'icon_' + (iconType || 'star');
  return window.IMG[key] || window.IMG['icon_star'];
}

function getRiskPercent() {
  const state = window._gameState;
  const myRole = window.client?.playerRole;
  if (!state || !myRole) return 0;
  const uses = state.players[myRole]?.foulPlayUses || 0;
  const table = [5, 15, 30, 50, 75];
  return table[Math.min(uses, 4)];
}

// ── Background ────────────────────────────────────────────────────────────

function drawBackground() {
  const img = window.IMG['bg_tile'];
  if (!img) {
    L.bg.add(new Konva.Rect({ x: 0, y: 0, width: STAGE_W, height: STAGE_H, fill: '#0A0A1A' }));
  } else {
    const pat = document.createElement('canvas');
    pat.width = img.width; pat.height = img.height;
    const pctx = pat.getContext('2d');
    pctx.imageSmoothingEnabled = false;
    pctx.drawImage(img, 0, 0);
    L.bg.add(new Konva.Rect({
      x: 0, y: 0, width: STAGE_W, height: STAGE_H,
      fillPatternImage: pat,
      fillPatternRepeat: 'repeat',
      fillPatternScale: { x: 4, y: 4 },
    }));
  }
  L.bg.draw();
}

// ── Card tooltip (DOM overlay, outside Konva) ─────────────────────────────

let _tooltipEl = null;

function _ensureTooltip() {
  if (_tooltipEl) return _tooltipEl;
  _tooltipEl = document.createElement('div');
  Object.assign(_tooltipEl.style, {
    position: 'fixed', zIndex: '9999', pointerEvents: 'none',
    background: '#0A0A1A', border: '1px solid #FFD700', borderRadius: '6px',
    padding: '10px 12px', maxWidth: '220px', fontFamily: 'monospace',
    fontSize: '11px', color: '#CCC', lineHeight: '1.5',
    boxShadow: '0 4px 20px rgba(0,0,0,0.8)', display: 'none',
  });
  document.body.appendChild(_tooltipEl);
  return _tooltipEl;
}

function _effectChip(e) {
  const LABELS = {
    growth: '▲', decay: '▼', aura: '✦ aura', shield: '🛡', amplify: '⚡ amplify',
    skip: '⏭ skip', draw: '🃏 draw', cleanse: '🧹 cleanse',
    nullify_next_passive: '✗ nullify passive', nullify_effect_stack: '✗ clear effects',
    block_draw: '🚫 draw', block_active_play: '🚫 active', block_passive_play: '🚫 passive',
    multi_steal: '↔ steal', swap_aspects: '⇅ swap', hostile_cleanse: '✗ opp cleanse',
    force_discard_hand: '🗑 discard hand', lock_foulplay_slot: '🔒 FP slot',
    peek_deck: '👁 peek', copy_own_effect: '⧉ copy effect',
    reveal_hand_permanent: '👁 reveal hand',
  };
  const label = LABELS[e.type] || e.type;
  let text = label;
  if (e.delta !== null && e.delta !== 0) text += ` ${e.delta > 0 ? '+' : ''}${e.delta}`;
  if (e.durationTurns !== null && e.durationTurns > 0) text += ` [${e.durationTurns}t]`;
  const col = e.delta > 0 ? '#2ECC71' : e.delta < 0 ? '#E74C3C' : '#AAAAAA';
  return `<span style="display:inline-block;background:#111;border:1px solid #333;border-radius:3px;padding:1px 5px;margin:2px 2px 0 0;color:${col};font-size:10px">${text}</span>`;
}

function showCardTooltip(cardData, mx, my) {
  const el = _ensureTooltip();
  const typeColor = cardData.isFoulPlay ? '#FF6B6B' : cardData.type === 'active' ? '#E74C3C' : '#5DADE2';
  const typeLabel = cardData.isFoulPlay ? 'FOUL PLAY' : cardData.type === 'active' ? 'ACTIVE' : 'PASSIVE';
  const chips = (cardData.effects || []).map(_effectChip).join('');
  const desc = (cardData.description || '').replace(/;(\s*)/g, '<br>• ');
  el.innerHTML =
    `<div style="color:#FFD700;font-weight:bold;margin-bottom:4px;font-size:12px">${cardData.name || ''}</div>` +
    `<div style="color:${typeColor};font-size:9px;margin-bottom:6px;letter-spacing:1px">${typeLabel}</div>` +
    (chips ? `<div style="margin-bottom:8px">${chips}</div>` : '') +
    `<div style="color:#999;font-size:10px;border-top:1px solid #1A1A2E;padding-top:6px">${desc || '—'}</div>`;
  el.style.display = 'block';
  moveCardTooltip(mx, my);
}

function moveCardTooltip(mx, my) {
  if (!_tooltipEl || _tooltipEl.style.display === 'none') return;
  const pad = 14;
  const tw = _tooltipEl.offsetWidth, th = _tooltipEl.offsetHeight;
  let lx = mx + pad, ly = my + pad;
  if (lx + tw > window.innerWidth)  lx = mx - tw - pad;
  if (ly + th > window.innerHeight) ly = my - th - pad;
  _tooltipEl.style.left = lx + 'px';
  _tooltipEl.style.top  = ly + 'px';
}

function hideCardTooltip() {
  if (_tooltipEl) _tooltipEl.style.display = 'none';
}

// ── Card component ─────────────────────────────────────────────────────────

function makeCard(cardData, faceUp = true, interactive = false, onClick = null) {
  const group = new Konva.Group({ width: CARD.w, height: CARD.h, listening: faceUp && interactive });

  if (!faceUp || !cardData) {
    const back = new Konva.Image({ image: window.IMG['card_back'], width: CARD.w, height: CARD.h });
    if (!window.IMG['card_back']) {
      group.add(new Konva.Rect({ width: CARD.w, height: CARD.h, fill: '#1A0A0A', stroke: '#5C0000', strokeWidth: 2, cornerRadius: 4 }));
    } else {
      group.add(back);
    }
    return group;
  }

  const presId = cardData.owner || 'soekarno';
  const frameImg = window.IMG['frame_' + presId];

  if (frameImg) {
    group.add(new Konva.Image({ image: frameImg, width: CARD.w, height: CARD.h }));
  } else {
    // Fallback frame
    const frameColors = { soekarno: '#6B0000', soeharto: '#2A3020', megawati: '#8B0A1E', prabowo: '#0D1117', jokowi: '#0D3B7A' };
    group.add(new Konva.Rect({ width: CARD.w, height: CARD.h, fill: frameColors[presId] || '#1A1A2E', stroke: '#FFD700', strokeWidth: 2, cornerRadius: 4 }));
  }

  // Portrait top-right
  const portImg = window.IMG['pres_' + presId];
  if (portImg) group.add(new Konva.Image({ image: portImg, x: CARD.w - 34, y: 3, width: 30, height: 30 }));

  // Icon top-left
  const iconImg = getIconImg(cardData.iconType);
  if (iconImg) group.add(new Konva.Image({ image: iconImg, x: 3, y: 3, width: 20, height: 20 }));

  // Type badge
  const isActive = cardData.type === 'active';
  group.add(new Konva.Rect({ x: CARD.w / 2 - 22, y: 26, width: 44, height: 10, fill: cardData.isFoulPlay ? '#3B0000' : isActive ? '#5C0000' : '#0D2144', cornerRadius: 2 }));
  group.add(new Konva.Text({
    x: CARD.w / 2 - 22, y: 27, width: 44, height: 10,
    text: cardData.isFoulPlay ? 'FOUL PLAY' : isActive ? 'ACTIVE' : 'PASSIVE',
    fontSize: 6, fontFamily: 'monospace',
    fill: cardData.isFoulPlay ? '#FF6B6B' : '#CCCCCC', align: 'center',
  }));

  // Description
  group.add(new Konva.Text({
    x: 4, y: 40, width: CARD.w - 8, height: 52,
    text: cardData.description || '',
    fontSize: 6, fontFamily: 'monospace', fill: '#AAAAAA', wrap: 'word', ellipsis: true,
  }));

  // Bottom name strip
  group.add(new Konva.Rect({ x: 0, y: CARD.h - 26, width: CARD.w, height: 26, fill: 'rgba(0,0,0,0.75)', cornerRadius: [0, 0, 3, 3] }));
  group.add(new Konva.Text({
    x: 4, y: CARD.h - 24, width: CARD.w - 8, height: 22,
    text: cardData.name || '', fontSize: 7, fontFamily: 'monospace', fontStyle: 'bold',
    fill: cardData.isFoulPlay ? '#FF6B6B' : '#FFD700', wrap: 'word', ellipsis: true,
  }));

  if (interactive && onClick) {
    group.on('mouseover', (e) => {
      document.body.style.cursor = 'pointer';
      group.to({ scaleX: 1.08, scaleY: 1.08, offsetX: CARD.w * 0.04, offsetY: CARD.h * 0.04, duration: 0.1 });
      showCardTooltip(cardData, e.evt.clientX, e.evt.clientY);
      L.hands.draw();
    });
    group.on('mousemove', (e) => moveCardTooltip(e.evt.clientX, e.evt.clientY));
    group.on('mouseout', () => {
      document.body.style.cursor = 'default';
      group.to({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, duration: 0.1 });
      hideCardTooltip();
      L.hands.draw();
    });
    group.on('click', () => onClick(cardData));
  } else if (faceUp) {
    group.opacity(0.5);
  }

  return group;
}

// ── Card play animation ────────────────────────────────────────────────────

function animateCardPlay(sourceGroup, instanceId) {
  const abs = sourceGroup.getAbsolutePosition();
  const clone = sourceGroup.clone();
  clone.x(abs.x); clone.y(abs.y);
  L.anim.add(clone);
  L.anim.draw();

  const targetX = LAYOUT.playarea.x + LAYOUT.playarea.w / 2 - CARD.w / 2;
  const targetY = LAYOUT.playarea.y + LAYOUT.playarea.h / 2 - CARD.h / 2;

  clone.to({
    x: targetX, y: targetY, scaleX: 1.2, scaleY: 1.2, duration: 0.22,
    onFinish: () => {
      clone.to({
        scaleX: 0, scaleY: 0, opacity: 0, duration: 0.14,
        onFinish: () => { clone.destroy(); L.anim.draw(); window.client.playCard(instanceId); }
      });
    },
  });
  L.anim.draw();
}

// ── Hand renderer ──────────────────────────────────────────────────────────

function renderHand(cardsOrCount, area, faceUp, interactive, lockedTypes = []) {
  L.hands.find('.' + (area === LAYOUT.p1hand ? 'p1hand' : 'p2hand')).forEach(n => n.destroy());

  const count = faceUp ? cardsOrCount.length : cardsOrCount;
  const visCount = Math.min(count, 7);
  if (visCount === 0) { L.hands.draw(); return; }

  const totalW = CARD.w + (visCount - 1) * CARD_GAP;
  const startX = area.x + Math.max(0, (area.w - totalW) / 2);
  const startY = area.y + (area.h - CARD.h) / 2;
  const className = area === LAYOUT.p1hand ? 'p1hand' : 'p2hand';

  if (!faceUp) {
    for (let i = 0; i < visCount; i++) {
      const card = makeCard(null, false);
      card.name(className); card.x(startX + i * CARD_GAP); card.y(startY);
      L.hands.add(card);
    }
    const lbl = new Konva.Text({
      name: className, x: area.x, y: area.y + area.h - 22, width: area.w,
      text: `× ${count}`, fontSize: 12, fontFamily: 'monospace', fill: '#FFD700', align: 'center',
    });
    L.hands.add(lbl);
    L.hands.draw();
    return;
  }

  cardsOrCount.slice(0, 7).forEach((cardData, i) => {
    const isCardLocked = interactive && !cardData.isFoulPlay &&
      ((cardData.type === 'active'  && lockedTypes.includes('active')) ||
       (cardData.type === 'passive' && lockedTypes.includes('passive')));

    const handleClick = (cd) => {
      if (isCardLocked) return;
      if (cd.isFoulPlay) {
        window.client.loadFoulPlay(cd.instanceId);
      } else {
        const srcGrp = L.hands.find('.' + className)[i];
        if (srcGrp) animateCardPlay(srcGrp, cd.instanceId);
        else window.client.playCard(cd.instanceId);
      }
    };
    const card = makeCard(cardData, true, interactive && !isCardLocked, interactive && !isCardLocked ? handleClick : null);
    if (isCardLocked) {
      card.opacity(0.35);
      // Lock badge overlay
      const badge = new Konva.Group({ name: className });
      badge.add(new Konva.Rect({ x: CARD.w / 2 - 18, y: CARD.h / 2 - 10, width: 36, height: 20, fill: '#3B0000', cornerRadius: 3, opacity: 0.9 }));
      badge.add(new Konva.Text({ x: CARD.w / 2 - 18, y: CARD.h / 2 - 8, width: 36, text: '🔒 LOCKED', fontSize: 6, fontFamily: 'monospace', fill: '#E74C3C', align: 'center' }));
      badge.x(startX + i * CARD_GAP); badge.y(startY);
      L.hands.add(badge);
    }
    card.name(className); card.x(startX + i * CARD_GAP); card.y(startY);
    L.hands.add(card);
  });
  L.hands.draw();
}

// ── Foul play slot ─────────────────────────────────────────────────────────

function makeFoulPlaySlot(area, label, isLoaded, isLocked) {
  const g = new Konva.Group();
  const bx = area.x + 6, by = area.y + 6, bw = area.w - 12, bh = area.h - 12;

  g.add(new Konva.Rect({
    x: bx, y: by, width: bw, height: bh, fill: '#080812',
    stroke: isLoaded ? (label === 'MY FOUL PLAY' ? '#9B59B6' : '#C8102E') : '#222',
    strokeWidth: 2, dash: isLoaded ? [] : [6, 4], cornerRadius: 6,
    shadowColor: isLoaded ? '#9B59B6' : 'transparent', shadowBlur: isLoaded ? 12 : 0,
  }));

  g.add(new Konva.Text({
    x: bx, y: by + 4, width: bw, text: label,
    fontSize: 8, fontFamily: 'monospace', fill: '#444', align: 'center',
  }));

  const icon = window.IMG['fp_slot'];
  if (icon) g.add(new Konva.Image({ image: icon, x: bx + bw / 2 - 16, y: by + 18, width: 32, height: 32, opacity: isLoaded ? 1 : 0.25 }));

  g.add(new Konva.Text({
    x: bx, y: by + 56, width: bw,
    text: isLocked ? `LOCKED` : (isLoaded ? '✦ LOADED' : 'EMPTY'),
    fontSize: 9, fontFamily: 'monospace',
    fill: isLocked ? '#E74C3C' : (isLoaded ? '#9B59B6' : '#333'), align: 'center',
  }));

  return g;
}

// ── Aspect table ───────────────────────────────────────────────────────────

const ASPECTS = ['Ekonomi', 'Kesehatan', 'Keamanan', 'Pendidikan', 'Infrastruktur'];
const ASP_ICON = { Ekonomi: 'asp_ekonomi', Kesehatan: 'asp_kesehatan', Keamanan: 'asp_keamanan', Pendidikan: 'asp_pendidikan', Infrastruktur: 'asp_infra' };
const scoreTexts = { p1: {}, p2: {} };
const scoreBars  = { p1: {}, p2: {} };
const BAR_MAX_W  = { p2: 0, p1: 0 }; // set in buildAspectTable

function buildAspectTable() {
  const { x, y } = LAYOUT.aspects;
  const rowH = 48;
  const mid  = x + LAYOUT.aspects.w / 2;

  BAR_MAX_W.p2 = mid - x - 80;
  BAR_MAX_W.p1 = x + LAYOUT.aspects.w - (mid + 80);

  // Column headers
  L.board.add(new Konva.Text({ x: x + 10, y: y - 18, text: 'P2', fontSize: 11, fontFamily: 'monospace', fill: '#666' }));
  L.board.add(new Konva.Text({ x: x + LAYOUT.aspects.w - 30, y: y - 18, text: 'P1', fontSize: 11, fontFamily: 'monospace', fill: '#666' }));

  ASPECTS.forEach((asp, i) => {
    const ry = y + i * rowH;

    // Icon
    const aspImg = window.IMG[ASP_ICON[asp]];
    if (aspImg) L.board.add(new Konva.Image({ image: aspImg, x: mid - 12, y: ry + 12, width: 24, height: 24 }));
    else L.board.add(new Konva.Rect({ x: mid - 12, y: ry + 12, width: 24, height: 24, fill: '#333' }));

    // Aspect name
    L.board.add(new Konva.Text({ x: mid - 60, y: ry + 18, text: asp, fontSize: 11, fontFamily: 'monospace', fill: '#888', width: 48, align: 'right' }));

    // Divider
    L.board.add(new Konva.Line({ points: [x, ry + rowH - 2, x + LAYOUT.aspects.w, ry + rowH - 2], stroke: '#1A1A2E', strokeWidth: 1 }));

    // P2 score (left)
    scoreTexts.p2[asp] = new Konva.Text({
      x: x, y: ry + 10, width: mid - x - 70, text: '50',
      fontSize: 22, fontFamily: 'monospace', fontStyle: 'bold', fill: '#FFF', align: 'right',
    });
    L.board.add(scoreTexts.p2[asp]);

    // P1 score (right)
    scoreTexts.p1[asp] = new Konva.Text({
      x: mid + 70, y: ry + 10, width: x + LAYOUT.aspects.w - (mid + 70), text: '50',
      fontSize: 22, fontFamily: 'monospace', fontStyle: 'bold', fill: '#FFF', align: 'left',
    });
    L.board.add(scoreTexts.p1[asp]);

    // Bar backgrounds (P2 left grows left→right, P1 right grows left→right)
    L.board.add(new Konva.Rect({ x: x, y: ry + 36, width: BAR_MAX_W.p2, height: 6, fill: '#111122', cornerRadius: 2 }));
    L.board.add(new Konva.Rect({ x: mid + 80, y: ry + 36, width: BAR_MAX_W.p1, height: 6, fill: '#111122', cornerRadius: 2 }));

    // Bar fills — start at 50%
    scoreBars.p2[asp] = new Konva.Rect({ x: x, y: ry + 36, width: BAR_MAX_W.p2 * 0.5, height: 6, fill: '#2ECC71', cornerRadius: 2 });
    scoreBars.p1[asp] = new Konva.Rect({ x: mid + 80, y: ry + 36, width: BAR_MAX_W.p1 * 0.5, height: 6, fill: '#2ECC71', cornerRadius: 2 });
    L.board.add(scoreBars.p2[asp]);
    L.board.add(scoreBars.p1[asp]);
  });

  L.board.draw();
}

function tweenBar(barNode, maxW, targetVal) {
  const targetW = Math.max(2, (Math.min(100, Math.max(0, targetVal)) / 100) * maxW);
  const startW  = barNode.width();
  if (Math.abs(startW - targetW) < 0.5) return;
  const t0 = Date.now(), dur = 400;
  const anim = new Konva.Animation(() => {
    const pct = Math.min((Date.now() - t0) / dur, 1);
    barNode.width(startW + (targetW - startW) * pct);
    if (pct >= 1) anim.stop();
  }, L.board);
  anim.start();
}

function tweenNumber(textNode, target) {
  const start = parseInt(textNode.text()) || 0;
  if (start === target) return;
  const t0 = Date.now(), dur = 400;
  const anim = new Konva.Animation(() => {
    const pct = Math.min((Date.now() - t0) / dur, 1);
    textNode.text(String(Math.round(start + (target - start) * pct)));
    if (pct >= 1) anim.stop();
  }, L.board);
  anim.start();
}

function updateAspectScores(state) {
  ASPECTS.forEach(asp => {
    const p1v = state.players.p1.aspects[asp];
    const p2v = state.players.p2.aspects[asp];
    tweenNumber(scoreTexts.p1[asp], p1v);
    tweenNumber(scoreTexts.p2[asp], p2v);
    const p1col = p1v > p2v ? '#2ECC71' : p1v < p2v ? '#E74C3C' : '#FFFFFF';
    const p2col = p2v > p1v ? '#2ECC71' : p2v < p1v ? '#E74C3C' : '#FFFFFF';
    scoreTexts.p1[asp].fill(p1col);
    scoreTexts.p2[asp].fill(p2col);
    tweenBar(scoreBars.p1[asp], BAR_MAX_W.p1, p1v);
    tweenBar(scoreBars.p2[asp], BAR_MAX_W.p2, p2v);
    scoreBars.p1[asp].fill(p1col);
    scoreBars.p2[asp].fill(p2col);
  });
  L.board.draw();
}

// ── Round info ─────────────────────────────────────────────────────────────

const RI = {};

function buildRoundInfo() {
  const { x, y, w, h } = LAYOUT.roundinfo;
  L.board.add(new Konva.Rect({ x, y, width: w, height: h, fill: '#0D0D1F', stroke: '#1A1A3A', strokeWidth: 1, cornerRadius: 4 }));

  RI.round  = new Konva.Text({ x, y: y + 10, width: w, text: 'ROUND 1 / 7', fontSize: 12, fontFamily: 'monospace', fill: '#FFD700', align: 'center' });
  RI.turn   = new Konva.Text({ x, y: y + 30, width: w, text: 'TURN 1 / 5', fontSize: 11, fontFamily: 'monospace', fill: '#AAAAAA', align: 'center' });
  RI.active = new Konva.Text({ x, y: y + 50, width: w, text: '—', fontSize: 11, fontFamily: 'monospace', fill: '#2ECC71', align: 'center' });

  RI.pips = [];
  const pipY = y + 74, pipSpacing = w / 8, pipStartX = x + pipSpacing / 2;
  for (let i = 0; i < 7; i++) {
    const pip = new Konva.Image({ image: window.IMG['pip_empty'], x: pipStartX + i * pipSpacing - 7, y: pipY, width: 14, height: 14 });
    L.board.add(pip);
    RI.pips.push(pip);
  }

  [RI.round, RI.turn, RI.active].forEach(n => L.board.add(n));
  L.board.draw();
}

let _sdBorderAnim = null, _sdBorder = null, _sdLabel = null;

function updateRoundInfo(state, myRole) {
  const isMyTurn = state.activePlayer === myRole;
  const isSD = state.isSuddenDeath;
  RI.round.text(`ROUND ${state.round}${isSD ? ' ★' : ''} / 7`);
  RI.turn.text(`TURN ${state.turn} / 5`);
  RI.active.text(isMyTurn ? 'YOUR TURN' : 'OPPONENT');
  RI.active.fill(isMyTurn ? '#2ECC71' : '#E74C3C');
  RI.pips.forEach((pip, i) => {
    const k = i < state.round - 1 ? 'pip_done' : i === state.round - 1 ? 'pip_active' : 'pip_empty';
    if (window.IMG[k]) pip.image(window.IMG[k]);
  });
  L.board.draw();

  // Sudden death pulsing red border + badge
  if (isSD && !_sdBorder) {
    _sdBorder = new Konva.Rect({ x: 1, y: 1, width: STAGE_W - 2, height: STAGE_H - 2, stroke: '#E74C3C', strokeWidth: 4, listening: false, cornerRadius: 2 });
    _sdLabel  = new Konva.Text({
      x: STAGE_W / 2 - 80, y: LAYOUT.ticker.h + 4, width: 160,
      text: '⚡ SUDDEN DEATH ⚡', fontSize: 10, fontFamily: 'monospace', fontStyle: 'bold',
      fill: '#E74C3C', align: 'center', listening: false,
    });
    L.effects.add(_sdBorder);
    L.effects.add(_sdLabel);
    _sdBorderAnim = new Konva.Animation((frame) => {
      const pulse = 0.35 + 0.65 * Math.abs(Math.sin(frame.time * 0.0025));
      _sdBorder.opacity(pulse);
      _sdLabel.opacity(pulse);
    }, L.effects);
    _sdBorderAnim.start();
  } else if (!isSD && _sdBorder) {
    if (_sdBorderAnim) { _sdBorderAnim.stop(); _sdBorderAnim = null; }
    _sdBorder.destroy(); _sdBorder = null;
    if (_sdLabel) { _sdLabel.destroy(); _sdLabel = null; }
    L.effects.draw();
  }

  // News event flash — highlight the affected aspect row briefly
  if (state.lastNewsEvent && state.lastNewsEvent !== window._lastNewsEventShown) {
    window._lastNewsEventShown = state.lastNewsEvent;
    flashNewsAspect(state.lastNewsEvent);
  }
}

let _newsFlashAnim = null;
function flashNewsAspect(evt) {
  if (_newsFlashAnim) { _newsFlashAnim.stop(); }
  const { x, y } = LAYOUT.aspects;
  const rowH = 48;
  const aspIdx = ASPECTS.indexOf(evt.aspect);
  if (aspIdx < 0) return;

  const ry = y + aspIdx * rowH;
  const arrow = evt.direction === 'up' ? '▲' : '▼';
  const col   = evt.direction === 'up' ? '#F39C12' : '#E74C3C';

  const flash = new Konva.Group();
  flash.add(new Konva.Rect({ x: x, y: ry, width: LAYOUT.aspects.w, height: rowH - 2, fill: col, opacity: 0.18, cornerRadius: 2 }));
  flash.add(new Konva.Text({
    x: x + LAYOUT.aspects.w / 2 - 60, y: ry + 14, width: 120,
    text: `${arrow} ${evt.aspect} weight`, fontSize: 10, fontFamily: 'monospace',
    fill: col, align: 'center', fontStyle: 'bold',
  }));
  L.effects.add(flash);
  L.effects.draw();

  const t0 = Date.now();
  _newsFlashAnim = new Konva.Animation(() => {
    const elapsed = Date.now() - t0;
    if (elapsed > 2800) { flash.destroy(); L.effects.draw(); _newsFlashAnim.stop(); return; }
    flash.opacity(elapsed < 2200 ? 1 : 1 - (elapsed - 2200) / 600);
    L.effects.draw();
  }, L.effects);
  _newsFlashAnim.start();
}

// ── Player label panels ────────────────────────────────────────────────────

const playerLabels = { p1: null, p2: null };

function buildPlayerLabels() {
  // P2 label (top)
  playerLabels.p2 = new Konva.Text({
    x: 0, y: 42, width: 260,
    text: 'P2', fontSize: 11, fontFamily: 'monospace', fill: '#888', align: 'center',
  });
  // P1 label (bottom)
  playerLabels.p1 = new Konva.Text({
    x: 0, y: 462, width: 260,
    text: 'P1', fontSize: 11, fontFamily: 'monospace', fill: '#888', align: 'center',
  });
  L.board.add(playerLabels.p1);
  L.board.add(playerLabels.p2);
  L.board.draw();
}

function updatePlayerLabels(state, myRole) {
  const presData = window.PRESIDENT_DATA || [];
  const p1Pres = presData.find(p => p.id === state.players.p1.presidentId);
  const p2Pres = presData.find(p => p.id === state.players.p2.presidentId);
  playerLabels.p1.text(`P1: ${p1Pres ? p1Pres.displayName : 'Player 1'}${myRole === 'p1' ? ' ◀' : ''}`);
  playerLabels.p2.text(`P2: ${p2Pres ? p2Pres.displayName : 'Player 2'}${myRole === 'p2' ? ' ◀' : ''}`);
  L.board.draw();
}

// ── Buttons ────────────────────────────────────────────────────────────────

function makeButton(label, x, y, w, h, style, onClick) {
  const g = new Konva.Group({ x, y });
  const normalKey = style === 'danger' ? 'btn_danger' : 'btn_normal';
  const hoverKey  = style === 'danger' ? 'btn_danger' : 'btn_hover';

  const bg = new Konva.Image({ image: window.IMG[normalKey], width: w, height: h });
  if (!window.IMG[normalKey]) {
    const fallback = new Konva.Rect({ width: w, height: h, fill: style === 'danger' ? '#5C0000' : '#1A1A2E', stroke: style === 'danger' ? '#E74C3C' : '#FFD700', strokeWidth: 1, cornerRadius: 3 });
    g.add(fallback);
  } else {
    g.add(bg);
  }
  g.add(new Konva.Text({
    width: w, height: h, text: label,
    fontSize: 9, fontFamily: 'monospace', fontStyle: 'bold',
    fill: style === 'danger' ? '#FF6B6B' : '#FFD700', align: 'center', verticalAlign: 'middle',
  }));

  g.on('mouseover', () => { document.body.style.cursor = 'pointer'; if (window.IMG[hoverKey]) bg.image(window.IMG[hoverKey]); L.ui.draw(); });
  g.on('mouseout',  () => { document.body.style.cursor = 'default'; if (window.IMG[normalKey]) bg.image(window.IMG[normalKey]); L.ui.draw(); });
  g.on('click', onClick);
  return g;
}

let endTurnBtn = null, activateBtn = null;

function buildActionButtons() {
  endTurnBtn = makeButton('END TURN', LAYOUT.endturn.x, LAYOUT.endturn.y, LAYOUT.endturn.w, LAYOUT.endturn.h, 'normal', () => window.client.endTurn());
  L.ui.add(endTurnBtn);

  activateBtn = makeButton('ACTIVATE FOUL PLAY', LAYOUT.activate.x, LAYOUT.activate.y, LAYOUT.activate.w, LAYOUT.activate.h, 'danger', () => {
    const state = window._gameState;
    const myRole = window.client?.playerRole;
    const fpSlotId = state?.players?.[myRole]?.foulPlaySlot;
    const card = fpSlotId ? getCardData(fpSlotId) : null;
    const risk = getRiskPercent();
    const cardLine = card ? `\n${card.name}\n"${card.description}"\n` : '';
    const warnLine = risk >= 50 ? '\n⚠ BAHAYA: Kamu bisa kalah seketika!' : '';
    if (confirm(`AKTIFKAN FOUL PLAY?${cardLine}\nRisiko backfire: ${risk}%${warnLine}`)) {
      window.client.activateFoulPlay();
    }
  });
  activateBtn.visible(false);
  L.ui.add(activateBtn);
  L.ui.draw();
}

function updateActionButtons(state, myRole) {
  const isMyTurn = state.activePlayer === myRole;
  endTurnBtn.listening(isMyTurn);
  endTurnBtn.opacity(isMyTurn ? 1 : 0.4);
  const myPlayer = state.players[myRole];
  const fpLocked = myPlayer?.activeEffects?.some(e => e.type === 'lock_foulplay_slot' && (e.durationTurns || 0) > 0);
  activateBtn.visible(isMyTurn && !!myPlayer?.foulPlaySlot && !fpLocked);
  L.ui.draw();
}

// ── News ticker ────────────────────────────────────────────────────────────

function buildTicker(headlines) {
  L.ui.add(new Konva.Rect({ x: 0, y: 0, width: STAGE_W, height: LAYOUT.ticker.h, fill: '#050510', stroke: '#1A1A3A', strokeWidth: 1 }));

  const dot = new Konva.Circle({ x: 18, y: 18, radius: 5, fill: '#E74C3C' });
  L.ui.add(dot);
  const dotAnim = new Konva.Animation((frame) => { dot.opacity(Math.sin(frame.time * 0.004) > 0 ? 1 : 0); }, L.ui);
  dotAnim.start();

  L.ui.add(new Konva.Text({ x: 28, y: 11, text: 'LIVE', fontSize: 9, fontFamily: 'monospace', fontStyle: 'bold', fill: '#E74C3C' }));

  const tickerText = new Konva.Text({ x: STAGE_W, y: 10, text: headlines[0] || '', fontSize: 13, fontFamily: 'monospace', fill: '#EEEEEE', listening: false });
  L.ui.add(tickerText);

  let idx = 0;
  const scrollAnim = new Konva.Animation(() => {
    tickerText.x(tickerText.x() - 1.5);
    if (tickerText.x() < -(tickerText.width() + 60)) {
      idx = (idx + 1) % headlines.length;
      tickerText.text(headlines[idx]);
      tickerText.x(STAGE_W);
    }
  }, L.ui);
  scrollAnim.start();
}

// ── Active effects ─────────────────────────────────────────────────────────

function renderEffects(state, myRole) {
  L.effects.destroyChildren();
  const opp = myRole === 'p1' ? 'p2' : 'p1';
  const myEff  = state.players[myRole]?.activeEffects || [];
  const oppEff = state.players[opp]?.activeEffects || [];

  function renderList(effects, startX, startY, label, positive) {
    L.effects.add(new Konva.Text({ x: startX, y: startY, text: label, fontSize: 8, fontFamily: 'monospace', fill: '#444' }));
    effects.slice(0, 4).forEach((e, i) => {
      L.effects.add(new Konva.Rect({ x: startX, y: startY + 12 + i * 18, width: 230, height: 14, fill: '#0D0D22', stroke: '#1A1A3A', strokeWidth: 1, cornerRadius: 2 }));
      L.effects.add(new Konva.Text({
        x: startX + 4, y: startY + 14 + i * 18, width: 222,
        text: `${e.sourceCard || e.type} [${e.durationTurns ?? '∞'}t]`,
        fontSize: 7, fontFamily: 'monospace',
        fill: (e.delta > 0) ? '#2ECC71' : '#E74C3C', ellipsis: true,
      }));
    });
  }

  const cx = LAYOUT.center.x + 10;
  renderList(myEff,  cx, LAYOUT.center.y + 330, 'MY EFFECTS', true);
  renderList(oppEff, cx, LAYOUT.center.y + 460, 'OPP EFFECTS', false);
  L.effects.draw();
}

// ── Peek notification ──────────────────────────────────────────────────────

function showPeek(cards) {
  const names = cards.map(c => c?.name || c?.id || '?').join(', ');
  const box = new Konva.Group();
  box.add(new Konva.Rect({ x: STAGE_W / 2 - 200, y: 42, width: 400, height: 46, fill: '#0D2144', stroke: '#2980B9', strokeWidth: 2, cornerRadius: 6 }));
  box.add(new Konva.Text({ x: STAGE_W / 2 - 200, y: 52, width: 400, text: `BLUSUKAN: ${names}`, fontSize: 11, fontFamily: 'monospace', fill: '#5DADE2', align: 'center' }));
  L.ui.add(box);
  L.ui.draw();
  setTimeout(() => { box.destroy(); L.ui.draw(); }, 4000);
}

// ── Log ───────────────────────────────────────────────────────────────────

const logEntries = [];
const LOG_MAX = 8;
let logGroup = null;

function buildLog() {
  const lx = LAYOUT.center.x + 10, ly = LAYOUT.center.y + 554;
  logGroup = new Konva.Group({ x: lx, y: ly });
  L.ui.add(logGroup);
}

function appendLog(msg) {
  logEntries.push(msg);
  if (logEntries.length > LOG_MAX) logEntries.shift();
  logGroup.destroyChildren();
  logEntries.forEach((entry, i) => {
    logGroup.add(new Konva.Text({
      x: 0, y: i * 14, width: 740, text: entry,
      fontSize: 8, fontFamily: 'monospace',
      fill: i === logEntries.length - 1 ? '#CCCCCC' : '#555',
      ellipsis: true,
    }));
  });
  L.ui.draw();
}

// ── Disconnect overlay ─────────────────────────────────────────────────────

let disconnectOverlay = null;

function showDisconnect(playerRole) {
  if (disconnectOverlay) disconnectOverlay.destroy();
  disconnectOverlay = new Konva.Group();
  disconnectOverlay.add(new Konva.Rect({ x: 0, y: 0, width: STAGE_W, height: STAGE_H, fill: 'rgba(0,0,0,0.65)' }));
  disconnectOverlay.add(new Konva.Text({
    x: 0, y: STAGE_H / 2 - 30, width: STAGE_W,
    text: `${playerRole.toUpperCase()} disconnected\nWaiting for reconnect...`,
    fontSize: 20, fontFamily: 'monospace', fill: '#E74C3C', align: 'center',
  }));
  L.ui.add(disconnectOverlay);
  L.ui.draw();
}

function clearDisconnect() {
  if (disconnectOverlay) { disconnectOverlay.destroy(); disconnectOverlay = null; L.ui.draw(); }
}

// ── End screen ─────────────────────────────────────────────────────────────

function showEndScreen(data) {
  const myRole = window.client.playerRole;
  const { finalScores, aspectWeights } = data;

  const overlay = new Konva.Rect({ x: 0, y: 0, width: STAGE_W, height: STAGE_H, fill: 'rgba(0,0,0,0)' });
  L.ui.add(overlay);
  overlay.to({ fill: 'rgba(0,0,0,0.88)', duration: 0.5 });

  const panel = new Konva.Group({ opacity: 0 });
  const px = STAGE_W / 2 - 300, py = 50;
  panel.add(new Konva.Rect({ x: px, y: py, width: 600, height: 610, fill: '#0A0A1A', stroke: '#FFD700', strokeWidth: 2, cornerRadius: 8 }));
  panel.add(new Konva.Text({ x: px, y: py + 16, width: 600, text: 'HASIL PEMILU', fontSize: 22, fontFamily: 'monospace', fontStyle: 'bold', fill: '#FFD700', align: 'center' }));
  L.ui.add(panel);
  panel.to({ opacity: 1, duration: 0.4 });

  // Reveal each aspect weight with a delay
  const aspKeys = Object.keys(aspectWeights || {});
  const shuffled = aspKeys.slice().sort(() => Math.random() - 0.5);
  let delay = 400;

  shuffled.forEach((asp, i) => {
    setTimeout(() => {
      const w = (aspectWeights[asp] || 0).toFixed(0);
      const p1s = (data.players?.p1?.aspects?.[asp] || 0).toFixed(1);
      const p2s = (data.players?.p2?.aspects?.[asp] || 0).toFixed(1);
      const p1c = (data.players?.p1?.aspects?.[asp] * aspectWeights[asp] / 100).toFixed(1);
      const p2c = (data.players?.p2?.aspects?.[asp] * aspectWeights[asp] / 100).toFixed(1);
      const ry = py + 60 + i * 82;

      const row = new Konva.Group({ opacity: 0 });
      const aspImg = window.IMG[ASP_ICON[asp]];
      if (aspImg) row.add(new Konva.Image({ image: aspImg, x: px + 20, y: ry, width: 20, height: 20 }));
      row.add(new Konva.Text({ x: px + 48, y: ry + 3, text: asp, fontSize: 13, fontFamily: 'monospace', fill: '#FFF' }));
      row.add(new Konva.Text({ x: px + 48, y: ry + 20, text: `Weight: ${w}%`, fontSize: 11, fontFamily: 'monospace', fill: '#FFD700' }));
      row.add(new Konva.Text({ x: px + 300, y: ry + 3, text: `P2: ${p2s} → +${p2c}`, fontSize: 11, fontFamily: 'monospace', fill: '#AAA' }));
      row.add(new Konva.Text({ x: px + 300, y: ry + 20, text: `P1: ${p1s} → +${p1c}`, fontSize: 11, fontFamily: 'monospace', fill: '#CCC' }));
      row.add(new Konva.Line({ points: [px + 16, ry + 36, px + 584, ry + 36], stroke: '#1A1A2E', strokeWidth: 1 }));

      panel.add(row);
      row.to({ opacity: 1, duration: 0.25 });
      L.ui.draw();
    }, delay * (i + 1));
  });

  // Final scores
  setTimeout(() => {
    const winner = finalScores?.winner;
    const isWinner = winner === myRole;
    const myScore = (finalScores?.[myRole + 'Score'] ?? 0).toFixed(2);
    const oppScore = (finalScores?.[(myRole === 'p1' ? 'p2' : 'p1') + 'Score'] ?? 0).toFixed(2);

    const box = new Konva.Group({ opacity: 0 });
    box.add(new Konva.Rect({ x: px + 16, y: py + 536, width: 568, height: 56, fill: isWinner ? '#0D3B0D' : '#3B0D0D', stroke: isWinner ? '#2ECC71' : '#E74C3C', strokeWidth: 2, cornerRadius: 4 }));
    box.add(new Konva.Text({
      x: px + 16, y: py + 550, width: 568,
      text: isWinner ? `✓ MENANG!  Skor: ${myScore} vs ${oppScore}` : `✗ KALAH  Skor: ${myScore} vs ${oppScore}`,
      fontSize: 16, fontFamily: 'monospace', fontStyle: 'bold',
      fill: isWinner ? '#2ECC71' : '#E74C3C', align: 'center',
    }));
    panel.add(box);
    box.to({ opacity: 1, duration: 0.3 });

    if (myRole === 'p1') {
      const replayBtn = makeButton('PLAY AGAIN', STAGE_W / 2 - 70, py + 620, 140, 36, 'normal', () => { window.client.resetRoom(); window.location.href = '/'; });
      panel.add(replayBtn);
    } else {
      panel.add(new Konva.Text({
        x: px + 16, y: py + 626, width: 568,
        text: 'Menunggu P1 untuk memulai ulang permainan...',
        fontSize: 12, fontFamily: 'monospace', fill: '#666', align: 'center',
      }));
    }
    L.ui.draw();
  }, delay * (shuffled.length + 1) + 600);
}

// ── Main full render ───────────────────────────────────────────────────────

function fullRender(state) {
  window._gameState = state;
  const myRole = window.client?.playerRole || 'p1';
  const isMyTurn = state.activePlayer === myRole;
  const myPlayer = state.players[myRole];
  const oppRole = myRole === 'p1' ? 'p2' : 'p1';
  const oppPlayer = state.players[oppRole];

  updateAspectScores(state);
  updateRoundInfo(state, myRole);
  updateActionButtons(state, myRole);
  updatePlayerLabels(state, myRole);
  renderEffects(state, myRole);

  // Determine which card types are locked for me this turn
  const myLockedTypes = [];
  if (isMyTurn) {
    if ((myPlayer.activeEffects || []).some(e => e.type === 'block_active_play'  && (e.durationTurns || 0) > 0)) myLockedTypes.push('active');
    if ((myPlayer.activeEffects || []).some(e => e.type === 'block_passive_play' && (e.durationTurns || 0) > 0)) myLockedTypes.push('passive');
  }

  // My hand (face up, interactive on my turn)
  const myHandData = (myPlayer.hand || []).map(getCardData).filter(Boolean);
  renderHand(myHandData, LAYOUT.p1hand, true, isMyTurn, myLockedTypes);

  // Opponent's hand (face down, but face-up if handRevealed)
  const oppHandCount = (oppPlayer.hand || []).length;
  if (oppPlayer.handRevealed) {
    const oppHandData = (oppPlayer.hand || []).map(getCardData).filter(Boolean);
    renderHand(oppHandData, LAYOUT.p2hand, true, false, []);
  } else {
    renderHand(oppHandCount, LAYOUT.p2hand, false, false, []);
  }

  // FP slots — show lock status
  const myFPLocked  = (myPlayer.activeEffects  || []).some(e => e.type === 'lock_foulplay_slot' && (e.durationTurns || 0) > 0);
  const oppFPLocked = (oppPlayer.activeEffects || []).some(e => e.type === 'lock_foulplay_slot' && (e.durationTurns || 0) > 0);
  L.play.destroyChildren();
  const myFP  = makeFoulPlaySlot(LAYOUT.p1fp, 'MY FOUL PLAY', !!myPlayer.foulPlaySlot, myFPLocked);
  const oppFP = makeFoulPlaySlot(LAYOUT.p2fp, 'OPP FOUL PLAY', !!oppPlayer.foulPlaySlot, oppFPLocked);
  L.play.add(myFP);
  L.play.add(oppFP);
  L.play.draw();

  clearDisconnect();
}

// ── Board init ─────────────────────────────────────────────────────────────

function initBoard() {
  drawBackground();
  buildAspectTable();
  buildRoundInfo();
  buildPlayerLabels();
  buildActionButtons();
  buildLog();
  buildTicker(window.HEADLINES || ['Presidency Run — Live News Ticker']);
  L.board.draw();
  L.ui.draw();
  console.log('[Konva] Board ready');
}

// ── Socket event wiring ────────────────────────────────────────────────────

window.client.on('session_restored', ({ playerRole, state }) => {
  if (state) {
    (state.actionLog || []).forEach(entry => appendLog(entry));
    fullRender(state);
    appendLog(`↩ Session restored as ${playerRole}`);
  }
});

window.client.on('game_start', ({ state }) => {
  fullRender(state);
  appendLog('Permainan dimulai!');
});

window.client.on('state_update', ({ state, logEntry }) => {
  fullRender(state);
  if (logEntry) appendLog(logEntry);
  const latest = state.newsLog?.[state.newsLog.length - 1];
  if (latest && latest !== window._lastNewsLog) {
    window._lastNewsLog = latest;
    appendLog('📰 ' + latest);
  }
});

window.client.on('peek_result', ({ cards }) => showPeek(cards));

window.client.on('game_over', (data) => {
  showEndScreen(data);
  appendLog(`GAME OVER — winner: ${data.finalScores?.winner || 'tie'}`);
});

window.client.on('player_disconnected', ({ playerRole }) => {
  showDisconnect(playerRole);
  appendLog(`⚠ ${playerRole} disconnected`);
});

window.client.on('error_msg', (msg) => appendLog('❌ ' + msg));

window.client.on('room_reset', () => { window.client.clearSession(); window.location.href = '/'; });

// ── Kick off preload ───────────────────────────────────────────────────────

preloadAll(
  (pct) => {
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-text');
    if (bar) bar.style.width = (pct * 100) + '%';
    if (txt) txt.textContent = `Loading... ${Math.round(pct * 100)}%`;
  },
  () => {
    const scr = document.getElementById('loading-screen');
    if (scr) scr.style.display = 'none';
    initBoard();
    applyViewportScale();

    // Restore state if session exists
    if (window.client.sessionId) {
      // session_restored fires automatically from client.js constructor
    }
  }
);
