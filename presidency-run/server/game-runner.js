import { GameState, GAME_PHASE } from '../src/game.js';
import { Player } from '../src/player.js';
import { EffectEngine } from '../src/effects.js';
import { AspectEngine } from '../src/aspects.js';
import { NewsEngine } from '../src/news.js';
import { PRESIDENT_MAP } from '../src/presidents.js';
import { CARD_REGISTRY } from '../src/cards.js';

// ── Card hydration ─────────────────────────────────────────────────────────

function hydrateCard(instanceId) {
  if (!instanceId) return null;
  // instanceId format: "jkw_a01_0" → baseId "jkw_a01"
  const baseId = instanceId.replace(/_\d+$/, '');
  const base = CARD_REGISTRY.get(baseId);
  if (!base) return null;
  return { ...base, instanceId };
}

// ── Player hydration ───────────────────────────────────────────────────────

function hydratePlayer(data) {
  // Use Object.create to skip constructor (avoids re-running applyOnInit)
  const p = Object.create(Player.prototype);
  p.name = data.role === 'p1' ? 'P1' : 'P2';
  p.president = data.presidentId ? (PRESIDENT_MAP.get(data.presidentId) || null) : null;
  p.aspects = { ...data.aspects };
  p.activeEffects = (data.activeEffects || []).map(e => ({ ...e }));
  p.foulPlaySlot = data.foulPlaySlot ? hydrateCard(data.foulPlaySlot) : null;
  p.foulPlayUses = data.foulPlayUses || 0;
  p.handRevealed = data.handRevealed || false;
  p.hand = (data.hand || []).map(hydrateCard).filter(Boolean);
  p.deck = (data.deck || []).map(hydrateCard).filter(Boolean);
  p.discard = (data.discard || []).map(hydrateCard).filter(Boolean);
  p.emptyDeckRounds = data.deckOutTurns || 0;
  return p;
}

function dehydratePlayer(p, role) {
  return {
    role,
    presidentId: p.president?.id || null,
    hand: p.hand.map(c => c.instanceId),
    deck: p.deck.map(c => c.instanceId),
    discard: p.discard.map(c => c.instanceId),
    foulPlaySlot: p.foulPlaySlot?.instanceId || null,
    foulPlayUses: p.foulPlayUses,
    handRevealed: p.handRevealed || false,
    activeEffects: p.activeEffects.map(e => ({ ...e })),
    aspects: { ...p.aspects },
    deckOutTurns: p.emptyDeckRounds || 0,
  };
}

// ── Game hydration ─────────────────────────────────────────────────────────

function hydrateGame(state) {
  const game = Object.create(GameState.prototype);
  game.players = [
    hydratePlayer(state.players.p1),
    hydratePlayer(state.players.p2),
  ];
  game.effectEngine = new EffectEngine();
  game.newsEngine = new NewsEngine();
  game.round = state.round;
  game.totalRounds = 7;
  game.turnsPerPlayer = 5;
  game.phase = GAME_PHASE.PLAYER_TURN;
  game.isSuddenDeath = state.isSuddenDeath || false;
  game.suddenDeathTurnCount = state.suddenDeathTurnCount || 0;
  game._pendingRedraw = state._pendingRedraw || null;
  game.winner = null;
  game.winReason = null;
  game.lastNewsHeadline = null;
  game.weights = { ...state.aspectWeights };

  // Map (turn, activePlayer, roundStartPlayer) → engine's turnInRound
  const firstMoverIdx = state.roundStartPlayer === 'p1' ? 0 : 1;
  const activeIdx = state.activePlayer === 'p1' ? 0 : 1;
  const isFirstMoverTurn = activeIdx === firstMoverIdx;
  game.firstMoverThisRound = firstMoverIdx;
  game.turnInRound = (state.turn - 1) * 2 + (isFirstMoverTurn ? 0 : 1);

  return game;
}

function dehydrateGame(game, prevState) {
  const currentIdx = game.currentPlayerIndex();
  const activePlayer = currentIdx === 0 ? 'p1' : 'p2';
  const roundStartPlayer = game.firstMoverThisRound === 0 ? 'p1' : 'p2';
  const turn = Math.floor(game.turnInRound / 2) + 1;

  return {
    round: game.round,
    turn,
    activePlayer,
    roundStartPlayer,
    status: game.phase === GAME_PHASE.GAME_OVER ? 'finished' : 'playing',
    isSuddenDeath: game.isSuddenDeath || false,
    suddenDeathTurnCount: game.suddenDeathTurnCount || 0,
    _pendingRedraw: game._pendingRedraw || null,
    cardPlayedThisTurn: false,
    players: {
      p1: dehydratePlayer(game.players[0], 'p1'),
      p2: dehydratePlayer(game.players[1], 'p2'),
    },
    aspectWeights: { ...game.weights },
    newsLog: prevState?.newsLog || [],
    actionLog: prevState?.actionLog || [],
    winner: game.winner,
    winReason: game.winReason,
  };
}

