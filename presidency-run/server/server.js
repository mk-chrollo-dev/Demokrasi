import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { getLocalIP } from './network-info.js';
import * as room from './room-manager.js';
import * as runner from './game-runner.js';
import { CARD_REGISTRY } from '../src/cards.js';
import { PRESIDENTS } from '../src/presidents.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const http = createServer(app);
const io = new Server(http);

const PORT = process.env.PORT || 3000;
const LOCAL_IP = getLocalIP();

app.use(express.static(join(__dirname, '..', 'public')));

// ── Browser data endpoints ──────────────────────────────────────────────────

function getIconType(card) {
  if (card.isFoulPlay) return 'skull';
  const t = ((card.name || '') + ' ' + (card.description || '')).toLowerCase();
  if (/pidato|orasi|ceramah|speech/.test(t)) return 'speech';
  if (/jalan|tol|rel|kereta|jembatan|road/.test(t)) return 'road';
  if (/dana|modal|investasi|fund|uang|rupiah/.test(t)) return 'money';
  if (/relawan|massa|rakyat|crowd|warga/.test(t)) return 'crowd';
  if (/media|pers|tvri|berita|koran|surat kabar/.test(t)) return 'newspaper';
  if (/koalisi|damai|diplomasi|handshake|perjanjian/.test(t)) return 'handshake';
  if (/gedung|bangunan|proyek|konstruksi/.test(t)) return 'building';
  if (/lindung|tameng|benteng|shield|pertahanan/.test(t)) return 'shield';
  if (/skandal|korupsi|serangan|fitnah|black/.test(t)) return 'sword';
  if (/sehat|dokter|medis|penyakit|kesehatan/.test(t)) return 'heart';
  if (/didik|sekolah|buku|book|pendidik|belajar/.test(t)) return 'book';
  if (/infrastruktur|gear|fasilitas|jaringan/.test(t)) return 'gear';
  if (/ekonomi|bisnis|pasar|pdb|industri/.test(t)) return 'chart';
  const effects = card.effects || [];
  if (effects.some(e => e.type === 'cleanse')) return 'broom';
  if (effects.some(e => e.type === 'draw')) return 'envelope';
  if (card.type === 'passive' && effects.some(e => e.type === 'aura' && e.delta > 0)) return 'lightning';
  if (card.type === 'active') return 'star';
  return 'clock';
}

app.get('/js/cards-browser.js', (req, res) => {
  const registry = {};
  for (const [id, card] of CARD_REGISTRY) {
    registry[id] = {
      id: card.id,
      name: card.name,
      type: card.type,
      isFoulPlay: card.isFoulPlay || false,
      owner: card.owner,
      description: card.description || '',
      iconType: getIconType(card),
      effects: (card.effects || []).map(e => ({
        type: e.type,
        delta: e.delta ?? null,
        durationTurns: e.durationTurns ?? null,
      })),
    };
  }
  const presData = PRESIDENTS.map(p => ({
    id: p.id,
    displayName: p.displayName,
    tagline: p.tagline,
    passive: p.passive?.description || '',
  }));
  res.type('application/javascript');
  res.send(
    `window.CARD_REGISTRY = ${JSON.stringify(registry)};\n` +
    `window.PRESIDENT_DATA = ${JSON.stringify(presData)};`
  );
});

const HEADLINES = [
  'Harga bahan pokok meroket, inflasi capai rekor tertinggi',
  'Ekspor batubara melonjak, cadangan devisa meningkat pesat',
  'Wabah demam berdarah menyebar ke 12 provinsi',
  'Program vaksinasi nasional raih cakupan 90 persen',
  'Bom meledak di pasar tradisional, korban berjatuhan',
  'Operasi bersih perbatasan berhasil, jalur penyelundupan ditutup',
  'Anggaran pendidikan disunat demi bayar utang luar negeri',
  'Beasiswa luar negeri dibuka untuk 10.000 pelajar berprestasi',
  'Jembatan Kalimantan runtuh, ratusan tertahan',
  'Jalan tol Trans-Sumatera resmi beroperasi penuh',
  'PHK massal di pabrik tekstil, ribuan buruh menganggur',
  'Investasi asing naik 40 persen, lapangan kerja terbuka lebar',
  'Rumah sakit kehabisan stok darah dan obat generik',
  'BPJS Kesehatan catat surplus pertama dalam sejarah',
  'Polisi terlibat jaringan narkoba lintas batas',
  'Densus 88 tangkap 30 tersangka teroris dalam sepekan',
  'Ribuan guru honorer mogok, sekolah lumpuh berhari-hari',
  'Universitas negeri raih peringkat 100 besar Asia',
  'Banjir bandang hancurkan jembatan di tiga kabupaten',
  'Proyek kereta cepat Jakarta-Surabaya dimulai',
  'Rupiah tembus Rp 18.000 per dolar, pasar saham anjlok',
  'Bank sentral stabilkan kurs, kepercayaan investor pulih',
  'Virus baru terdeteksi, WHO keluarkan peringatan dini',
  'Posyandu digital diluncurkan di 5.000 desa terpencil',
  'Konflik agraria berujung bentrokan berdarah di Kaltim',
  'Perlindungan WNI di luar negeri ditingkatkan signifikan',
  'Tawuran pelajar tewaskan dua remaja di ibukota',
  'Program makan bergizi gratis perbaiki gizi 2 juta murid',
  'Listrik padam 12 jam, industri manufaktur mati suri',
  'Sambungan internet desa capai 80 persen wilayah 3T',
];

app.get('/js/news-headlines.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.HEADLINES = ${JSON.stringify(HEADLINES)};`);
});

