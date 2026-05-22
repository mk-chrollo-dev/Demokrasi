// Konva.js game UI — Democracy The Game v2
// Full-width row layout, procedural card art, human-readable effects.

// ── Stage ──────────────────────────────────────────────────────────────────────
const STAGE_W = 1280;
const STAGE_H = 720;

const stage = new Konva.Stage({ container: 'konva-container', width: STAGE_W, height: STAGE_H });

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
    stage.width(STAGE_W); stage.height(STAGE_H);
    stage.scale({ x: 1, y: 1 }); stage.draw();
  }
}
window.addEventListener('resize', applyViewportScale);

const L = {
  bg:      new Konva.Layer(),
  board:   new Konva.Layer(),
  effects: new Konva.Layer(),
  hands:   new Konva.Layer(),
  play:    new Konva.Layer(),
  ui:      new Konva.Layer(),
  anim:    new Konva.Layer(),
};
Object.values(L).forEach(l => stage.add(l));

// ── Layout — full-width rows, total = 720px ────────────────────────────────────
const LAYOUT = {
  ticker:    { x: 0, y: 0,   w: 1280, h: 28  },
  oppBar:    { x: 0, y: 28,  w: 1280, h: 46  },
  oppHand:   { x: 0, y: 74,  w: 1280, h: 162 },
  aspects:   { x: 0, y: 236, w: 1280, h: 122 },
  playZone:  { x: 0, y: 358, w: 1280, h: 122 },
  myHand:    { x: 0, y: 480, w: 1280, h: 178 },
  actionBar: { x: 0, y: 658, w: 1280, h: 62  },
};

const CARD = { w: 110, h: 152 };
const MINI  = { w: 82,  h: 112 };

// ── Colour palette ─────────────────────────────────────────────────────────────
const PRES_COLOR = { soekarno:'#C0392B', soeharto:'#6D8B2A', megawati:'#C0396A', prabowo:'#4A7090', jokowi:'#1A6FD4' };
const PRES_BG    = { soekarno:'#180306', soeharto:'#0A1202', megawati:'#180310', prabowo:'#06090F', jokowi:'#030A18' };

const C = {
  gold:'#D4AC0D', gold2:'#F0C930', green:'#2ECC71', red:'#E74C3C', orange:'#E67E22',
  blue:'#5DADE2', muted:'#4A5E7A', text:'#DCE6F0', bg:'#050B18', surface:'#0C1220', border:'#1A2A40',
};

function healthColor(v) { return v <= 20 ? C.red : v <= 35 ? C.orange : C.green; }
function getPresColor(id) { return PRES_COLOR[id] || C.gold; }
function getPresBg(id)    { return PRES_BG[id]    || '#0A0A1A'; }

// ── Data helpers ───────────────────────────────────────────────────────────────
function getCardData(instanceId) {
  const baseId = instanceId.replace(/_\d+$/, '');
  const card   = (window.CARD_REGISTRY || {})[baseId];
  return card ? { ...card, instanceId } : null;
}

function getEffectLines(cardData) {
  const lines = [];
  for (const e of (cardData.effects || [])) {
    const asp  = e.target === 'all' ? 'Semua aspek' : e.target;
    const sign = (e.delta || 0) > 0 ? '+' : '';
    switch (e.type) {
      case 'growth':  lines.push(`${asp} ${sign}${e.delta}`); break;
      case 'decay':   lines.push(`Lawan: ${asp} ${e.delta}`); break;
      case 'aura':    lines.push(`${asp} ${sign}${e.delta} selama ${e.durationTurns} giliran`); break;
      case 'cleanse': lines.push('Bersihkan efek negatif'); break;
      case 'draw':    lines.push(`Tarik ${e.delta} kartu`); break;
      case 'skip':    lines.push('Lawan: lewati giliran'); break;
      case 'amplify': lines.push('Kartu AKSI berikutnya ×1.5'); break;
      case 'shield':  lines.push(`Blokir efek negatif (${e.durationTurns} giliran)`); break;
      case 'multi_steal':          lines.push('Curi aspek dari lawan'); break;
      case 'swap_aspects':         lines.push('Tukar semua aspek dengan lawan'); break;
      case 'hostile_cleanse':      lines.push('Hapus efek positif lawan'); break;
      case 'force_discard_hand':   lines.push('Lawan: buang semua kartu di tangan'); break;
      case 'lock_foulplay_slot':   lines.push('Lawan: slot Foul Play terkunci'); break;
      case 'block_active_play':    lines.push(`Lawan: tidak bisa AKSI (${e.durationTurns} giliran)`); break;
      case 'block_passive_play':   lines.push(`Lawan: tidak bisa PASIF (${e.durationTurns} giliran)`); break;
      case 'block_draw':           lines.push('Lawan: tidak bisa tarik kartu'); break;
      case 'peek_deck':            lines.push('Lihat 2 kartu teratas deck lawan'); break;
      case 'nullify_next_passive': lines.push('Batalkan PASIF lawan berikutnya'); break;
      case 'copy_own_effect':      lines.push('Gandakan efek aktif sendiri'); break;
      case 'reveal_hand_permanent':lines.push('Lihat seluruh tangan lawan'); break;
      default: break;
    }
  }
  return lines;
}

const ICON_SYMBOL = {
  speech:'◉', road:'⊟', money:'◈', crowd:'◎', newspaper:'▣', handshake:'⊕',
  building:'⊞', shield:'◯', sword:'◆', heart:'♦', book:'▤', gear:'⊛',
  chart:'▲', skull:'☠', envelope:'▽', broom:'◇', lightning:'▸', star:'★', clock:'◷', flag:'⚑',
};
function getCardSymbol(cd) { return cd.isFoulPlay ? '☠' : (ICON_SYMBOL[cd.iconType] || '★'); }

// ── Toast notifications (DOM) ──────────────────────────────────────────────────
function showToast(msg, type = 'error') {
  const prev = document.getElementById('game-toast');
  if (prev) prev.remove();
  const el = document.createElement('div');
  el.id = 'game-toast';
  const col = type === 'success' ? { bg:'rgba(30,132,73,.95)', bd:'#2ECC71' }
            : type === 'info'    ? { bg:'rgba(26,111,212,.95)', bd:'#5DADE2' }
                                 : { bg:'rgba(192,57,43,.95)',  bd:'#E74C3C' };
  Object.assign(el.style, {
    position:'fixed', top:'70px', left:'50%', transform:'translateX(-50%)',
    background:col.bg, border:`2px solid ${col.bd}`, color:'#fff',
    padding:'11px 28px', borderRadius:'3px', fontFamily:'monospace',
    fontSize:'14px', fontWeight:'bold', letterSpacing:'.08em',
    zIndex:'9999', pointerEvents:'none', boxShadow:'0 4px 24px rgba(0,0,0,.7)',
    opacity:'1', transition:'opacity .4s', textAlign:'center', maxWidth:'580px',
    textTransform:'uppercase',
  });
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 2800);
}