// ── Public: create initial game state ────────────────────────────────────

export function createInitialGameState(p1PresidentId, p2PresidentId) {
  const p1Pres = PRESIDENT_MAP.get(p1PresidentId);
  const p2Pres = PRESIDENT_MAP.get(p2PresidentId);
  if (!p1Pres || !p2Pres) throw new Error('Unknown president ID');

  // Use engine to set up (handles applyOnInit passives, deck build, deal, news)
  const game = new GameState('P1', 'P2', p1Pres, p2Pres);
  game.setup();           // builds decks, deals 5 cards each
  game.startFirstRound(); // fires first news event, sets PLAYER_TURN

  // Draw first card for the opening player
  const beginResult = game.beginTurn();

  const newsLog = game.lastNewsHeadline ? [game.lastNewsHeadline] : [];
  const actionLog = [];

  if (beginResult.passiveNotification) {
    actionLog.push(beginResult.passiveNotification.message || 'Passive triggered');
  }
  if (beginResult.drawn?.length > 0) {
    actionLog.push(`P1 drew ${beginResult.drawn.length} card(s)`);
  }

  const state = dehydrateGame(game, { newsLog, actionLog });
  state.cardPlayedThisTurn = false;
  return state;
}

// ── Public: run a game action ─────────────────────────────────────────────

