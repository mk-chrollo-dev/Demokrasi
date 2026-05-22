// Lobby screen logic. Depends on window.client from client.js.

const PRESIDENTS = [
  { id: 'soekarno', name: 'Ir. Soekarno',    tagline: 'Bapak Proklamator',  passive: 'Orator Ulung: +2 semua aspek tiap awal ronde' },
  { id: 'soeharto', name: 'H.M. Soeharto',   tagline: 'Bapak Pembangunan',  passive: 'TVRI: amplifikasi 2× kartu aktif berikutnya' },
  { id: 'megawati', name: 'Megawati S.P.',    tagline: 'Putri Proklamator',  passive: 'Ekonomi awal +8 (mulai di 58)' },
  { id: 'prabowo',  name: 'Prabowo Subianto', tagline: 'Panglima Patriot',   passive: 'Pantang Menyerah: aspek <40 mendapat +5/giliran' },
  { id: 'jokowi',   name: 'Ir. Joko Widodo',  tagline: 'Presiden Merakyat',  passive: 'Blusukan: intip 2 kartu teratas deck lawan tiap ronde' },
];

// ── DOM refs ────────────────────────────────────────────────────────────────

const panelRole    = document.getElementById('panel-role');
const panelWaiting = document.getElementById('panel-waiting');
const panelSelect  = document.getElementById('panel-select');
const noticeRole   = document.getElementById('notice-role');
const noticeSelect = document.getElementById('notice-select');
const displayCode  = document.getElementById('display-code');
const displayIP    = document.getElementById('display-ip');
const presGrid     = document.getElementById('pres-grid');
const selectTitle  = document.getElementById('select-title');
const selectSub    = document.getElementById('select-sub');
const inputCode    = document.getElementById('input-code');

// ── Helpers ──────────────────────────────────────────────────────────────────

function show(el)  { el.classList.remove('hidden'); }
function hide(el)  { el.classList.add('hidden'); }

function setNotice(el, msg, type = 'info') {
  el.innerHTML = `<div class="notice ${type}">${msg}</div>`;
}

function buildPresidentGrid(disabled = false) {
  presGrid.innerHTML = '';
  PRESIDENTS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'president-card' + (disabled ? ' disabled' : '');
    card.dataset.id = p.id;
    card.innerHTML = `
      <img src="/assets/presidents/${p.id}.png" alt="${p.name}"
           onerror="this.style.display='none'" />
      <div class="pres-name">${p.name}</div>
      <div class="pres-tagline">${p.tagline}</div>
      <div style="font-size:.65rem;color:var(--accent);margin-top:.3rem;">${p.passive}</div>
    `;
    if (!disabled) {
      card.addEventListener('click', () => handlePresidentClick(p.id, card));
    }
    presGrid.appendChild(card);
  });
}

let selectedPresident = null;

function handlePresidentClick(presidentId, cardEl) {
  if (selectedPresident) return; // already picked
  selectedPresident = presidentId;
  cardEl.classList.add('selected');
  // Dim the rest
  presGrid.querySelectorAll('.president-card').forEach(c => {
    if (c !== cardEl) c.classList.add('disabled');
  });
  setNotice(noticeSelect, 'Presiden dipilih! Menunggu lawan...', 'success');
  client.selectPresident(presidentId);
}

// ── Socket event handlers ────────────────────────────────────────────────────

client.on('room_created', (data) => {
  if (data.demo) {
    // Demo mode: skip waiting panel, go straight to president selection
    hide(panelRole);
    show(panelSelect);
    selectTitle.textContent = 'Pilih Presidenmu — VS KOMPUTER';
    selectSub.textContent   = 'Komputer akan bermain sebagai Player 2';
    buildPresidentGrid();
    return;
  }
  hide(panelRole);
  show(panelWaiting);
  displayCode.textContent = data.gameId;
  displayIP.textContent = `http://${data.localIP}:${data.port}`;
});

client.on('room_joined', (data) => {
  hide(panelRole);
  show(panelSelect);
  selectTitle.textContent = `Kamu adalah Player 2`;
  buildPresidentGrid();
});

client.on('room_status', (data) => {
  if (data.status === 'selecting') {
    hide(panelWaiting);
    show(panelSelect);
    selectTitle.textContent = client.playerRole === 'p1' ? 'Kamu adalah Player 1' : 'Kamu adalah Player 2';
    buildPresidentGrid();
  }
});

client.on('president_picked', (data) => {
  if (data.playerRole !== client.playerRole) {
    setNotice(noticeSelect, `Lawan sudah memilih presiden. Giliranmu!`, 'info');
  }
});

client.on('president_selected', (data) => {
  // own confirmation — handled in handlePresidentClick UI
});

client.on('game_start', () => {
  window.location.href = 'game.html';
});

client.on('session_restored', (data) => {
  const status = data.roomStatus;
  if (status === 'playing' || status === 'finished') {
    window.location.href = 'game.html';
    return;
  }
  if (status === 'selecting') {
    hide(panelRole);
    show(panelSelect);
    selectTitle.textContent = `Kamu adalah ${data.playerRole === 'p1' ? 'Player 1' : 'Player 2'}`;
    buildPresidentGrid();
  }
});

client.on('player_disconnected', (data) => {
  setNotice(noticeSelect, `${data.playerRole === 'p1' ? 'Player 1' : 'Player 2'} terputus. Menunggu reconnect...`, 'error');
});

client.on('room_reset', () => {
  client.clearSession();
  selectedPresident = null;
  hide(panelWaiting);
  hide(panelSelect);
  show(panelRole);
  setNotice(noticeRole, 'Room direset.', 'info');
});

client.on('error_msg', (msg) => {
  setNotice(noticeRole, msg, 'error');
  setNotice(noticeSelect, msg, 'error');
});

// ── Button handlers ───────────────────────────────────────────────────────────

document.getElementById('btn-host').addEventListener('click', () => {
  client.createRoom();
});

document.getElementById('btn-demo').addEventListener('click', () => {
  client.clearSession();
  client.createDemo();
});

document.getElementById('btn-join').addEventListener('click', () => {
  const code = inputCode.value.trim().toUpperCase();
  if (code.length < 6) { setNotice(noticeRole, 'Masukkan kode 6 karakter.', 'error'); return; }
  client.joinRoom(code);
});

inputCode.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-join').click();
});

document.getElementById('btn-reset-waiting').addEventListener('click', () => {
  client.resetRoom();
});

// ── Auto-reconnect handling on load ──────────────────────────────────────────
// If session exists, client.js already emits reconnect_session.
// The session_restored handler above will navigate to game.html if needed.

// ── Auto-host when launched from Electron HOST button ─────────────────────
if (new URLSearchParams(window.location.search).get('autohost') === '1') {
  // Clear any stale session so reconnect doesn't re-enter an old game
  window.client.clearSession();
  // Create room once the socket connects
  window.client.socket.once('connect', () => window.client.createRoom());
}