// ── Card tooltip (DOM overlay) ─────────────────────────────────────────────────
let _tooltipEl = null;
function _ensureTooltip() {
  if (_tooltipEl) return _tooltipEl;
  _tooltipEl = document.createElement('div');
  Object.assign(_tooltipEl.style, {
    position:'fixed', zIndex:'9999', pointerEvents:'none',
    background:'#08101C', border:'1px solid #1A6FD4', borderRadius:'4px',
    padding:'12px 14px', maxWidth:'250px', fontFamily:'monospace',
    fontSize:'12px', color:C.text, lineHeight:'1.6',
    boxShadow:'0 4px 24px rgba(0,0,0,.85)', display:'none',
  });
  document.body.appendChild(_tooltipEl);
  return _tooltipEl;
}
function showCardTooltip(cd, mx, my) {
  const el = _ensureTooltip();
  const typeColor = cd.isFoulPlay ? C.red : cd.type === 'active' ? C.blue : C.green;
  const typeLabel = cd.isFoulPlay ? '☠ FOUL PLAY — Berisiko tinggi!' : cd.type === 'active' ? '⚡ AKSI — Berlaku langsung' : '⏱ PASIF — Efek berlanjut';
  const lines = getEffectLines(cd);
  el.innerHTML =
    `<div style="color:${C.gold};font-weight:bold;font-size:13px;margin-bottom:5px">${cd.name || ''}</div>` +
    `<div style="color:${typeColor};font-size:10px;margin-bottom:8px;letter-spacing:.08em">${typeLabel}</div>` +
    (lines.length ? `<div style="border-top:1px solid #1A2A40;padding-top:8px">${lines.map(l =>
      `<div style="color:${l.startsWith('Lawan') ? C.red : C.green};margin-bottom:2px">${l}</div>`
    ).join('')}</div>` : '') +
    (cd.description ? `<div style="color:#506070;font-size:10px;margin-top:8px;border-top:1px solid #111;padding-top:6px">${cd.description}</div>` : '');
  el.style.display = 'block';
  _moveTooltip(mx, my);
}
function _moveTooltip(mx, my) {
  if (!_tooltipEl || _tooltipEl.style.display === 'none') return;
  const pad = 14, tw = _tooltipEl.offsetWidth, th = _tooltipEl.offsetHeight;
  let lx = mx + pad, ly = my - th / 2;
  if (lx + tw > window.innerWidth)  lx = mx - tw - pad;
  if (ly < 4) ly = 4;
  if (ly + th > window.innerHeight) ly = window.innerHeight - th - 4;
  _tooltipEl.style.left = lx + 'px'; _tooltipEl.style.top = ly + 'px';
}
function hideCardTooltip() { if (_tooltipEl) _tooltipEl.style.display = 'none'; }

// ── Background ─────────────────────────────────────────────────────────────────
function drawBackground() {
  L.bg.add(new Konva.Rect({ x:0, y:0, width:STAGE_W, height:STAGE_H, fill:'#050B18' }));
  for (let x = 0; x < STAGE_W; x += 40)
    L.bg.add(new Konva.Line({ points:[x,0,x,STAGE_H], stroke:'rgba(26,42,64,.25)', strokeWidth:1, listening:false }));
  for (let y = 0; y < STAGE_H; y += 40)
    L.bg.add(new Konva.Line({ points:[0,y,STAGE_W,y], stroke:'rgba(26,42,64,.25)', strokeWidth:1, listening:false }));
  // Section dividers
  [LAYOUT.oppHand.y, LAYOUT.aspects.y, LAYOUT.playZone.y, LAYOUT.myHand.y, LAYOUT.actionBar.y].forEach(dy => {
    L.bg.add(new Konva.Line({ points:[0,dy,STAGE_W,dy], stroke:'#1A2A40', strokeWidth:1, listening:false }));
  });
  // Vignette
  L.bg.add(new Konva.Rect({
    x:0, y:0, width:STAGE_W, height:STAGE_H, listening:false,
    fillRadialGradientStartPoint:{x:STAGE_W/2,y:STAGE_H/2}, fillRadialGradientStartRadius:0,
    fillRadialGradientEndPoint:{x:STAGE_W/2,y:STAGE_H/2}, fillRadialGradientEndRadius:STAGE_W*.72,
    fillRadialGradientColorStops:[0,'rgba(0,0,0,0)',.5,'rgba(0,0,0,0)',1,'rgba(0,0,10,.5)'],
  }));
  L.bg.draw();
}

// ── Card component ──────────────────────────────────────────────────────────────
function makeCard(cardData, faceUp = true, interactive = false, onClick = null, dimmed = false) {
  const g = new Konva.Group({ width:CARD.w, height:CARD.h, listening: faceUp && interactive });

  if (!faceUp || !cardData) {
    // Card back — diagonal pattern
    g.add(new Konva.Rect({ width:CARD.w, height:CARD.h, fill:'#070818', stroke:'#18104A', strokeWidth:2, cornerRadius:5 }));
    for (let d = -CARD.h; d < CARD.w + CARD.h; d += 10)
      g.add(new Konva.Line({ points:[d,0,d+CARD.h,CARD.h], stroke:'#0C0A20', strokeWidth:1, listening:false }));
    const cx = CARD.w/2, cy = CARD.h/2;
    g.add(new Konva.RegularPolygon({ x:cx, y:cy, sides:4, radius:14, fill:'transparent', stroke:'#1E145A', strokeWidth:1, rotation:45 }));
    g.add(new Konva.Text({ x:cx-8, y:cy-10, width:16, text:'✦', fontSize:14, fontFamily:'monospace', fill:'#2A1870', align:'center' }));
    return g;
  }

  const presId    = cardData.owner || 'soekarno';
  const presColor = getPresColor(presId);
  const presBg    = getPresBg(presId);
  const isFP      = cardData.isFoulPlay;
  const isActive  = cardData.type === 'active';

  // Background
  g.add(new Konva.Rect({ width:CARD.w, height:CARD.h, fill:presBg,
    stroke: isFP ? '#7A0000' : presColor, strokeWidth: isFP ? 3 : 2, cornerRadius:5 }));

  // Type header strip (22px)
  const hdrFill  = isFP ? '#3A0000' : isActive ? '#08182A' : '#081A10';
  const hdrColor = isFP ? '#FF5555' : isActive ? C.blue   : C.green;
  const hdrText  = isFP ? '☠  FOUL PLAY'         : isActive ? '⚡  AKSI'  : '⏱  PASIF';
  g.add(new Konva.Rect({ x:0, y:0, width:CARD.w, height:22, fill:hdrFill, cornerRadius:[5,5,0,0] }));
  g.add(new Konva.Text({ x:0, y:5, width:CARD.w, text:hdrText,
    fontSize:9, fontFamily:'monospace', fontStyle:'bold', fill:hdrColor, align:'center' }));

  // Art area: large symbol (22–66px)
  g.add(new Konva.Text({ x:0, y:24, width:CARD.w, text:getCardSymbol(cardData),
    fontSize:30, fontFamily:'monospace', fill: isFP ? '#CC2222' : presColor, align:'center', opacity:.9 }));

  // Effect summary (66–106px)
  const lines = getEffectLines(cardData);
  if (lines[0]) {
    const lineColor = (lines[0].startsWith('Lawan') || (lines[0].match(/-\d/))) ? C.red : C.green;
    g.add(new Konva.Text({ x:4, y:64, width:CARD.w-8, text:lines[0],
      fontSize:11, fontFamily:'monospace', fontStyle:'bold', fill:lineColor,
      align:'center', wrap:'none', ellipsis:true }));
  }
  if (lines[1]) {
    const lineColor = (lines[1].startsWith('Lawan') || (lines[1].match(/-\d/))) ? '#C0392B' : '#27AE60';
    g.add(new Konva.Text({ x:4, y:79, width:CARD.w-8, text:lines[1],
      fontSize:9, fontFamily:'monospace', fill:lineColor,
      align:'center', wrap:'none', ellipsis:true }));
  }
  if (lines.length > 2) {
    g.add(new Konva.Text({ x:4, y:92, width:CARD.w-8,
      text:`+ ${lines.length - 2} efek lagi…`,
      fontSize:8, fontFamily:'monospace', fill:C.muted, align:'center' }));
  }

  // Divider + name strip (106–152px)
  g.add(new Konva.Line({ points:[8,106,CARD.w-8,106], stroke:presColor, strokeWidth:1, opacity:.3 }));
  g.add(new Konva.Rect({ x:0, y:108, width:CARD.w, height:CARD.h-108, fill:'rgba(0,0,0,.75)', cornerRadius:[0,0,4,4] }));
  g.add(new Konva.Text({ x:3, y:112, width:CARD.w-6, height:CARD.h-114,
    text:cardData.name || '', fontSize:9, fontFamily:'monospace', fontStyle:'bold',
    fill: isFP ? '#FF7070' : C.gold, align:'center', wrap:'word', ellipsis:true }));

  // Dimmed overlay
  if (dimmed) {
    g.add(new Konva.Rect({ width:CARD.w, height:CARD.h, fill:'rgba(0,0,0,.6)', cornerRadius:5 }));
  }

  if (interactive && onClick) {
    g.on('mouseover', (e) => {
      document.body.style.cursor = 'pointer';
      g.to({ scaleX:1.1, scaleY:1.1, offsetX:CARD.w*.05, offsetY:CARD.h*.05, duration:.1 });
      showCardTooltip(cardData, e.evt.clientX, e.evt.clientY);
      L.hands.draw();
    });
    g.on('mousemove', (e) => _moveTooltip(e.evt.clientX, e.evt.clientY));
    g.on('mouseout', () => {
      document.body.style.cursor = 'default';
      g.to({ scaleX:1, scaleY:1, offsetX:0, offsetY:0, duration:.1 });
      hideCardTooltip();
      L.hands.draw();
    });
    g.on('click', () => onClick(cardData));
  }
  return g;
}

