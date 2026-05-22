// Future UI: replace terminal.js with a Phaser 3 scene.
// All src/ files are UI-agnostic and need zero changes.

import { Player } from './player.js';
import { EffectEngine } from './effects.js';
import { AspectEngine } from './aspects.js';
import { NewsEngine } from './news.js';
import { ASPECTS } from './cards.js';

export const GAME_PHASE = {
  SETUP: 'setup',
  MULLIGAN: 'mulligan',
  PLAYER_TURN: 'player_turn',
  ROUND_END: 'round_end',
  GAME_OVER: 'game_over',
};

export const WIN_REASON = {
  SCORE: 'score',
  FOUL_PLAY_FORFEIT: 'foul_play_forfeit',
  DECK_OUT: 'deck_out',
  SUDDEN_DEATH: 'sudden_death',
};

export class GameState {
  // presidents: array of 2 president objects (from presidents.js), or null for test mode
  constructor(p1Name, p2Name, p1President = null, p2President = null) {
    this.players = [
      new Player(p1Name, p1President),
      new Player(p2Name, p2President),
    ];
    this.effectEngine = new EffectEngine();
    this.newsEngine = new NewsEngine();

    this.round = 1;
    this.totalRounds = 7;
    this.turnInRound = 0;
    this.turnsPerPlayer = 5;
    this.phase = GAME_PHASE.SETUP;
    this.firstMoverThisRound = 0;

    this.weights = AspectEngine.uniformWeights();

    this.winner = null;
    this.winReason = null;
    this.lastNewsHeadline = null;

    this.isSuddenDeath = false;
    this.suddenDeathTurnCount = 0;

    // Pending redraw after force_discard_hand: { playerIndex, count }
    this._pendingRedraw = null;
  }

  currentPlayerIndex() {
    const offset = this.turnInRound % 2 === 0 ? 0 : 1;
    return (this.firstMoverThisRound + offset) % 2;
  }

  currentPlayer() { return this.players[this.currentPlayerIndex()]; }
  opponentOf(playerIndex) { return this.players[1 - playerIndex]; }

  // ── Setup ──────────────────────────────────────────────────────────────────

  setup() {
    for (const p of this.players) {
      p.initDeck();
      p.drawStartingHand();
    }
    this.phase = GAME_PHASE.MULLIGAN;
  }

  doMulligan(playerIndex) {
    const p = this.players[playerIndex];
    p.deck.push(...p.hand);
    p.hand = [];
    p._shuffleDeck();
    p.drawStartingHand();
    return p.hand;
  }

  startFirstRound() {
    this._fireNewsForRound();
    this.phase = GAME_PHASE.PLAYER_TURN;
  }

  // ── Turn execution ─────────────────────────────────────────────────────────

  // Returns { drawn, skipped, passiveNotification, pendingRedrawHandled }
  beginTurn() {
    const cpIdx = this.currentPlayerIndex();
    const p = this.players[cpIdx];
    const opp = this.opponentOf(cpIdx);

    // Handle pending redraw from force_discard_hand
    let pendingRedrawHandled = null;
    if (this._pendingRedraw && this._pendingRedraw.playerIndex === cpIdx) {
      const drawn = p.drawCard(this._pendingRedraw.count);
      pendingRedrawHandled = { drawn, count: this._pendingRedraw.count };
      this._pendingRedraw = null;
    }

    // Check skip (turn lost)
    if (this.effectEngine.isSkipped(p)) {
      this.effectEngine.consumeSkip(p);
      return { drawn: [], skipped: true, passiveNotification: null, pendingRedrawHandled };
    }

    // Per-turn passive (e.g. Prabowo)
    let passiveNotification = null;
    if (p.president?.passive?.applyOnTurnStart) {
      passiveNotification = p.president.passive.applyOnTurnStart(p, opp);
    }

    // Round-first-turn passive (e.g. Soekarno, Jokowi) — fires on turn 0 or 1
    const isFirstMoverFirstTurn = this.turnInRound === 0 && cpIdx === this.firstMoverThisRound;
    const isSecondMoverFirstTurn = this.turnInRound === 1 && cpIdx !== this.firstMoverThisRound;
    if ((isFirstMoverFirstTurn || isSecondMoverFirstTurn) && p.president?.passive?.applyOnRoundFirstTurn) {
      const roundPassive = p.president.passive.applyOnRoundFirstTurn(p, opp);
      if (roundPassive) passiveNotification = roundPassive;
    }

    // Draw (blocked if block_draw is active)
    let drawn = [];
    if (!this.effectEngine.isDrawBlocked(p)) {
      drawn = p.drawCard(1);
    }

    return { drawn, skipped: false, passiveNotification, pendingRedrawHandled };
  }

