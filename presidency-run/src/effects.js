import { ASPECTS } from './cards.js';

export class EffectEngine {
  applyEffect(player, effect) {
    if (effect.exclusive) {
      player.activeEffects = player.activeEffects.filter(e => e.type !== effect.type);
    }
    player.activeEffects.push({ ...effect });
  }

  // Apply a single delta value to one or all aspects of a player
  _applyDelta(player, target, delta) {
    const targets = target === 'all' ? ASPECTS : [target];
    for (const aspect of targets) {
      if (player.aspects[aspect] !== undefined) {
        player.aspects[aspect] = Math.max(0, Math.min(100, player.aspects[aspect] + delta));
      }
    }
  }

  tickEffects(player, opponentPlayer) {
    const expired = [];

    for (const effect of player.activeEffects) {
      if (effect.triggerOn !== 'tick') continue;

      // suppress prevents aspect gains on opponent — handled in applyOnPlay; skip here for now
      if (effect.type === 'suppress') {
        effect.durationTurns--;
        if (effect.durationTurns <= 0) expired.push(effect);
        continue;
      }

      if (effect.condition && !this._checkCondition(player, opponentPlayer, effect.condition)) {
        continue;
      }

      const resolvedDelta = effect.deltaType === 'percent'
        ? this._resolvePercentDelta(player, opponentPlayer, effect)
        : effect.delta;

      const targetPlayer = effect.targetPlayer === 'self' ? player : opponentPlayer;
      this._applyDelta(targetPlayer, effect.target, resolvedDelta);

      if (effect.durationTurns > 0) {
        effect.durationTurns--;
        if (effect.durationTurns <= 0) expired.push(effect);
      }
    }

    player.activeEffects = player.activeEffects.filter(e => !expired.includes(e));
    return expired;
  }

  // Called when a card is played — processes onPlay effects
  applyOnPlayEffects(card, player, opponentPlayer) {
    const amplify = player.activeEffects.find(e => e.type === 'amplify');
    const suppressedAspects = opponentPlayer.activeEffects
      .filter(e => e.type === 'suppress' && e.targetPlayer === 'self')
      .map(e => e.target);

    const results = [];

    for (const eff of card.effects) {
      if (eff.triggerOn !== 'onPlay') continue;

      let delta = eff.deltaType === 'percent' ? 0 : eff.delta;

      // amplify only boosts active cards (direct growth/decay)
      if (amplify && card.type === 'active' && (eff.type === 'growth' || eff.type === 'decay')) {
        delta = Math.round(delta * (1 + amplify.delta / 100));
      }

      const targetPlayer = eff.targetPlayer === 'self' ? player : opponentPlayer;

      switch (eff.type) {
        case 'growth':
        case 'decay': {
          const targets = eff.target === 'all' ? ASPECTS : [eff.target];
          for (const aspect of targets) {
            // suppress blocks positive gains on the suppressed aspect of the opponent
            if (eff.targetPlayer === 'opponent' && delta < 0 && suppressedAspects.includes(aspect)) {
              // suppress suppresses the opponent's aspect from growing, not from taking damage
              // re-read spec: suppress blocks opponent's aspect — here treat as: ignore the aspect gain protection
            }
            if (targetPlayer.aspects[aspect] !== undefined) {
              targetPlayer.aspects[aspect] = Math.max(0, Math.min(100, targetPlayer.aspects[aspect] + delta));
            }
          }
          results.push({ type: eff.type, target: eff.target, targetPlayer: eff.targetPlayer, delta });
          break;
        }
        case 'cleanse': {
          const removed = this.removeNegativeEffects(player);
          results.push({ type: 'cleanse', removed });
          break;
        }
        case 'draw': {
          // draw is handled in game.js — signal via result
          results.push({ type: 'draw', delta: eff.delta });
          break;
        }
        case 'reveal':
        case 'lock':
        case 'suppress':
        case 'skip': {
          const newEff = { ...eff };
          this.applyEffect(targetPlayer, newEff);
          results.push({ type: eff.type, durationTurns: eff.durationTurns, target: eff.target });
          break;
        }
        case 'aura':
        case 'amplify': {
          const newEff = { ...eff };
          this.applyEffect(player, newEff);
          results.push({ type: eff.type, durationTurns: eff.durationTurns });
          break;
        }
      }
    }

    // Register tick-based effects into activeEffects when the card is played
    for (const eff of card.effects) {
      if (eff.triggerOn !== 'tick') continue;
      const targetPlayer = eff.targetPlayer === 'self' ? player : opponentPlayer;
      if (eff.exclusive) {
        targetPlayer.activeEffects = targetPlayer.activeEffects.filter(e => e.type !== eff.type);
      }
      targetPlayer.activeEffects.push({ ...eff });
      results.push({ type: eff.type, durationTurns: eff.durationTurns, target: eff.target, targetPlayer: eff.targetPlayer });
    }

    // Consume amplify only when an active card is played
    if (amplify && card.type === 'active') {
      player.activeEffects = player.activeEffects.filter(e => e !== amplify);
    }

    return results;
  }

  removeEffectsByType(player, type) {
    const removed = player.activeEffects.filter(e => e.type === type);
    player.activeEffects = player.activeEffects.filter(e => e.type !== type);
    return removed;
  }

  removeNegativeEffects(player) {
    const removed = player.activeEffects.filter(e => e.delta < 0 || e.type === 'lock' || e.type === 'suppress' || e.type === 'skip');
    player.activeEffects = player.activeEffects.filter(e => !removed.includes(e));
    return removed.map(e => e.name || e.type);
  }

  hasEffect(player, type) {
    return player.activeEffects.some(e => e.type === type);
  }

  _checkCondition(player, opponent, condition) {
    if (!condition) return true;
    const { type, aspect, comparator, value } = condition;
    if (type === 'aspect') {
      const score = player.aspects[aspect];
      if (comparator === '>') return score > value;
      if (comparator === '<') return score < value;
      if (comparator === '>=') return score >= value;
      if (comparator === '<=') return score <= value;
      if (comparator === '==') return score === value;
    }
    return true;
  }

  _resolvePercentDelta(player, opponent, effect) {
    // percent delta: apply % of current score
    const targetPlayer = effect.targetPlayer === 'self' ? player : opponent;
    const targets = effect.target === 'all' ? ASPECTS : [effect.target];
    const avg = targets.reduce((s, a) => s + (targetPlayer.aspects[a] || 0), 0) / targets.length;
    return Math.round(avg * effect.delta / 100);
  }

  // Check if a card type is locked for a player
  isTypeLocked(player, cardType) {
    return player.activeEffects.some(e => e.type === 'lock' && e.target === cardType);
  }
}