// ── Mini card (play zone display) ──────────────────────────────────────────────
function makeMiniCard(instanceId) {
  const g = new Konva.Group({ width:MINI.w, height:MINI.h });
  if (!instanceId) {
    g.add(new Konva.Rect({ width:MINI.w, height:MINI.h, fill:'#060D18', stroke:'#1A2A40', strokeWidth:1, cornerRadius:3, dash:[4,3] }));
    g.add(new Konva.Text({ y:MINI.h/2-10, width:MINI.w, text:'—', fontSize:16, fontFamily:'monospace', fill:'#1A2A40', align:'center' }));
    return g;
  }
  const cd = getCardData(instanceId);
  if (!cd) { g.add(new Konva.Rect({ width:MINI.w, height:MINI.h, fill:'#0A1018', stroke:'#1A2A40', strokeWidth:1, cornerRadius:3 })); return g; }

  const presColor = getPresColor(cd.owner);
  const presBg    = getPresBg(cd.owner);
  const isFP = cd.isFoulPlay;

  g.add(new Konva.Rect({ width:MINI.w, height:MINI.h, fill:presBg, stroke: isFP ? '#8B0000' : presColor, strokeWidth:2, cornerRadius:3 }));
  const hdrColor = isFP ? '#FF5555' : cd.type === 'active' ? C.blue : C.green;
  g.add(new Konva.Text({ x:0, y:3, width:MINI.w, text: isFP ? '☠ FP' : cd.type === 'active' ? '⚡ AKSI' : '⏱ PASIF',
    fontSize:8, fontFamily:'monospace', fontStyle:'bold', fill:hdrColor, align:'center' }));
  g.add(new Konva.Text({ x:0, y:16, width:MINI.w, text:getCardSymbol(cd),
    fontSize:22, fontFamily:'monospace', fill:presColor, align:'center' }));
  const lines = getEffectLines(cd);
  if (lines[0]) {
    const lc = (lines[0].startsWith('Lawan') || lines[0].match(/-\d/)) ? C.red : C.green;
    g.add(new Konva.Text({ x:2, y:42, width:MINI.w-4, text:lines[0],
      fontSize:8, fontFamily:'monospace', fill:lc, align:'center', wrap:'none', ellipsis:true }));
  }
  g.add(new Konva.Rect({ x:0, y:MINI.h-22, width:MINI.w, height:22, fill:'rgba(0,0,0,.8)', cornerRadius:[0,0,2,2] }));
  g.add(new Konva.Text({ x:2, y:MINI.h-20, width:MINI.w-4, height:20,
    text:cd.name || '', fontSize:8, fontFamily:'monospace', fontStyle:'bold',
    fill: isFP ? '#FF7070' : C.gold, align:'center', wrap:'word', ellipsis:true }));
  return g;
}

// ── Card animation ─────────────────────────────────────────────────────────────
function animateCardPlay(srcGroup, callback) {
  const abs = srcGroup.getAbsolutePosition();
  const clone = srcGroup.clone();
  clone.position({ x:abs.x, y:abs.y });
  L.anim.add(clone);
  const tx = STAGE_W/2 - CARD.w/2;
  const ty = LAYOUT.playZone.y + LAYOUT.playZone.h/2 - CARD.h/2;
  clone.to({ x:tx, y:ty, scaleX:1.15, scaleY:1.15, duration:.2, onFinish: () => {
    clone.to({ scaleX:0, scaleY:0, opacity:0, duration:.15, onFinish: () => {
      clone.destroy(); L.anim.draw(); callback();
    }});
  }});
}

// ── Hand renderer ──────────────────────────────────────────────────────────────
function renderHand(cardsOrCount, area, faceUp, interactive, lockedTypes = [], cardAlreadyPlayed = false) {
  const cls = area.y < 200 ? 'opphand' : 'myhand';
  L.hands.find('.' + cls).forEach(n => n.destroy());

  const count = faceUp ? cardsOrCount.length : cardsOrCount;
  if (count === 0) { L.hands.draw(); return; }

  const vis    = Math.min(count, 9);
  const step   = Math.min(130, (area.w - 80 - CARD.w) / Math.max(vis - 1, 1));
  const totalW = CARD.w + (vis - 1) * step;
  const startX = area.x + (area.w - totalW) / 2;
  const startY = area.y + (area.h - CARD.h) / 2;

  if (!faceUp) {
    for (let i = 0; i < vis; i++) {
      const c = makeCard(null, false);
      c.name(cls); c.x(startX + i * step); c.y(startY); L.hands.add(c);
    }
    if (count > vis) {
      L.hands.add(new Konva.Text({
        name:cls, x:startX + vis * step + 6, y:startY + CARD.h/2 - 10,
        text:`+${count - vis}`, fontSize:14, fontFamily:'monospace', fill:C.muted,
      }));
    }
    L.hands.draw(); return;
  }

  cardsOrCount.slice(0, 9).forEach((cd, i) => {
    const locked      = interactive && !cd.isFoulPlay &&
      ((cd.type === 'active'  && lockedTypes.includes('active')) ||
       (cd.type === 'passive' && lockedTypes.includes('passive')));
    const spentNonFP  = interactive && cardAlreadyPlayed && !cd.isFoulPlay;
    const canClick    = interactive && !locked && !spentNonFP;
    const dimmed      = locked || spentNonFP || (!interactive && faceUp);

    const handleClick = (c) => {
      if (!canClick) return;
      if (c.isFoulPlay) {
        window.client.loadFoulPlay(c.instanceId);
      } else {
        // Find the group among hand children for animation
        const grps = L.hands.getChildren().filter(n => n.name && n.name() === cls && n.getClassName() === 'Group');
        const grp  = grps[i];
        if (grp) animateCardPlay(grp, () => window.client.playCard(c.instanceId));
        else window.client.playCard(c.instanceId);
      }
    };

    const card = makeCard(cd, true, canClick, canClick ? handleClick : null, dimmed);

    // Status badge
    if (locked) {
      card.add(new Konva.Text({ x:0, y:CARD.h/2-9, width:CARD.w,
        text:'🔒 TERKUNCI', fontSize:9, fontFamily:'monospace', fill:C.red, align:'center' }));
    } else if (spentNonFP) {
      card.add(new Konva.Text({ x:0, y:CARD.h/2-9, width:CARD.w,
        text:'✓ SUDAH DIPUTAR', fontSize:9, fontFamily:'monospace', fill:'#6A7A8A', align:'center' }));
    } else if (interactive && cd.isFoulPlay && !window._gameState?.players?.[window.client?.playerRole]?.foulPlaySlot) {
      // FP card available to load — subtle hint
      card.add(new Konva.Text({ x:0, y:CARD.h-16, width:CARD.w,
        text:'↓ klik utk muat', fontSize:7, fontFamily:'monospace', fill:'#9B59B6', align:'center' }));
    }

    card.name(cls); card.x(startX + i * step); card.y(startY);
    L.hands.add(card);
  });
  L.hands.draw();
}

