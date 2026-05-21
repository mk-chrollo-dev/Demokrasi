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
  constructor(p1Name = 'Pemain 1', p2Name = 'Pemain 2') {
    this.players = [new Player(p1Name), new Player(p2Name)];
    this.effectEngine = new EffectEngine();
    this.newsEngine = new NewsEngine();

    this.round = 1;
    this.totalRounds = 7;
    this.turnInRound = 0;       // 0–9 (10 total: 5 per player)
    this.turnsPerPlayer = 5;
    this.phase = GAME_PHASE.SETUP;
    this.firstMoverThisRound = 0; // alternates each round

    this.weights = AspectEngine.randomWeights();

    this.winner = null;
    this.winReason = null;
    this.lastNewsHeadline = null;
    this.pendingDrawForCurrentPlayer = 0;

    // Sudden death
    this.isSuddenDeath = false;
    this.suddenDeathTurnCount = 0;
  }

  // Returns the player whose turn it currently is
  currentPlayer() {
    const offset = this.turnInRound % 2 === 0 ? 0 : 1;
    const playerIndex = (this.firstMoverThisRound + offset) % 2;
    return this.players[playerIndex];
  }

  currentPlayerIndex() {
    const offset = this.turnInRound % 2 === 0 ? 0 : 1;
    return (this.firstMoverThisRound + offset) % 2;
  }

  opponentOf(playerIndex) {
    return this.players[1 - playerIndex];
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  setup() {
    for (const p of this.players) {
      p.initDeck();
      p.drawStartingHand();
    }
    this.phase = GAME_PHASE.MULLIGAN;
  }

  // Accept or reject mulligan for a player (0 or 1)
  // Returns their new hand
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

  // Step 1: draw phase for current player
  beginTurn() {
    const p = this.currentPlayer();
    const drawn = p.drawCard(1);
    this.pendingDrawForCurrentPlayer = 0;
    return drawn;
  }

  // Step 2: play a card from hand by index (0-based)
  // Returns { card, effectResults, backfired, backfireAspect, lockedType }
  playCard(handIndex, playerIndex) {
    const p = this.players[playerIndex];
    const opp = this.opponentOf(playerIndex);

    const card = p.hand[handIndex];
    if (!card) return { error: 'invalid_card' };

    // Check lock
    if (this.effectEngine.isTypeLocked(p, card.type)) {
      return { error: 'locked', lockedType: card.type };
    }

    p.playCard(handIndex);

    const effectResults = this.effectEngine.applyOnPlayEffects(card, p, opp);

    // Handle draw effects
    for (const r of effectResults) {
      if (r.type === 'draw') {
        const drawn = p.drawCard(r.delta);
        r.drawnCards = drawn;
      }
    }

    return { card, effectResults };
  }

  // Step 3: load foul play card into slot
  loadFoulPlay(handIndex, playerIndex) {
    return this.players[playerIndex].loadFoulPlay(handIndex);
  }

  // Step 4: activate foul play slot
  activateFoulPlay(playerIndex) {
    const p = this.players[playerIndex];
    const opp = this.opponentOf(playerIndex);

    const card = p.activateFoulPlay();
    if (!card) return { error: 'no_foul_play_loaded' };

    const chance = p.backfireChance();
    const roll = Math.random() * 100;
    const backfired = roll < chance;

    if (backfired) {
      // Cancel effect, pick random aspect of this player, -15
      const aspect = ASPECTS[Math.floor(Math.random() * ASPECTS.length)];
      p.aspects[aspect] = Math.max(0, p.aspects[aspect] - 15);

      // Check forfeit condition: uses >= 4 (50%+ risk) while trailing
      const myScore = AspectEngine.weightedScore(p, this.weights);
      const oppScore = AspectEngine.weightedScore(opp, this.weights);
      const trailing = myScore < oppScore;
      const highRisk = p.foulPlayUses >= 4; // after increment, index 3 → 50%

      if (highRisk && trailing) {
        this.winner = 1 - playerIndex;
        this.winReason = WIN_REASON.FOUL_PLAY_FORFEIT;
        this.phase = GAME_PHASE.GAME_OVER;
        return { card, backfired: true, backfireAspect: aspect, forfeit: true };
      }

      return { card, backfired: true, backfireAspect: aspect, forfeit: false, chance };
    }

    // Not backfired — apply card effects
    const effectResults = this.effectEngine.applyOnPlayEffects(card, p, opp);
    for (const r of effectResults) {
      if (r.type === 'draw') {
        const drawn = p.drawCard(r.delta);
        r.drawnCards = drawn;
      }
    }

    return { card, backfired: false, effectResults, chance };
  }

  // Step 5: end of turn — tick effects, advance turn counter
  endTurn(playerIndex) {
    const p = this.players[playerIndex];
    const opp = this.opponentOf(playerIndex);
    const expired = this.effectEngine.tickEffects(p, opp);

    // Clamp aspect scores
    for (const player of this.players) {
      for (const aspect of ASPECTS) {
        player.aspects[aspect] = Math.max(0, Math.min(100, player.aspects[aspect]));
      }
    }

    this.turnInRound++;
    this.pendingDrawForCurrentPlayer = 0;

    const turnsPerRound = this.turnsPerPlayer * 2;

    if (this.isSuddenDeath) {
      this.suddenDeathTurnCount++;
      return this._checkSuddenDeathEnd(expired);
    }

    if (this.turnInRound >= turnsPerRound) {
      return this._endRound(expired);
    }

    return { expired, phase: GAME_PHASE.PLAYER_TURN };
  }

  _endRound(expiredFromTick) {
    // Check deck-out
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

    if (this.round >= this.totalRounds) {
      return this._finalScoreCheck();
    }

    this.round++;
    this.turnInRound = 0;
    this.firstMoverThisRound = 1 - this.firstMoverThisRound;
    this.phase = GAME_PHASE.ROUND_END;
    this._fireNewsForRound();

    return { expired: expiredFromTick, phase: GAME_PHASE.ROUND_END };
  }

  startNextRound() {
    this.phase = GAME_PHASE.PLAYER_TURN;
  }

  _finalScoreCheck() {
    const s0 = AspectEngine.weightedScore(this.players[0], this.weights);
    const s1 = AspectEngine.weightedScore(this.players[1], this.weights);

    if (Math.abs(s0 - s1) < 0.001) {
      // Exact tie → sudden death
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
    this.weights = AspectEngine.randomWeights(); // re-randomise weights
    this.round++;
    this.turnInRound = 0;
    this.turnsPerPlayer = 5; // 5 turns each
    this.firstMoverThisRound = 1 - this.firstMoverThisRound;

    // Draw 3 for each player
    for (const p of this.players) {
      p.drawCard(3);
    }

    this.phase = GAME_PHASE.PLAYER_TURN;
  }

  _checkSuddenDeathEnd(expired) {
    const turnsPerRound = this.turnsPerPlayer * 2;
    if (this.suddenDeathTurnCount < turnsPerRound) {
      return { expired, phase: GAME_PHASE.PLAYER_TURN };
    }

    const s0 = AspectEngine.weightedScore(this.players[0], this.weights);
    const s1 = AspectEngine.weightedScore(this.players[1], this.weights);

    if (Math.abs(s0 - s1) < 0.001) {
      // Still tied — first net positive lead wins; for now declare draw → P1 wins
      this.winner = 0;
    } else {
      this.winner = s0 > s1 ? 0 : 1;
    }

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

  // For the timed news ticker (setInterval in terminal.js)
  fireNewsTick() {
    const result = this.newsEngine.fire(this.weights);
    this.weights = result.newWeights;
    this.lastNewsHeadline = result.headline;
    return result;
  }

  // Snapshot of state for rendering (no hidden info)
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
        aspects: { ...p.aspects },
        handSize: p.hand.length,
        deckSize: p.deck.length,
        discardSize: p.discard.length,
        activeEffects: p.activeEffects.map(e => ({
          name: e.name || e.type,
          durationTurns: e.durationTurns,
          sourceCard: e.sourceCard,
        })),
        foulPlayLoaded: !!p.foulPlaySlot,
        foulPlayUses: p.foulPlayUses,
      })),
      weights: revealWeights ? { ...this.weights } : null,
      lastNewsHeadline: this.lastNewsHeadline,
      winner: this.winner,
      winReason: this.winReason,
    };
  }

  // Returns the current player's hand (for display in terminal)
  currentPlayerHand() {
    return this.currentPlayer().hand;
  }

  weightedScore(playerIndex) {
    return AspectEngine.weightedScore(this.players[playerIndex], this.weights);
  }
}
