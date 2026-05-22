import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { getLocalIP } from './network-info.js';
import * as room from './room-manager.js';
import * as runner from './game-runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const http = createServer(app);
const io = new Server(http);

const PORT = process.env.PORT || 3000;
const LOCAL_IP = getLocalIP();

app.use(express.static(join(__dirname, '..', 'public')));

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
  console.log('║      PRESIDENCY RUN — SERVER READY           ║');
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