// ── Aspect table — 5 columns ───────────────────────────────────────────────────
const ASPECTS    = ['Ekonomi', 'Kesehatan', 'Keamanan', 'Pendidikan', 'Infrastruktur'];
const ASP_SYMBOL = { Ekonomi:'₿', Kesehatan:'✚', Keamanan:'⚔', Pendidikan:'✎', Infrastruktur:'⌂' };
const COL_W      = STAGE_W / 5; // 256px

const scoreTexts = { p1:{}, p2:{} };
const scoreBars  = { p1:{}, p2:{} };
let _prevAspects = null;

function spawnDelta(x, y, delta) {
  if (!delta) return;
  const sign = delta > 0 ? '+' : '';
  const txt  = sign + delta;
  const cw   = txt.length * 9 + 18, ch = 22;
  const col  = delta > 0 ? C.green : C.red;
  const g    = new Konva.Group({ x:x - cw/2, y, listening:false });
  g.add(new Konva.Rect({ width:cw, height:ch, fill:col, cornerRadius:ch/2, opacity:.88, shadowColor:col, shadowBlur:8, shadowOpacity:.55 }));
  g.add(new Konva.Text({ width:cw, height:ch, text:txt, fontSize:13, fontFamily:'monospace', fontStyle:'bold', fill:'#fff', align:'center', verticalAlign:'middle' }));
  L.anim.add(g); L.anim.draw();
  g.to({ y:y+(delta>0?-50:50), opacity:0, duration:1.2, onFinish:()=>{ g.destroy(); L.anim.draw(); }});
}

function tweenBar(node, maxW, val) {
  const tgt = Math.max(2, (Math.min(100, Math.max(0, val)) / 100) * maxW);
  if (Math.abs(node.width() - tgt) < .5) { node.width(tgt); return; }
  const t0 = Date.now(), dur = 400, s0 = node.width();
  const a = new Konva.Animation(() => {
    const p = Math.min((Date.now()-t0)/dur, 1);
    node.width(s0 + (tgt-s0)*p);
    if (p >= 1) { node.width(tgt); a.stop(); }
  }, L.board);
  a.start();
}

function tweenNum(node, tgt) {
  const s = parseInt(node.text()) || 0;
  if (s === tgt) return;
  const t0 = Date.now(), dur = 400;
  const a = new Konva.Animation(() => {
    const p = Math.min((Date.now()-t0)/dur, 1);
    node.text(String(Math.round(s + (tgt-s)*p)));
    if (p >= 1) { node.text(String(tgt)); a.stop(); }
  }, L.board);
  a.start();
}

function buildAspectTable() {
  const ay = LAYOUT.aspects.y, ah = LAYOUT.aspects.h;
  L.board.add(new Konva.Rect({ x:0, y:ay, width:STAGE_W, height:ah, fill:'rgba(5,11,24,.55)', listening:false }));

  // Row labels
  L.board.add(new Konva.Text({ x:0, y:ay+20, width:STAGE_W/2-10, text:'LAWAN', fontSize:10, fontFamily:'monospace', fill:C.muted, align:'right' }));
  L.board.add(new Konva.Text({ x:STAGE_W/2+10, y:ay+20, width:STAGE_W/2-10, text:'KAMU', fontSize:10, fontFamily:'monospace', fill:C.muted }));

  ASPECTS.forEach((asp, i) => {
    const cx = i * COL_W;
    if (i > 0) L.board.add(new Konva.Line({ points:[cx,ay+4,cx,ay+ah-4], stroke:C.border, strokeWidth:1, listening:false }));

    // Aspect name + symbol
    L.board.add(new Konva.Text({ x:cx, y:ay+4, width:COL_W,
      text:`${ASP_SYMBOL[asp]}  ${asp.toUpperCase()}`,
      fontSize:10, fontFamily:'monospace', fill:C.muted, align:'center' }));

    // Opp score
    scoreTexts.p2[asp] = new Konva.Text({ x:cx+4, y:ay+18, width:COL_W-8, text:'50',
      fontSize:28, fontFamily:'monospace', fontStyle:'bold', fill:'#fff', align:'center' });
    L.board.add(scoreTexts.p2[asp]);

    // Opp bar
    const bx = cx+10, bw = COL_W-20;
    L.board.add(new Konva.Rect({ x:bx, y:ay+52, width:bw, height:8, fill:'#0A1520', cornerRadius:2 }));
    scoreBars.p2[asp] = new Konva.Rect({ x:bx, y:ay+52, width:bw*.5, height:8, fill:C.green, cornerRadius:2 });
    L.board.add(scoreBars.p2[asp]);

    // VS divider
    L.board.add(new Konva.Text({ x:cx, y:ay+62, width:COL_W, text:'─ VS ─',
      fontSize:8, fontFamily:'monospace', fill:'#1A2A40', align:'center' }));

    // My bar
    L.board.add(new Konva.Rect({ x:bx, y:ay+74, width:bw, height:8, fill:'#0A1520', cornerRadius:2 }));
    scoreBars.p1[asp] = new Konva.Rect({ x:bx, y:ay+74, width:bw*.5, height:8, fill:C.green, cornerRadius:2 });
    L.board.add(scoreBars.p1[asp]);

    // My score
    scoreTexts.p1[asp] = new Konva.Text({ x:cx+4, y:ay+86, width:COL_W-8, text:'50',
      fontSize:28, fontFamily:'monospace', fontStyle:'bold', fill:'#fff', align:'center' });
    L.board.add(scoreTexts.p1[asp]);
  });
  L.board.draw();
}

function updateAspectScores(state) {
  const ay = LAYOUT.aspects.y;
  ASPECTS.forEach((asp, i) => {
    const p1v = state.players.p1.aspects[asp];
    const p2v = state.players.p2.aspects[asp];
    const mx  = i * COL_W + COL_W/2;
    if (_prevAspects) {
      const dp1 = p1v - (_prevAspects.p1[asp] ?? p1v);
      const dp2 = p2v - (_prevAspects.p2[asp] ?? p2v);
      if (dp1 !== 0) spawnDelta(mx, ay+86, Math.round(dp1));
      if (dp2 !== 0) spawnDelta(mx, ay+18, Math.round(dp2));
    }
    tweenNum(scoreTexts.p1[asp], p1v);
    tweenNum(scoreTexts.p2[asp], p2v);
    scoreTexts.p1[asp].fill(p1v > p2v ? C.green : p1v < p2v ? C.red : C.text);
    scoreTexts.p2[asp].fill(p2v > p1v ? C.green : p2v < p1v ? C.red : C.text);
    const bw = COL_W - 20;
    tweenBar(scoreBars.p1[asp], bw, p1v); scoreBars.p1[asp].fill(healthColor(p1v));
    tweenBar(scoreBars.p2[asp], bw, p2v); scoreBars.p2[asp].fill(healthColor(p2v));
  });
  if (!_prevAspects) _prevAspects = { p1:{}, p2:{} };
  ASPECTS.forEach(a => { _prevAspects.p1[a] = state.players.p1.aspects[a]; _prevAspects.p2[a] = state.players.p2.aspects[a]; });
  L.board.draw();
}