  // Play a card from hand (0-based index). Returns result object.
  playCard(handIndex, playerIndex) {
    const p = this.players[playerIndex];
    const opp = this.opponentOf(playerIndex);

    const card = p.hand[handIndex];
    if (!card) return { error: 'invalid_card' };
    if (this.effectEngine.isTypeLocked(p, card.type)) {
      return { error: 'locked', lockedType: card.type };
    }

    p.playCard(handIndex);
    const effectResults = this.effectEngine.applyOnPlayEffects(card, p, opp);

    // Handle side effects that need game-level handling
    for (const r of effectResults) {
      if (r.type === 'draw') {
        r.drawnCards = p.drawCard(r.delta);
      }
      if (r.type === 'force_discard_hand') {
        opp.discardHand();
        this._pendingRedraw = { playerIndex: 1 - playerIndex, count: r.redrawCount };
        r.discarded = true;
      }
    }

    return { card, effectResults };
  }

  loadFoulPlay(handIndex, playerIndex) {
    return this.players[playerIndex].loadFoulPlay(handIndex);
  }

  activateFoulPlay(playerIndex) {
    const p = this.players[playerIndex];
    const opp = this.opponentOf(playerIndex);

    if (this.effectEngine.isFoulPlayLocked(p)) {
      return { error: 'foulplay_slot_locked' };
    }

    const card = p.activateFoulPlay();
    if (!card) return { error: 'no_foul_play_loaded' };

    const chance = p.backfireChance();
    const roll = Math.random() * 100;
    const backfired = roll < chance;

    if (backfired) {
      const aspect = ASPECTS[Math.floor(Math.random() * ASPECTS.length)];
      p.aspects[aspect] = Math.max(0, p.aspects[aspect] - 15);

      const myScore = AspectEngine.weightedScore(p, this.weights);
      const oppScore = AspectEngine.weightedScore(opp, this.weights);
      const trailing = myScore < oppScore;
      const highRisk = p.foulPlayUses >= 4;

      if (highRisk && trailing) {
        this.winner = 1 - playerIndex;
        this.winReason = WIN_REASON.FOUL_PLAY_FORFEIT;
        this.phase = GAME_PHASE.GAME_OVER;
        return { card, backfired: true, backfireAspect: aspect, forfeit: true, chance };
      }

      return { card, backfired: true, backfireAspect: aspect, forfeit: false, chance };
    }

    const effectResults = this.effectEngine.applyOnPlayEffects(card, p, opp);
    for (const r of effectResults) {
      if (r.type === 'draw') r.drawnCards = p.drawCard(r.delta);
      if (r.type === 'force_discard_hand') {
        opp.discardHand();
        this._pendingRedraw = { playerIndex: 1 - playerIndex, count: r.redrawCount };
        r.discarded = true;
      }
    }

    return { card, backfired: false, effectResults, chance };
  }

  // Step 5: end of turn — tick, advance
  endTurn(playerIndex) {
    const p = this.players[playerIndex];
    const opp = this.opponentOf(playerIndex);
    const expired = this.effectEngine.tickEffects(p, opp);

    for (const player of this.players) {
      for (const aspect of ASPECTS) {
        player.aspects[aspect] = Math.max(0, Math.min(100, player.aspects[aspect]));
      }
    }

    this.turnInRound++;

    if (this.isSuddenDeath) {
      this.suddenDeathTurnCount++;
      return this._checkSuddenDeathEnd(expired);
    }

    const turnsPerRound = this.turnsPerPlayer * 2;
    if (this.turnInRound >= turnsPerRound) return this._endRound(expired);
    return { expired, phase: GAME_PHASE.PLAYER_TURN };
  }

