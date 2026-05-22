// Socket.io client wrapper. Loaded after socket.io CDN script.
// Saves session to localStorage for page refresh recovery.

class GameClient {
  constructor() {
    this.socket = io();
    this.sessionId = localStorage.getItem('pr_session');
    this.playerRole = localStorage.getItem('pr_role');
    this.gameId = localStorage.getItem('pr_gameId');
    this._handlers = {};
    this._setupSocketListeners();

    if (this.sessionId) {
      this.socket.emit('reconnect_session', { sessionId: this.sessionId });
    }
  }

  // Register event handler
  on(event, fn) { this._handlers[event] = fn; }

  _emit(event, data) {
    const fn = this._handlers[event];
    if (fn) fn(data);
  }

  _setupSocketListeners() {
    const events = [
      'room_created', 'room_joined', 'room_status', 'room_reset',
      'session_restored', 'president_selected', 'president_picked',
      'game_start', 'state_update', 'game_over',
      'peek_result', 'player_disconnected', 'error_msg',
    ];

    events.forEach(ev => {
      this.socket.on(ev, (data) => {
        if (ev === 'room_created') {
          this.sessionId = data.sessionId;
          this.playerRole = data.playerRole;
          this.gameId = data.gameId;
          localStorage.setItem('pr_session', data.sessionId);
          localStorage.setItem('pr_role', data.playerRole);
          localStorage.setItem('pr_gameId', data.gameId);
        }
        if (ev === 'room_joined') {
          this.sessionId = data.sessionId;
          this.playerRole = data.playerRole;
          localStorage.setItem('pr_session', data.sessionId);
          localStorage.setItem('pr_role', data.playerRole);
        }
        if (ev === 'room_reset' || ev === 'game_over') {
          // Keep session for reconnect; game-ui/lobby decides whether to clear
        }
        this._emit(ev, data);
      });
    });
  }

  // ── API ──────────────────────────────────────────────────────────────────
  createRoom()  { this.socket.emit('create_room'); }
  joinRoom(id)  { this.socket.emit('join_room', { gameId: id }); }

  selectPresident(presidentId) {
    this.socket.emit('select_president', { sessionId: this.sessionId, presidentId });
  }

  action(type, payload = {}) {
    this.socket.emit('action', { sessionId: this.sessionId, action: { type, payload } });
  }

  playCard(cardId)     { this.action('PLAY_CARD', { cardId }); }
  loadFoulPlay(cardId) { this.action('LOAD_FOUL_PLAY', { cardId }); }
  activateFoulPlay()   { this.action('ACTIVATE_FOUL_PLAY'); }
  endTurn()            { this.action('END_TURN'); }

  resetRoom() {
    this.socket.emit('reset_room', { sessionId: this.sessionId });
  }

  clearSession() {
    localStorage.removeItem('pr_session');
    localStorage.removeItem('pr_role');
    localStorage.removeItem('pr_gameId');
    this.sessionId = null;
    this.playerRole = null;
    this.gameId = null;
  }
}

window.client = new GameClient();