// ── Opponent info bar ──────────────────────────────────────────────────────────
const OB = {};
let _thinkingTimer = null;

function buildOppBar() {
  const { y, h } = LAYOUT.oppBar;
  L.board.add(new Konva.Rect({ x:0, y, width:STAGE_W, height:h, fill:'#07101C', listening:false }));

  OB.strip  = new Konva.Rect({ x:0, y, width:4, height:h, fill:C.gold });
  OB.name   = new Konva.Text({ x:12, y:y+7,  text:'LAWAN', fontSize:15, fontFamily:'monospace', fontStyle:'bold', fill:C.muted });
  OB.tag    = new Konva.Text({ x:12, y:y+26, text:'',      fontSize:10, fontFamily:'monospace', fill:'#344455' });
  OB.counts = new Konva.Text({ x:STAGE_W/2-120, y:y+14, width:240, text:'DECK: — | HAND: —', fontSize:11, fontFamily:'monospace', fill:C.muted, align:'center' });
  OB.think  = new Konva.Text({ x:STAGE_W-280, y:y+8,  width:268, text:'', fontSize:12, fontFamily:'monospace', fill:C.muted, align:'right' });
  OB.fp     = new Konva.Text({ x:STAGE_W-280, y:y+26, width:268, text:'', fontSize:10, fontFamily:'monospace', fill:'#9B59B6', align:'right' });

  [OB.strip, OB.name, OB.tag, OB.counts, OB.think, OB.fp].forEach(n => L.board.add(n));
  L.board.draw();
}

function updateOppBar(state, myRole) {
  const oppRole  = myRole === 'p1' ? 'p2' : 'p1';
  const opp      = state.players[oppRole];
  const presData = (window.PRESIDENT_DATA || []).find(p => p.id === opp.presidentId);
  const presCol  = getPresColor(opp.presidentId);
  const isOppTurn = state.activePlayer === oppRole;

  OB.strip.fill(presCol);
  OB.name.text(presData ? presData.displayName : 'LAWAN');
  OB.name.fill(isOppTurn ? C.red : '#5A6E84');
  OB.tag.text(presData ? presData.tagline : '');
  OB.counts.text(`DECK: ${(opp.deck||[]).length} | HAND: ${(opp.hand||[]).length}`);
  OB.fp.text(opp.foulPlaySlot ? '⚠ FOUL PLAY SIAP' : '');

  if (isOppTurn) {
    if (!_thinkingTimer) {
      let dots = 0;
      _thinkingTimer = setInterval(() => {
        dots = (dots+1) % 4;
        OB.think.text('Menunggu lawan' + '.'.repeat(dots));
        L.board.draw();
      }, 500);
    }
  } else {
    if (_thinkingTimer) { clearInterval(_thinkingTimer); _thinkingTimer = null; }
    OB.think.text('');
  }
  L.board.draw();
}

// ── Play zone ──────────────────────────────────────────────────────────────────
const PZ = {};
let _sdBorderAnim=null, _sdBorder=null, _sdLabel=null, _sdOverlay=null;

function buildPlayZone() {
  const { y, h } = LAYOUT.playZone;
  L.play.add(new Konva.Rect({ x:0, y, width:STAGE_W, height:h, fill:'#070E1A', listening:false }));

  // Left — opponent last card
  L.play.add(new Konva.Text({ x:20, y:y+4, text:'KARTU LAWAN', fontSize:9, fontFamily:'monospace', fill:'#2A3A50' }));
  PZ.oppCard = new Konva.Group({ x:20, y:y+18 });
  L.play.add(PZ.oppCard);

  // Centre — round info
  const cx = STAGE_W/2;
  PZ.round  = new Konva.Text({ x:cx-160, y:y+6,  width:320, text:'RONDE 1 / 7', fontSize:20, fontFamily:'monospace', fontStyle:'bold', fill:C.gold, align:'center' });
  PZ.turns  = new Konva.Text({ x:cx-160, y:y+32, width:320, text:'GILIRAN 1 / 5', fontSize:12, fontFamily:'monospace', fill:C.text, align:'center' });
  PZ.actBg  = new Konva.Rect({ x:cx-110, y:y+52, width:220, height:28, fill:'rgba(46,204,113,.1)', stroke:'#1A5C38', strokeWidth:1, cornerRadius:3 });
  PZ.actTxt = new Konva.Text({ x:cx-110, y:y+61, width:220, text:'▶ GILIRAN KAMU', fontSize:12, fontFamily:'monospace', fontStyle:'bold', fill:C.green, align:'center' });
  PZ.pips   = [];
  for (let i = 0; i < 7; i++) {
    const pip = new Konva.Circle({ x:cx-42+i*14, y:y+102, radius:5, fill:'#1A2A40', stroke:'#243550', strokeWidth:1 });
    L.play.add(pip); PZ.pips.push(pip);
  }
  [PZ.round, PZ.turns, PZ.actBg, PZ.actTxt].forEach(n => L.play.add(n));

  // Right — my last card
  const rx = STAGE_W - MINI.w - 20;
  L.play.add(new Konva.Text({ x:rx, y:y+4, width:MINI.w, text:'KARTU SAYA', fontSize:9, fontFamily:'monospace', fill:'#2A3A50', align:'right' }));
  PZ.myCard = new Konva.Group({ x:rx, y:y+18 });
  L.play.add(PZ.myCard);

  L.play.draw();
}

function updatePlayZone(state, myRole) {
  const oppRole   = myRole === 'p1' ? 'p2' : 'p1';
  const isMyTurn  = state.activePlayer === myRole;
  const isSD      = state.isSuddenDeath;

  PZ.round.text(`RONDE ${state.round}${isSD ? ' ⚡' : ''} / 7`);
  PZ.round.fill(isSD ? C.red : C.gold);
  PZ.turns.text(`GILIRAN ${state.turn} / 5`);
  PZ.actTxt.text(isMyTurn ? '▶ GILIRAN KAMU' : '◀ GILIRAN LAWAN');
  PZ.actTxt.fill(isMyTurn ? C.green : C.red);
  PZ.actBg.fill(isMyTurn ? 'rgba(46,204,113,.1)' : 'rgba(231,76,60,.1)');
  PZ.actBg.stroke(isMyTurn ? '#1A5C38' : '#6B1818');

  PZ.pips.forEach((p, i) => {
    p.fill(i < state.round-1 ? C.gold : i === state.round-1 ? C.green : '#1A2A40');
    p.radius(i === state.round-1 ? 7 : 5);
  });

  // Last played cards
  const myLastId  = state[myRole  === 'p1' ? 'lastP1Card' : 'lastP2Card'] || null;
  const oppLastId = state[oppRole === 'p1' ? 'lastP1Card' : 'lastP2Card'] || null;
  PZ.myCard.destroyChildren();  PZ.myCard.add(makeMiniCard(myLastId));
  PZ.oppCard.destroyChildren(); PZ.oppCard.add(makeMiniCard(oppLastId));

  L.play.draw();
}

// ── Action bar ─────────────────────────────────────────────────────────────────
const AB = {};
let endTurnBtn=null, activateBtn=null, _endTurnAnim=null;