  _endRound(expiredFromTick) {
    for (let i = 0; i < 2; i++) {
      const p = this.players[i];
      if (p.isHandAndDeckEmpty()) {
        p.emptyDeckRounds++;
        if (p.emptyDeckRounds >= 2) {
          this.winner = 1 - i;
          this.winReason = WIN_REASON.DECK_OUT;
          this.phase = GAME_PHASE.GAME_OVER;
          return { expired: expiredFromTick, phase: GAME_PHASE.GAME_OVER, deckOut: true };
        }
      } else {
        p.emptyDeckRounds = 0;
      }
    }

    if (this.round >= this.totalRounds) return this._finalScoreCheck();

    this.round++;
    this.turnInRound = 0;
    this.firstMoverThisRound = 1 - this.firstMoverThisRound;
    this.phase = GAME_PHASE.ROUND_END;
    this._fireNewsForRound();

    return { expired: expiredFromTick, phase: GAME_PHASE.ROUND_END };
  }

  startNextRound() { this.phase = GAME_PHASE.PLAYER_TURN; }

  _finalScoreCheck() {
    const s0 = AspectEngine.weightedScore(this.players[0], this.weights);
    const s1 = AspectEngine.weightedScore(this.players[1], this.weights);

    if (Math.abs(s0 - s1) < 0.001) {
      this._initSuddenDeath();
      return { phase: GAME_PHASE.PLAYER_TURN, suddenDeath: true };
    }

    this.winner = s0 > s1 ? 0 : 1;
    this.winReason = WIN_REASON.SCORE;
    this.phase = GAME_PHASE.GAME_OVER;
    return { phase: GAME_PHASE.GAME_OVER };
  }

  _initSuddenDeath() {
    this.isSuddenDeath = true;
    this.suddenDeathTurnCount = 0;
    this.weights = AspectEngine.randomWeights();
    this.round++;
    this.turnInRound = 0;
    this.turnsPerPlayer = 5;
    this.firstMoverThisRound = 1 - this.firstMoverThisRound;
    for (const p of this.players) p.drawCard(3);
    this.phase = GAME_PHASE.PLAYER_TURN;
  }

  _checkSuddenDeathEnd(expired) {
    const turnsPerRound = this.turnsPerPlayer * 2;
    if (this.suddenDeathTurnCount < turnsPerRound) {
      return { expired, phase: GAME_PHASE.PLAYER_TURN };
    }
    const s0 = AspectEngine.weightedScore(this.players[0], this.weights);
    const s1 = AspectEngine.weightedScore(this.players[1], this.weights);
    this.winner = Math.abs(s0 - s1) < 0.001 ? 0 : (s0 > s1 ? 0 : 1);
    this.winReason = WIN_REASON.SUDDEN_DEATH;
    this.phase = GAME_PHASE.GAME_OVER;
    return { phase: GAME_PHASE.GAME_OVER, expired };
  }

  _fireNewsForRound() {
    const result = this.newsEngine.fire(this.weights);
    this.weights = result.newWeights;
    this.lastNewsHeadline = result.headline;
    return result;
  }

  fireNewsTick() {
    const result = this.newsEngine.fire(this.weights);
    this.weights = result.newWeights;
    this.lastNewsHeadline = result.headline;
    return result;
  }

  toView(revealWeights = false) {
    return {
      round: this.round,
      totalRounds: this.totalRounds,
      turnInRound: this.turnInRound,
      phase: this.phase,
      isSuddenDeath: this.isSuddenDeath,
      currentPlayerIndex: this.currentPlayerIndex(),
      players: this.players.map(p => ({
        name: p.name,
        presidentId: p.president?.id ?? null,
        presidentName: p.president?.displayName ?? null,
        aspects: { ...p.aspects },
        handSize: p.hand.length,
        deckSize: p.deck.length,
        discardSize: p.discard.length,
        activeEffects: p.activeEffects.map(e => ({
          name: e.sourceCard || e.type,
          type: e.type,
          durationTurns: e.durationTurns,
          remainingUses: e.remainingUses,
          remainingCount: e.remainingCount,
        })),
        foulPlayLoaded: !!p.foulPlaySlot,
        foulPlayUses: p.foulPlayUses,
        handRevealed: p.handRevealed,
      })),
      weights: revealWeights ? { ...this.weights } : null,
      lastNewsHeadline: this.lastNewsHeadline,
      winner: this.winner,
      winReason: this.winReason,
    };
  }

  currentPlayerHand() { return this.currentPlayer().hand; }
  weightedScore(playerIndex) {
    return AspectEngine.weightedScore(this.players[playerIndex], this.weights);
  }
}