export function runAction(state, action, playerRole) {
  const { type, payload = {} } = action;
  const playerIndex = playerRole === 'p1' ? 0 : 1;

  const game = hydrateGame(state);
  const currentIdx = game.currentPlayerIndex();

  if (playerIndex !== currentIdx) {
    return { error: 'Not your turn.' };
  }

  const actionLog = [...(state.actionLog || [])];
  const newsLog = [...(state.newsLog || [])];

  // ── PLAY_CARD ──────────────────────────────────────────────────────────
  if (type === 'PLAY_CARD') {
    const { cardId } = payload;
    const hand = game.players[currentIdx].hand;
    const handIdx = hand.findIndex(c => c.instanceId === cardId);
    if (handIdx === -1) return { error: 'Card not in hand.' };

    const result = game.playCard(handIdx, currentIdx);
    if (result.error === 'locked') {
      const lockLabel = result.lockedType === 'active' ? 'aktif' : 'pasif';
      return { error: `Kartu ${lockLabel} dikunci lawan!` };
    }
    if (result.error) return { error: 'Cannot play that card.' };

    actionLog.push(`${playerRole} played ${result.card.name}`);

    // Extract peek result to send privately
    let peekCards = null;
    for (const r of result.effectResults || []) {
      if (r.type === 'peek_deck') {
        peekCards = (r.cards || []).map(c => ({ id: c.id, name: c.name }));
      }
    }

    const newState = dehydrateGame(game, { newsLog, actionLog });
    newState.cardPlayedThisTurn = true;

    return { newState, logEntry: actionLog[actionLog.length - 1], isGameOver: false, winner: null, peekCards };
  }

  // ── LOAD_FOUL_PLAY ─────────────────────────────────────────────────────
  if (type === 'LOAD_FOUL_PLAY') {
    const { cardId } = payload;
    const hand = game.players[currentIdx].hand;
    const handIdx = hand.findIndex(c => c.instanceId === cardId);
    if (handIdx === -1) return { error: 'Card not in hand.' };
    if (!hand[handIdx].isFoulPlay) return { error: 'Not a Foul Play card.' };

    const ok = game.loadFoulPlay(handIdx, currentIdx);
    if (!ok) return { error: 'Could not load Foul Play.' };

    actionLog.push(`${playerRole} loaded Foul Play to slot`);
    const newState = dehydrateGame(game, { newsLog, actionLog });
    newState.cardPlayedThisTurn = state.cardPlayedThisTurn || false;

    return { newState, logEntry: actionLog[actionLog.length - 1], isGameOver: false, winner: null };
  }

  // ── ACTIVATE_FOUL_PLAY ─────────────────────────────────────────────────
  if (type === 'ACTIVATE_FOUL_PLAY') {
    const result = game.activateFoulPlay(currentIdx);

    if (result.error === 'foulplay_slot_locked') return { error: 'Foul Play slot is locked!' };
    if (result.error === 'no_foul_play_loaded') return { error: 'No Foul Play loaded.' };
    if (result.error) return { error: 'Cannot activate Foul Play.' };

    let logMsg;
    if (result.backfired) {
      logMsg = result.forfeit
        ? `${playerRole} Foul Play FORFEITED — lost on backfire!`
        : `${playerRole} Foul Play BACKFIRED! −15 ${result.backfireAspect}`;
    } else {
      logMsg = `${playerRole} activated Foul Play: ${result.card.name}`;
    }
    actionLog.push(logMsg);

    if (game.phase === GAME_PHASE.GAME_OVER) {
      const newState = dehydrateGame(game, { newsLog, actionLog });
      newState.status = 'finished';
      return { newState, logEntry: logMsg, isGameOver: true, winner: game.winner === 0 ? 'p1' : 'p2' };
    }

    const newState = dehydrateGame(game, { newsLog, actionLog });
    newState.cardPlayedThisTurn = true;

    return { newState, logEntry: logMsg, isGameOver: false, winner: null };
  }

  // ── END_TURN ───────────────────────────────────────────────────────────
  if (type === 'END_TURN') {
    const currentPlayer = game.players[currentIdx];
    if (!state.cardPlayedThisTurn && currentPlayer.hand.length > 0) {
      return { error: 'You must play a card before ending your turn.' };
    }

    const endResult = game.endTurn(currentIdx);

    // Check game over from endTurn
    if (endResult.phase === GAME_PHASE.GAME_OVER || game.phase === GAME_PHASE.GAME_OVER) {
      actionLog.push(`Game over — winner: ${game.winner === 0 ? 'p1' : 'p2'}`);
      const newState = dehydrateGame(game, { newsLog, actionLog });
      newState.status = 'finished';
      return { newState, logEntry: actionLog[actionLog.length - 1], isGameOver: true, winner: game.winner === 0 ? 'p1' : 'p2' };
    }

    // Handle round end — auto-advance (no client pause needed)
    if (endResult.phase === GAME_PHASE.ROUND_END) {
      if (game.lastNewsHeadline) newsLog.push(game.lastNewsHeadline);
      game.startNextRound();
    }

    // Draw for the next player (beginTurn)
    const beginResult = game.beginTurn();
    let beginLog = [];

    if (beginResult.passiveNotification) {
      beginLog.push(beginResult.passiveNotification.message || 'Passive triggered');
    }
    if (beginResult.pendingRedrawHandled) {
      beginLog.push(`${game.currentPlayerIndex() === 0 ? 'p1' : 'p2'} redraws ${beginResult.pendingRedrawHandled.drawn.length} cards`);
    }

    // Auto-advance if player is skipped
    if (beginResult.skipped) {
      const skippedIdx = game.currentPlayerIndex();
      const skippedRole = skippedIdx === 0 ? 'p1' : 'p2';
      beginLog.push(`${skippedRole} turn skipped`);

      const skipEndResult = game.endTurn(skippedIdx);
      if (skipEndResult.phase === GAME_PHASE.GAME_OVER || game.phase === GAME_PHASE.GAME_OVER) {
        actionLog.push(...beginLog, 'Game over');
        const newState = dehydrateGame(game, { newsLog, actionLog });
        newState.status = 'finished';
        return { newState, logEntry: 'Game over', isGameOver: true, winner: game.winner === 0 ? 'p1' : 'p2' };
      }
      if (skipEndResult.phase === GAME_PHASE.ROUND_END) {
        if (game.lastNewsHeadline) newsLog.push(game.lastNewsHeadline);
        game.startNextRound();
      }
      const nextBegin = game.beginTurn();
      if (nextBegin.passiveNotification) {
        beginLog.push(nextBegin.passiveNotification.message || 'Passive triggered');
      }
    }

    actionLog.push(...beginLog, `${playerRole} ended turn — ${game.currentPlayerIndex() === 0 ? 'p1' : 'p2'}'s turn`);

    const newState = dehydrateGame(game, { newsLog, actionLog });
    newState.cardPlayedThisTurn = false;

    return { newState, logEntry: actionLog[actionLog.length - 1], isGameOver: false, winner: null };
  }

  return { error: `Unknown action: ${type}` };
}

// ── Public: score / strip / end ───────────────────────────────────────────

export function calculateFinalScore(state) {
  const p1Score = AspectEngine.weightedScore(state.players.p1, state.aspectWeights);
  const p2Score = AspectEngine.weightedScore(state.players.p2, state.aspectWeights);
  const winner = Math.abs(p1Score - p2Score) < 0.001 ? null : p1Score > p2Score ? 'p1' : 'p2';
  return { p1Score: +p1Score.toFixed(2), p2Score: +p2Score.toFixed(2), winner };
}

export function stripWeights(state) {
  if (!state) return null;
  const { aspectWeights, ...safe } = state;
  return safe;
}

export function buildEndPayload(state) {
  const finalScores = calculateFinalScore(state);
  return { ...state, finalScores };
}