// Export for Electron integration (Option B: direct import)
export function startServer(port = PORT) {
  return new Promise((resolve) => {
    http.listen(port, '0.0.0.0', () => {
      printBanner(port);
      resolve({ port, localIP: LOCAL_IP });
    });
  });
}

// ── Socket.io events ────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[+] connected: ${socket.id}`);

  // ── RECONNECT ──────────────────────────────────────────────────────────
  socket.on('reconnect_session', ({ sessionId }) => {
    const playerRole = room.updateSocketId(sessionId, socket.id);
    if (!playerRole) { socket.emit('error_msg', 'Session not found.'); return; }
    socket.emit('session_restored', {
      playerRole,
      state: runner.stripWeights(room.getGameState()),
      roomStatus: room.getRoomStatus(),
    });
  });

  // ── CREATE ROOM ─────────────────────────────────────────────────────────
  socket.on('create_room', () => {
    const status = room.getRoomStatus();
    if (status !== 'idle' && status !== 'finished') {
      socket.emit('error_msg', 'A room is already active. Ask the host to reset.');
      return;
    }
    room.resetRoom();
    const { gameId, sessionId } = room.createRoom();
    room.updateSocketId(sessionId, socket.id);
    socket.emit('room_created', { gameId, sessionId, playerRole: 'p1', localIP: LOCAL_IP, port: PORT });
    console.log(`[ROOM] Created: ${gameId}`);
  });

  // ── JOIN ROOM ───────────────────────────────────────────────────────────
  socket.on('join_room', ({ gameId }) => {
    const roomData = room.getRoom();
    if (!roomData.gameId || roomData.gameId !== gameId.toUpperCase().trim()) {
      socket.emit('error_msg', 'Room not found. Check the code and try again.');
      return;
    }
    const result = room.joinRoom(socket.id);
    if (result.error) { socket.emit('error_msg', result.error); return; }
    socket.emit('room_joined', { sessionId: result.sessionId, playerRole: 'p2' });
    io.emit('room_status', { status: 'selecting', message: 'Both players connected! Select your president.' });
    console.log('[ROOM] P2 joined');
  });

  // ── SELECT PRESIDENT ────────────────────────────────────────────────────
  socket.on('select_president', ({ sessionId, presidentId }) => {
    const playerRole = room.validateSession(socket.id, sessionId);
    if (!playerRole) { socket.emit('error_msg', 'Unauthorized.'); return; }
    if (room.getRoomStatus() !== 'selecting') { socket.emit('error_msg', 'Not in selection phase.'); return; }

    const { bothReady } = room.setPresident(playerRole, presidentId);
    socket.emit('president_selected', { playerRole, presidentId });
    io.emit('president_picked', { playerRole });

    if (bothReady) {
      try {
        const roomData = room.getRoom();
        const initialState = runner.createInitialGameState(
          roomData.players.p1.presidentId,
          roomData.players.p2.presidentId,
        );
        room.setGameState(initialState);
        io.emit('game_start', { state: runner.stripWeights(initialState) });
        console.log(`[GAME] Started — P1: ${roomData.players.p1.presidentId}, P2: ${roomData.players.p2.presidentId}`);
      } catch (err) {
        console.error('[ERR] createInitialGameState:', err);
        socket.emit('error_msg', 'Failed to start game: ' + err.message);
      }
    }
  });

  // ── GAME ACTION ─────────────────────────────────────────────────────────
  socket.on('action', ({ sessionId, action }) => {
    const playerRole = room.validateSession(socket.id, sessionId);
    if (!playerRole) { socket.emit('error_msg', 'Unauthorized.'); return; }

    const state = room.getGameState();
    if (!state) { socket.emit('error_msg', 'No active game.'); return; }
    if (state.status !== 'playing') { socket.emit('error_msg', 'Game is not in progress.'); return; }
    if (state.activePlayer !== playerRole) { socket.emit('error_msg', 'Not your turn.'); return; }

    try {
      const result = runner.runAction(state, action, playerRole);
      if (result.error) { socket.emit('error_msg', result.error); return; }

      room.setGameState(result.newState);

      if (result.isGameOver) {
        const endPayload = runner.buildEndPayload(result.newState);
        io.emit('game_over', endPayload);
        console.log(`[GAME] Over — winner: ${result.winner}`);
      } else {
        if (result.peekCards) {
          socket.emit('peek_result', { cards: result.peekCards });
        }
        io.emit('state_update', {
          state: runner.stripWeights(result.newState),
          logEntry: result.logEntry,
        });
      }
    } catch (err) {
      console.error('[ERR] action:', err);
      socket.emit('error_msg', 'Server error: ' + err.message);
    }
  });

  // ── RESET ───────────────────────────────────────────────────────────────
  socket.on('reset_room', ({ sessionId }) => {
    const playerRole = room.validateSession(socket.id, sessionId);
    if (playerRole !== 'p1') { socket.emit('error_msg', 'Only the host can reset.'); return; }
    room.resetRoom();
    io.emit('room_reset', {});
    console.log('[ROOM] Reset by host');
  });

  // ── DISCONNECT ──────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const playerRole = room.getPlayerRole(socket.id);
    if (playerRole) {
      io.emit('player_disconnected', { playerRole });
      console.log(`[-] ${playerRole} disconnected`);
    }
  });
});

// ── Start (standalone mode) ────────────────────────────────────────────────

function printBanner(port) {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║    DEMOCRACY THE GAME — SERVER READY         ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Host plays at: http://localhost:${port}          ║`);
  console.log(`║  Guest joins:   http://${LOCAL_IP}:${port}        ║`);
  console.log('║                                              ║');
  console.log('║  Share the IP above with Player 2            ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
}

// Run directly when invoked as `node server/server.js`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  http.listen(PORT, '0.0.0.0', () => printBanner(PORT));
}
