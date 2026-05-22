// Debug game UI — plain DOM, no Konva. Replace this file with Konva later.
// client.js interface (window.client) does not change between this and the
// Konva version.

let state = null;
let myRole = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);
const roundLabel   = $('round-label');
const turnLabel    = $('turn-label');
const activeLabel  = $('active-label');
const handCards    = $('hand-cards');
const handCount    = $('hand-count');
const handArea     = $('hand-area');
const actionsBar   = $('actions-bar');
const btnActivateFP = $('btn-activate-fp');
const btnEndTurn   = $('btn-end-turn');
const logPanel     = $('log-panel');
const peekNotice   = $('peek-notice');
const endScreen    = $('end-screen');
const gameUI       = $('game-ui');
const winnerDisplay = $('winner-display');
const scoreDisplay  = $('score-display');

// ── Helpers ───────────────────────────────────────────────────────────────────

function show(el)  { el.classList.remove('hidden'); }
function hide(el)  { el.classList.add('hidden'); }

function appendLog(msg) {
  const div = document.createElement('div');
  div.className = 'log-entry';
  div.textContent = msg;
  logPanel.appendChild(div);
  logPanel.scrollTop = logPanel.scrollHeight;
}

function renderAspects(containerId, aspects) {
  const el = $(containerId);
  el.innerHTML = Object.entries(aspects)
    .map(([name, val]) => `
      <div class="aspect-row">
        <span>${name}</span>
        <span class="aspect-val">${val.toFixed ? val.toFixed(1) : val}</span>
      </div>`)
    .join('');
}

function renderEffects(containerId, effects) {
  const el = $(containerId);
  if (!effects || effects.length === 0) { el.textContent = ''; return; }
  el.textContent = effects
    .map(e => `${e.sourceCard || e.type}(${e.durationTurns ?? '∞'})`)
    .join(' · ');
}

// ── Main render ───────────────────────────────────────────────────────────────

function renderState(s) {
  state = s;
  const p1 = s.players.p1;
  const p2 = s.players.p2;

  // Status bar
  const isSD = s.isSuddenDeath ? ' ⚡SUDDEN DEATH' : '';
  roundLabel.textContent = `Round ${s.round} / 7${isSD}`;
  turnLabel.textContent  = `Turn ${s.turn}`;
  activeLabel.textContent = `${s.activePlayer === 'p1' ? 'Player 1' : 'Player 2'} bermain`;

  // Player panels
  $('p1-label').textContent = `P1 — ${p1.presidentId || '?'}`;
  $('p2-label').textContent = `P2 — ${p2.presidentId || '?'}`;
  renderAspects('p1-aspects', p1.aspects);
  renderAspects('p2-aspects', p2.aspects);
  renderEffects('p1-effects', p1.activeEffects);
  renderEffects('p2-effects', p2.activeEffects);

  $('p1-deck').textContent  = `Deck: ${p1.deck.length}`;
  $('p1-hand-size').textContent = `Hand: ${p1.hand.length}`;
  $('p1-fp').textContent    = p1.foulPlaySlot ? '⚡ FP loaded' : 'FP: —';
  $('p2-deck').textContent  = `Deck: ${p2.deck.length}`;
  $('p2-hand-size').textContent = `Hand: ${p2.hand.length}`;
  $('p2-fp').textContent    = p2.foulPlaySlot ? '⚡ FP loaded' : 'FP: —';

  // Highlight active player panel
  $('panel-p1').classList.toggle('active', s.activePlayer === 'p1');
  $('panel-p2').classList.toggle('active', s.activePlayer === 'p2');

  // Hand — only show to the active player (me)
  const isMyTurn = myRole === s.activePlayer;
  handArea.style.opacity = isMyTurn ? '1' : '0.4';
  btnEndTurn.disabled = !isMyTurn;

  if (isMyTurn) {
    renderHand(s.players[myRole]);
    // Show activate FP button only if slot loaded
    if (s.players[myRole].foulPlaySlot) {
      show(btnActivateFP);
    } else {
      hide(btnActivateFP);
    }
  } else {
    handCards.innerHTML = '<span style="color:var(--muted);font-size:.85rem;">Menunggu giliran lawan...</span>';
    hide(btnActivateFP);
  }
}

