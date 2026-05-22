import { randomBytes } from 'crypto';

function genId(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const buf = randomBytes(len);
  for (let i = 0; i < len; i++) s += chars[buf[i] % chars.length];
  return s;
}

const room = {
  gameId: null,
  status: 'idle',
  players: {
    p1: { socketId: null, sessionId: null, presidentId: null, ready: false },
    p2: { socketId: null, sessionId: null, presidentId: null, ready: false },
  },
  gameState: null,
};

export function createRoom() {
  room.gameId = genId(6);
  room.players.p1.sessionId = genId(32);
  room.players.p1.ready = false;
  room.players.p1.presidentId = null;
  room.status = 'waiting';
  return { gameId: room.gameId, sessionId: room.players.p1.sessionId };
}

export function joinRoom(socketId) {
  if (room.status !== 'waiting') return { error: 'Room not open for joining.' };
  room.players.p2.socketId = socketId;
  room.players.p2.sessionId = genId(32);
  room.players.p2.ready = false;
  room.players.p2.presidentId = null;
  room.status = 'selecting';
  return { sessionId: room.players.p2.sessionId };
}

export function validateSession(socketId, sessionId) {
  for (const role of ['p1', 'p2']) {
    const p = room.players[role];
    if (p.socketId === socketId && p.sessionId === sessionId) return role;
  }
  return null;
}

export function updateSocketId(sessionId, newSocketId) {
  for (const role of ['p1', 'p2']) {
    if (room.players[role].sessionId === sessionId) {
      room.players[role].socketId = newSocketId;
      return role;
    }
  }
  return null;
}

export function setPresident(playerRole, presidentId) {
  room.players[playerRole].presidentId = presidentId;
  room.players[playerRole].ready = true;
  const bothReady = room.players.p1.ready && room.players.p2.ready;
  if (bothReady) room.status = 'playing';
  return { bothReady };
}

export function setGameState(state) {
  room.gameState = state;
}

export function getGameState() {
  return room.gameState;
}

export function getRoom() {
  return { ...room, players: { p1: { ...room.players.p1 }, p2: { ...room.players.p2 } } };
}

export function resetRoom() {
  room.gameId = null;
  room.status = 'idle';
  room.gameState = null;
  for (const role of ['p1', 'p2']) {
    room.players[role] = { socketId: null, sessionId: null, presidentId: null, ready: false };
  }
}

export function getRoomStatus() {
  return room.status;
}

export function getPlayerRole(socketId) {
  for (const role of ['p1', 'p2']) {
    if (room.players[role].socketId === socketId) return role;
  }
  return null;
}

export function isRoomFull() {
  return room.players.p1.socketId !== null && room.players.p2.socketId !== null;
}