function buildActionBar() {
  const { y, h } = LAYOUT.actionBar;
  L.ui.add(new Konva.Rect({ x:0, y, width:STAGE_W, height:h, fill:'#060E1A', listening:false }));

  AB.strip  = new Konva.Rect({ x:0, y, width:4, height:h, fill:C.gold });
  AB.myName = new Konva.Text({ x:12, y:y+7,  text:'PLAYER 1', fontSize:13, fontFamily:'monospace', fontStyle:'bold', fill:C.gold });
  AB.myDeck = new Konva.Text({ x:12, y:y+26, text:'DECK: — | HAND: —', fontSize:10, fontFamily:'monospace', fill:C.muted });
  AB.efx    = new Konva.Text({ x:200, y:y+4, width:600, height:54, text:'Tidak ada efek aktif',
    fontSize:9, fontFamily:'monospace', fill:'#1A2A40', wrap:'word' });
  AB.fpLbl  = new Konva.Text({ x:810, y:y+6,  width:200, text:'FOUL PLAY', fontSize:9, fontFamily:'monospace', fill:'#444', align:'center' });
  AB.fpName = new Konva.Text({ x:810, y:y+20, width:200, text:'KOSONG',    fontSize:11, fontFamily:'monospace', fontStyle:'bold', fill:'#1E2A38', align:'center' });

  // ACTIVATE FOUL PLAY button (left of end turn, only visible when FP is loaded)
  const abw = 236, abh = 46;
  activateBtn = new Konva.Group({ x:782, y:y+8, visible:false });
  activateBtn.add(new Konva.Rect({ width:abw, height:abh, fill:'#1A0508', stroke:C.red, strokeWidth:2, cornerRadius:3 }));
  activateBtn.add(new Konva.Text({ width:abw, height:abh, text:'☠  AKTIFKAN FOUL PLAY',
    fontSize:12, fontFamily:'monospace', fontStyle:'bold', fill:'#FF7070', align:'center', verticalAlign:'middle' }));
  activateBtn.on('mouseover', () => { document.body.style.cursor='pointer'; activateBtn.getChildren()[0].fill('#2A0810'); L.ui.draw(); });
  activateBtn.on('mouseout',  () => { document.body.style.cursor='default';  activateBtn.getChildren()[0].fill('#1A0508'); L.ui.draw(); });

  // END TURN button (far right)
  const bx = 1026, bw = 240, bh = 46;
  endTurnBtn = new Konva.Group({ x:bx, y:y+8 });
  endTurnBtn.add(new Konva.Rect({ width:bw, height:bh, fill:'#061A28', stroke:C.blue, strokeWidth:2, cornerRadius:3 }));
  endTurnBtn.add(new Konva.Text({ width:bw, height:bh, text:'AKHIRI GILIRAN',
    fontSize:13, fontFamily:'monospace', fontStyle:'bold', fill:C.blue, align:'center', verticalAlign:'middle' }));
  endTurnBtn.on('mouseover', () => { document.body.style.cursor='pointer'; endTurnBtn.getChildren()[0].fill('#091E2E'); L.ui.draw(); });
  endTurnBtn.on('mouseout',  () => { document.body.style.cursor='default';  endTurnBtn.getChildren()[0].fill('#061A28'); L.ui.draw(); });
  endTurnBtn.on('click', () => window.client.endTurn());
  activateBtn.on('click', () => {
    const state = window._gameState;
    const role  = window.client?.playerRole;
    const fpId  = state?.players?.[role]?.foulPlaySlot;
    const card  = fpId ? getCardData(fpId) : null;
    const uses  = state?.players?.[role]?.foulPlayUses || 0;
    const risk  = [5,15,30,50,75][Math.min(uses, 4)];
    const warn  = risk >= 50 ? '\n\n⚠ BAHAYA: kamu bisa kalah seketika!' : '';
    if (confirm(`Aktifkan Foul Play?\n${card ? '"' + card.name + '"' : ''}\n\nRisiko backfire: ${risk}%${warn}`)) {
      window.client.activateFoulPlay();
    }
  });

  [AB.strip, AB.myName, AB.myDeck, AB.efx, AB.fpLbl, AB.fpName, endTurnBtn, activateBtn].forEach(n => L.ui.add(n));
  L.ui.draw();
}

function updateActionBar(state, myRole) {
  const me        = state.players[myRole];
  const isMyTurn  = state.activePlayer === myRole;
  const presData  = (window.PRESIDENT_DATA || []).find(p => p.id === me.presidentId);
  const presCol   = getPresColor(me.presidentId);

  AB.strip.fill(presCol);
  AB.myName.text((presData ? presData.displayName : 'Player') + (isMyTurn ? '  ← GILIRAN KAMU' : ''));
  AB.myName.fill(isMyTurn ? C.gold : '#5A6E84');
  AB.myDeck.text(`DECK: ${(me.deck||[]).length} | HAND: ${(me.hand||[]).length}`);

  // Effects
  const effs = (me.activeEffects || []).filter(e => (e.durationTurns||0) > 0 || e.type === 'amplify' || e.type === 'shield');
  if (effs.length) {
    const parts = effs.slice(0,5).map(e => {
      const asp = e.target === 'all' ? 'Semua' : e.target;
      const dur = e.durationTurns > 0 ? ` [${e.durationTurns}×]` : '';
      if (e.type === 'aura')              return `⏱ ${asp} +${e.delta}/giliran${dur}`;
      if (e.type === 'amplify')           return `⚡ AKSI berikutnya ×1.5`;
      if (e.type === 'shield')            return `◯ Blokir negatif${dur}`;
      if (e.type === 'block_active_play') return `⛔ Tidak bisa AKSI${dur}`;
      if (e.type === 'block_passive_play')return `⛔ Tidak bisa PASIF${dur}`;
      return `${e.type}${dur}`;
    });
    AB.efx.text('EFEK AKTIF:  ' + parts.join('   '));
    AB.efx.fill(C.text);
  } else {
    AB.efx.text('Tidak ada efek aktif');
    AB.efx.fill('#1A2A40');
  }

  // FP slot
  const fpId     = me.foulPlaySlot;
  const fpLocked = (me.activeEffects||[]).some(e => e.type==='lock_foulplay_slot' && (e.durationTurns||0)>0);
  if (fpId) {
    const fpCard = getCardData(fpId);
    AB.fpLbl.text(fpLocked ? 'FOUL PLAY [TERKUNCI]' : 'FOUL PLAY — SIAP');
    AB.fpLbl.fill(fpLocked ? C.red : '#9B59B6');
    AB.fpName.text(fpCard ? fpCard.name : 'LOADED');
    AB.fpName.fill(fpLocked ? C.red : '#C39BD3');
  } else {
    AB.fpLbl.text('FOUL PLAY');
    AB.fpLbl.fill('#333');
    AB.fpName.text('KOSONG');
    AB.fpName.fill('#1E2838');
  }

  // End turn button pulse
  endTurnBtn.listening(isMyTurn);
  if (isMyTurn && !_endTurnAnim) {
    _endTurnAnim = new Konva.Animation((f) => {
      endTurnBtn.opacity(.75 + .25 * Math.abs(Math.sin(f.time * .003)));
    }, L.ui);
    _endTurnAnim.start();
  } else if (!isMyTurn && _endTurnAnim) {
    _endTurnAnim.stop(); _endTurnAnim = null; endTurnBtn.opacity(.3);
  }

  activateBtn.visible(isMyTurn && !!fpId && !fpLocked);
  L.ui.draw();
}