function renderHand(playerData) {
  handCards.innerHTML = '';
  handCount.textContent = `(${playerData.hand.length})`;

  playerData.hand.forEach(instanceId => {
    // instanceId e.g. "jkw_a01_0" — strip suffix to get base id
    const baseId = instanceId.replace(/_\d+$/, '');
    // We don't have the full card object here — just use the id as label
    // In the Konva version, card registry will be loaded client-side
    const btn = document.createElement('button');
    btn.className = 'card-btn' + (baseId.includes('fp') ? ' foulplay' : '');
    btn.innerHTML = `<div class="card-type">${baseId.includes('_p') ? 'PASIF' : baseId.includes('fp') ? '⚠ FOUL PLAY' : 'AKTIF'}</div>${formatCardId(baseId)}`;
    btn.title = instanceId;

    if (baseId.includes('fp') || instanceId.replace(/_\d+$/, '').endsWith('fp01') || isFoulPlayCard(baseId)) {
      btn.addEventListener('click', () => {
        // Offer load or play
        if (state.players[myRole].foulPlaySlot) {
          // Already loaded, play it normally? Or just load (replaces)
          client.loadFoulPlay(instanceId);
        } else {
          client.loadFoulPlay(instanceId);
        }
      });
    } else {
      btn.addEventListener('click', () => client.playCard(instanceId));
    }

    handCards.appendChild(btn);
  });
}

function isFoulPlayCard(baseId) {
  // Foul play IDs end with _fp01 or _fp02
  return /_(fp)\d+$/.test(baseId);
}

function formatCardId(id) {
  // e.g. "jkw_a01" → "JKW A01"
  return id.toUpperCase().replace(/_/g, ' ');
}

// ── Socket event wiring ───────────────────────────────────────────────────────

client.on('session_restored', (data) => {
  myRole = data.playerRole;
  if (data.state) renderState(data.state);
});

client.on('game_start', (data) => {
  myRole = client.playerRole;
  renderState(data.state);
  appendLog('Permainan dimulai!');
});

client.on('state_update', (data) => {
  renderState(data.state);
  if (data.logEntry) appendLog(data.logEntry);
  if (data.state.newsLog?.length) {
    const latest = data.state.newsLog[data.state.newsLog.length - 1];
    if (latest) appendLog(`📰 ${latest}`);
  }
});

client.on('peek_result', (data) => {
  const names = data.cards.map(c => c.name || c.id).join(', ');
  peekNotice.textContent = `👁 Blusukan: ${names}`;
  show(peekNotice);
  setTimeout(() => hide(peekNotice), 8000);
});

client.on('game_over', (data) => {
  hide(gameUI);
  show(endScreen);

  const scores = data.finalScores;
  const winner = data.winner || scores?.winner;
  winnerDisplay.textContent = winner
    ? `${winner === 'p1' ? 'Player 1' : 'Player 2'} MENANG!`
    : 'SERI!';

  if (scores) {
    const weights = data.aspectWeights || {};
    const weightLines = Object.entries(weights)
      .map(([k, v]) => `${k}: ${v}%`)
      .join('  ·  ');
    scoreDisplay.innerHTML = `
      <div class="score-row">P1: <strong>${scores.p1Score}</strong></div>
      <div class="score-row">P2: <strong>${scores.p2Score}</strong></div>
      <div style="font-size:.8rem;color:var(--muted);margin-top:.75rem;">Bobot akhir: ${weightLines}</div>
    `;
  }

  appendLog(`[GAME OVER] Pemenang: ${winner || 'Seri'}`);
});

client.on('player_disconnected', (data) => {
  appendLog(`⚠ ${data.playerRole === 'p1' ? 'Player 1' : 'Player 2'} terputus dari server`);
});

client.on('error_msg', (msg) => {
  appendLog(`❌ ${msg}`);
});

// ── Button handlers ───────────────────────────────────────────────────────────

btnEndTurn.addEventListener('click', () => {
  btnEndTurn.disabled = true;
  client.endTurn();
});

btnActivateFP.addEventListener('click', () => {
  client.activateFoulPlay();
});

$('btn-play-again').addEventListener('click', () => {
  client.clearSession();
  window.location.href = '/';
});

// ── Init on page load ─────────────────────────────────────────────────────────

myRole = client.playerRole;
// session_restored will fire if session exists; game_start fires for new games.
// If page was loaded fresh after game started, session_restored provides state.