// ── News ticker ────────────────────────────────────────────────────────────────
function buildTicker(headlines) {
  const { y, h } = LAYOUT.ticker;
  L.ui.add(new Konva.Rect({ x:0, y, width:STAGE_W, height:h, fill:'#040A12', listening:false }));
  const dot = new Konva.Circle({ x:14, y:y+h/2, radius:4, fill:C.red });
  const da  = new Konva.Animation((f) => { dot.opacity(Math.sin(f.time*.004)>0?1:.2); }, L.ui);
  da.start(); L.ui.add(dot);
  L.ui.add(new Konva.Text({ x:24, y:y+h/2-5, text:'LIVE', fontSize:8, fontFamily:'monospace', fontStyle:'bold', fill:C.red }));
  const tick = new Konva.Text({ x:STAGE_W, y:y+h/2-6, text:headlines[0]||'', fontSize:12, fontFamily:'monospace', fill:'#CCCCCC', listening:false });
  L.ui.add(tick);
  let idx = 0;
  const sa = new Konva.Animation(() => {
    tick.x(tick.x() - 1.6);
    if (tick.x() < -(tick.width()+60)) { idx=(idx+1)%headlines.length; tick.text(headlines[idx]); tick.x(STAGE_W); }
  }, L.ui);
  sa.start();
}

// ── Sudden death & news flash ──────────────────────────────────────────────────
function renderEffects(state) {
  const isSD = state.isSuddenDeath;
  if (isSD && !_sdBorder) {
    _sdOverlay = new Konva.Rect({ x:0,y:0,width:STAGE_W,height:STAGE_H,fill:'rgba(192,0,0,.03)',listening:false });
    _sdBorder  = new Konva.Rect({ x:1,y:1,width:STAGE_W-2,height:STAGE_H-2,stroke:C.red,strokeWidth:6,listening:false,cornerRadius:2 });
    _sdLabel   = new Konva.Text({ x:STAGE_W/2-130, y:LAYOUT.ticker.h+6, width:260,
      text:'⚡ SUDDEN DEATH ⚡', fontSize:14, fontFamily:'monospace', fontStyle:'bold', fill:C.red, align:'center', listening:false });
    [_sdOverlay, _sdBorder, _sdLabel].forEach(n => L.effects.add(n));
    _sdBorderAnim = new Konva.Animation((f) => {
      const p = .35 + .65 * Math.abs(Math.sin(f.time*.0025));
      _sdBorder.opacity(p); _sdLabel.opacity(p); _sdOverlay.opacity(p*.4);
    }, L.effects);
    _sdBorderAnim.start();
  } else if (!isSD && _sdBorder) {
    if (_sdBorderAnim) { _sdBorderAnim.stop(); _sdBorderAnim=null; }
    [_sdBorder, _sdLabel, _sdOverlay].forEach(n => { if(n) n.destroy(); });
    _sdBorder=_sdLabel=_sdOverlay=null; L.effects.draw();
  }
}

let _newsFlashAnim=null;
function flashNewsAspect(evt) {
  if (_newsFlashAnim) _newsFlashAnim.stop();
  const idx = ASPECTS.indexOf(evt.aspect);
  if (idx < 0) return;
  const cx  = idx * COL_W;
  const col = evt.direction === 'up' ? C.orange : C.red;
  const fl  = new Konva.Group({ listening:false });
  fl.add(new Konva.Rect({ x:cx+2, y:LAYOUT.aspects.y, width:COL_W-4, height:LAYOUT.aspects.h, fill:col, opacity:.15, cornerRadius:2 }));
  L.effects.add(fl); L.effects.draw();
  const t0 = Date.now();
  _newsFlashAnim = new Konva.Animation(() => {
    const e = Date.now()-t0;
    if (e > 2800) { fl.destroy(); L.effects.draw(); _newsFlashAnim.stop(); return; }
    fl.opacity(e < 2200 ? 1 : 1-(e-2200)/600);
  }, L.effects);
  _newsFlashAnim.start();
}

// ── Peek notification ──────────────────────────────────────────────────────────
function showPeek(cards) {
  const names = cards.map(c => c?.name || '?').join(', ');
  showToast(`BLUSUKAN: Melihat kartu lawan — ${names}`, 'info');
}

// ── Log (console only in new UI) ───────────────────────────────────────────────
const logEntries = [];
function appendLog(msg) {
  logEntries.push(msg);
  if (logEntries.length > 10) logEntries.shift();
  console.log('[LOG]', msg);
}
function _flushLog() {}

// ── Disconnect overlay ─────────────────────────────────────────────────────────
let disconnectOverlay = null;
function showDisconnect(role) {
  if (disconnectOverlay) disconnectOverlay.destroy();
  disconnectOverlay = new Konva.Group();
  disconnectOverlay.add(new Konva.Rect({ x:0,y:0,width:STAGE_W,height:STAGE_H,fill:'rgba(0,0,0,.75)' }));
  disconnectOverlay.add(new Konva.Text({ x:0,y:STAGE_H/2-40,width:STAGE_W,
    text:(role==='p1'?'Player 1':'Player 2')+' terputus dari server',
    fontSize:22,fontFamily:'monospace',fontStyle:'bold',fill:C.red,align:'center' }));
  disconnectOverlay.add(new Konva.Text({ x:0,y:STAGE_H/2+4,width:STAGE_W,
    text:'Menunggu sambungan kembali…',
    fontSize:14,fontFamily:'monospace',fill:C.muted,align:'center' }));
  L.ui.add(disconnectOverlay); L.ui.draw();
}
function clearDisconnect() {
  if (disconnectOverlay) { disconnectOverlay.destroy(); disconnectOverlay=null; L.ui.draw(); }
}

// ── End screen ─────────────────────────────────────────────────────────────────
function showEndScreen(data) {
  const myRole = window.client.playerRole;
  const { finalScores, aspectWeights } = data;
  const myScore  = (finalScores?.[myRole+'Score'] ?? 0).toFixed(2);
  const oppScore = (finalScores?.[(myRole==='p1'?'p2':'p1')+'Score'] ?? 0).toFixed(2);
  const isWin    = finalScores?.winner === myRole;

  const overlay = new Konva.Rect({ x:0,y:0,width:STAGE_W,height:STAGE_H,fill:'rgba(0,0,0,0)' });
  L.ui.add(overlay); overlay.to({ fill:'rgba(0,0,0,.9)', duration:.5 });

  const pw=680, ph=Math.min(620, 80 + Object.keys(aspectWeights||{}).length*80 + 100);
  const px=(STAGE_W-pw)/2, py=Math.max(20,(STAGE_H-ph)/2);
  const panel = new Konva.Group({ opacity:0 });
  panel.add(new Konva.Rect({ x:px,y:py,width:pw,height:ph,fill:'#070D18',stroke:C.gold,strokeWidth:2,cornerRadius:6 }));
  panel.add(new Konva.Text({ x:px,y:py+16,width:pw,text:'HASIL PEMILU',
    fontSize:26,fontFamily:'monospace',fontStyle:'bold',fill:C.gold,align:'center' }));
  panel.add(new Konva.Text({ x:px,y:py+46,width:pw,text:'Perolehan Suara Berdasarkan Aspek',
    fontSize:11,fontFamily:'monospace',fill:C.muted,align:'center' }));
  L.ui.add(panel); panel.to({ opacity:1, duration:.4 });

  const aspKeys = Object.keys(aspectWeights||{});
  aspKeys.forEach((asp, i) => {
    setTimeout(() => {
      const w  = (aspectWeights[asp]||0).toFixed(0);
      const mys = parseFloat(myRole==='p1' ? (data.players?.p1?.aspects?.[asp]||0) : (data.players?.p2?.aspects?.[asp]||0));
      const ops = parseFloat(myRole==='p1' ? (data.players?.p2?.aspects?.[asp]||0) : (data.players?.p1?.aspects?.[asp]||0));
      const ry  = py+70 + i*82;
      const row = new Konva.Group({ opacity:0 });
      row.add(new Konva.Rect({ x:px+12,y:ry,width:pw-24,height:76,fill:'rgba(255,255,255,.02)',cornerRadius:3 }));
      row.add(new Konva.Text({ x:px+22,y:ry+10,text:`${ASP_SYMBOL[asp]}  ${asp}`,fontSize:14,fontFamily:'monospace',fill:C.text }));
      row.add(new Konva.Text({ x:px+22,y:ry+30,text:`Bobot: ${w}%`,fontSize:11,fontFamily:'monospace',fill:C.gold }));
      row.add(new Konva.Text({ x:px+pw-240,y:ry+10,width:214,text:`Lawan:  ${ops.toFixed(0)} poin`,fontSize:11,fontFamily:'monospace',fill:'#778899',align:'right' }));
      row.add(new Konva.Text({ x:px+pw-240,y:ry+30,width:214,text:`Kamu:   ${mys.toFixed(0)} poin`,fontSize:11,fontFamily:'monospace',fill:C.text,align:'right' }));
      const bx=px+22, bw=pw-44;
      row.add(new Konva.Rect({ x:bx,y:ry+54,width:bw,height:8,fill:'#0A1520',cornerRadius:2 }));
      row.add(new Konva.Rect({ x:bx,y:ry+54,width:Math.max(3,bw*(mys/100)),height:8,fill:healthColor(mys),cornerRadius:2 }));
      panel.add(row); row.to({ opacity:1, duration:.2 }); L.ui.draw();
    }, 350*(i+1));
  });

  setTimeout(() => {
    const rb = new Konva.Group({ opacity:0 });
    const ry = py + ph - 78;
    rb.add(new Konva.Rect({ x:px+16,y:ry,width:pw-32,height:58, fill:isWin?'#091A09':'#1A0909', stroke:isWin?C.green:C.red, strokeWidth:2, cornerRadius:4 }));
    rb.add(new Konva.Text({ x:px+16,y:ry+8,width:pw-32,
      text:isWin?'✓  MENANG!':'✗  KALAH', fontSize:24,fontFamily:'monospace',fontStyle:'bold',
      fill:isWin?C.green:C.red, align:'center' }));
    rb.add(new Konva.Text({ x:px+16,y:ry+38,width:pw-32,
      text:`Skor: ${myScore}  vs  ${oppScore}`,
      fontSize:12,fontFamily:'monospace',fill:isWin?'#27AE60':'#C0392B',align:'center' }));
    panel.add(rb); rb.to({ opacity:1, duration:.3 });
    if (myRole === 'p1') {
      const btn = new Konva.Group({ x:STAGE_W/2-100, y:py+ph+10 });
      btn.add(new Konva.Rect({ width:200,height:42,fill:'#050E1F',stroke:C.blue,strokeWidth:2,cornerRadius:3 }));
      btn.add(new Konva.Text({ width:200,height:42,text:'MAIN LAGI',fontSize:14,fontFamily:'monospace',fontStyle:'bold',fill:C.blue,align:'center',verticalAlign:'middle' }));
      btn.on('click', () => { window.client.resetRoom(); window.location.href='/'; });
      btn.on('mouseover', () => { document.body.style.cursor='pointer'; L.ui.draw(); });
      btn.on('mouseout',  () => { document.body.style.cursor='default';  L.ui.draw(); });
      panel.add(btn);
    }
    L.ui.draw();
  }, 350*(aspKeys.length+1)+500);
}

// ── Full render ─────────────────────────────────────────────────────────────────
function fullRender(state) {
  window._gameState = state;
  const myRole   = window.client?.playerRole || 'p1';
  const isMyTurn = state.activePlayer === myRole;
  const myPlayer = state.players[myRole];
  const oppRole  = myRole === 'p1' ? 'p2' : 'p1';
  const oppPlayer = state.players[oppRole];

  updateAspectScores(state);
  updatePlayZone(state, myRole);
  updateOppBar(state, myRole);
  updateActionBar(state, myRole);
  renderEffects(state);

  const myLockedTypes = [];
  if (isMyTurn) {
    if ((myPlayer.activeEffects||[]).some(e => e.type==='block_active_play'  && (e.durationTurns||0)>0)) myLockedTypes.push('active');
    if ((myPlayer.activeEffects||[]).some(e => e.type==='block_passive_play' && (e.durationTurns||0)>0)) myLockedTypes.push('passive');
  }

  const myHandData  = (myPlayer.hand||[]).map(getCardData).filter(Boolean);
  renderHand(myHandData, LAYOUT.myHand, true, isMyTurn, myLockedTypes, state.cardPlayedThisTurn);

  if (oppPlayer.handRevealed) {
    const oppHandData = (oppPlayer.hand||[]).map(getCardData).filter(Boolean);
    renderHand(oppHandData, LAYOUT.oppHand, true, false, []);
  } else {
    renderHand((oppPlayer.hand||[]).length, LAYOUT.oppHand, false, false, []);
  }

  if (state.lastNewsEvent && state.lastNewsEvent !== window._lastNewsEventShown) {
    window._lastNewsEventShown = state.lastNewsEvent;
    flashNewsAspect(state.lastNewsEvent);
  }

  clearDisconnect();
}

// ── Board init ─────────────────────────────────────────────────────────────────
function initBoard() {
  drawBackground();
  buildOppBar();
  buildAspectTable();
  buildPlayZone();
  buildActionBar();
  buildTicker(window.HEADLINES || ['Democracy The Game']);
  console.log('[Konva] Board ready v2');
}

// ── Board-ready gate ───────────────────────────────────────────────────────────
let _boardReady = false, _pendingRender = null;

function _applyPending() {
  if (!_pendingRender) return;
  const { state, logs } = _pendingRender; _pendingRender = null;
  logs.forEach(m => appendLog(m));
  if (state) fullRender(state);
}

// ── Socket event wiring ────────────────────────────────────────────────────────
window.client.on('session_restored', ({ playerRole, state }) => {
  if (!state) return;
  const logs = [`↩ Sesi dipulihkan sebagai ${playerRole}`];
  if (!_boardReady) { _pendingRender = { state, logs }; return; }
  fullRender(state); logs.forEach(m => appendLog(m));
});

window.client.on('game_start', ({ state }) => {
  const logs = ['Permainan dimulai!'];
  if (!_boardReady) { _pendingRender = { state, logs }; return; }
  fullRender(state); logs.forEach(m => appendLog(m));
});

window.client.on('state_update', ({ state, logEntry }) => {
  fullRender(state);
  if (logEntry) appendLog(logEntry);
  const latest = state.newsLog?.[state.newsLog.length-1];
  if (latest && latest !== window._lastNewsLog) { window._lastNewsLog=latest; appendLog('📰 '+latest); }
});

window.client.on('peek_result', ({ cards }) => showPeek(cards));

window.client.on('game_over', (data) => {
  showEndScreen(data);
  appendLog(`Permainan selesai — pemenang: ${data.finalScores?.winner || 'seri'}`);
});

window.client.on('player_disconnected', ({ playerRole }) => {
  showDisconnect(playerRole);
  appendLog(`⚠ ${playerRole} terputus`);
});

window.client.on('error_msg', (msg) => {
  showToast(msg, 'error');
  appendLog('❌ ' + msg);
});

window.client.on('room_reset', () => { window.client.clearSession(); window.location.href='/'; });

// ── Kick off preload ───────────────────────────────────────────────────────────
// No image assets needed — full procedural rendering.
// We still use the loading screen briefly to initialise.
(function boot() {
  const scr = document.getElementById('loading-screen');
  const bar = document.getElementById('loading-bar');
  const txt = document.getElementById('loading-text');

  if (bar) bar.style.width = '100%';
  if (txt) txt.textContent = 'Memuat permainan…';

  // Short delay so the DOM settles
  setTimeout(() => {
    if (scr) scr.style.display = 'none';
    initBoard();
    _boardReady = true;
    _flushLog();
    applyViewportScale();
    _applyPending();
  }, 300);
})();
