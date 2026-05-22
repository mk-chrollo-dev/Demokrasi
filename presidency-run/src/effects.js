import { ASPECTS } from './cards.js';

export class EffectEngine {

  applyEffect(player, effect) {
    if (effect.exclusive) {
      player.activeEffects = player.activeEffects.filter(e => e.type !== effect.type);
    }
    player.activeEffects.push({ ...effect });
  }

  _applyDelta(player, target, delta, skipShields = false) {
    const targets = target === 'all' ? ASPECTS : [target];
    const blocked = [];
    for (const aspect of targets) {
      if (player.aspects[aspect] === undefined) continue;
      if (!skipShields && delta < 0) {
        const shield = player.activeEffects.find(
          e => e.type === 'shield' && (e.target === aspect || e.target === 'all') && e.remainingCount > 0
        );
        if (shield) {
          shield.remainingCount--;
          if (shield.remainingCount <= 0) {
            player.activeEffects = player.activeEffects.filter(e => e !== shield);
          }
          blocked.push(aspect);
          continue;
        }
      }
      player.aspects[aspect] = Math.max(0, Math.min(100, player.aspects[aspect] + delta));
    }
    return blocked;
  }

  // STATUS_TYPES: effects that persist without ticking but need duration decremented
  static STATUS_TYPES = new Set([
    'lock', 'suppress', 'reveal', 'skip',
    'block_active_play', 'block_passive_play', 'block_draw',
    'lock_foulplay_slot', 'amplify',
  ]);

  tickEffects(player, opponentPlayer) {
    const expired = [];

    for (const effect of [...player.activeEffects]) {
      // ── Tick-based effects (aura, decay-over-time) ────────────────────────
      if (effect.triggerOn === 'tick') {
        if (effect.type === 'suppress') {
          effect.durationTurns--;
          if (effect.durationTurns <= 0) expired.push(effect);
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
        continue;
      }

      // ── Status effects: decrement duration each turn ──────────────────────
      if (EffectEngine.STATUS_TYPES.has(effect.type)) {
        if (effect.durationTurns === -1) continue; // consumed on trigger, not by time
        if (effect.durationTurns > 0) {
          effect.durationTurns--;
          if (effect.durationTurns <= 0) expired.push(effect);
        }
      }
    }

    player.activeEffects = player.activeEffects.filter(e => !expired.includes(e));
    return expired;
  }

  // Called when a card is played. Returns array of result objects for terminal display.
  applyOnPlayEffects(card, player, opponentPlayer) {
    // ── Nullify check: if this player has nullify_next_passive, consume & abort ──
    if (card.type === 'passive' && !card.isFoulPlay) {
      const nullifier = player.activeEffects.find(e => e.type === 'nullify_next_passive');
      if (nullifier) {
        player.activeEffects = player.activeEffects.filter(e => e !== nullifier);
        return [{ type: 'nullified', cardName: card.name }];
      }
    }

    const amplify = player.activeEffects.find(e => e.type === 'amplify');
    const results = [];

    // ── onPlay effects ────────────────────────────────────────────────────────
    for (const eff of card.effects) {
      if (eff.triggerOn !== 'onPlay') continue;

      let delta = eff.deltaType === 'percent' ? 0 : eff.delta;

      // amplify boosts active-card growth/decay only
      if (amplify && card.type === 'active' && (eff.type === 'growth' || eff.type === 'decay')) {
        if (amplify.deltaType === 'flat') {
          delta = delta + (delta < 0 ? -amplify.delta : amplify.delta);
        } else {
          delta = Math.round(delta * (1 + amplify.delta / 100));
        }
      }

      const targetPlayer = eff.targetPlayer === 'self' ? player : opponentPlayer;

      switch (eff.type) {
        case 'growth':
        case 'decay': {
          const blocked = this._applyDelta(targetPlayer, eff.target, delta);
          results.push({ type: eff.type, target: eff.target, targetPlayer: eff.targetPlayer, delta, blocked });
          break;
        }

        case 'cleanse': {
          const removed = this.removeNegativeEffects(player);
          results.push({ type: 'cleanse', removed });
          break;
        }

        case 'draw':
          results.push({ type: 'draw', delta: eff.delta });
          break;

        case 'shield': {
          const aspects = eff.target === 'all' ? ASPECTS : [eff.target];
          for (const aspect of aspects) {
            const existing = player.activeEffects.find(e => e.type === 'shield' && e.target === aspect);
            if (existing) {
              existing.remainingCount += eff.delta;
            } else {
              player.activeEffects.push({ ...eff, target: aspect, remainingCount: eff.delta });
            }
          }
          results.push({ type: 'shield', target: eff.target, count: eff.delta });
          break;
        }

        case 'nullify_next_passive':
          opponentPlayer.activeEffects.push({ ...eff });
          results.push({ type: 'nullify_next_passive' });
          break;

        case 'lock_foulplay_slot':
          opponentPlayer.activeEffects.push({ ...eff });
          results.push({ type: 'lock_foulplay_slot', durationTurns: eff.durationTurns });
          break;

        case 'block_active_play':
        case 'block_passive_play':
        case 'block_draw':
          opponentPlayer.activeEffects.push({ ...eff });
          results.push({ type: eff.type, durationTurns: eff.durationTurns });
          break;

        case 'reveal':
        case 'lock':
        case 'suppress':
        case 'skip':
          targetPlayer.activeEffects.push({ ...eff });
          results.push({ type: eff.type, durationTurns: eff.durationTurns, target: eff.target, targetPlayer: eff.targetPlayer });
          break;

        case 'amplify':
          // aura effects are always triggerOn:'tick' — registered in the tick loop below.
          // amplify is onPlay — install it on the player's board now.
          if (eff.exclusive) player.activeEffects = player.activeEffects.filter(e => e.type !== 'amplify');
          player.activeEffects.push({ ...eff });
          results.push({ type: 'amplify', durationTurns: eff.durationTurns, remainingUses: eff.remainingUses });
          break;

        case 'nullify_effect_stack':
          opponentPlayer.activeEffects = [];
          results.push({ type: 'nullify_effect_stack' });
          break;

        case 'hostile_cleanse': {
          // Remove the single strongest positive tick effect from opponent
          const positiveEffects = opponentPlayer.activeEffects
            .filter(e => e.triggerOn === 'tick' && e.delta > 0)
            .sort((a, b) => (b.delta * b.durationTurns) - (a.delta * a.durationTurns));
          if (positiveEffects.length > 0) {
            opponentPlayer.activeEffects = opponentPlayer.activeEffects.filter(e => e !== positiveEffects[0]);
            results.push({ type: 'hostile_cleanse', removed: positiveEffects[0].sourceCard });
          } else {
            results.push({ type: 'hostile_cleanse', removed: null });
          }
          break;
        }

        case 'force_discard_hand':
          results.push({ type: 'force_discard_hand', redrawCount: eff.delta });
          break;

        case 'reveal_hand_permanent':
          opponentPlayer.handRevealed = true;
          results.push({ type: 'reveal_hand_permanent' });
          break;

        case 'swap_aspects': {
          const scores = ASPECTS.map(a => ({ a, v: opponentPlayer.aspects[a] }));
          scores.sort((x, y) => y.v - x.v);
          const high = scores[0], low = scores[scores.length - 1];
          opponentPlayer.aspects[high.a] = low.v;
          opponentPlayer.aspects[low.a] = high.v;
          results.push({ type: 'swap_aspects', from: high.a, to: low.a, highVal: high.v, lowVal: low.v });
          break;
        }

        case 'peek_deck': {
          const topN = opponentPlayer.deck.slice(-eff.delta).reverse().map(c => c.name);
          results.push({ type: 'peek_deck', cards: topN });
          break;
        }

        case 'multi_steal': {
          const stolen = [];
          for (const pair of eff.pairs) {
            let aspect;
            if (pair.aspect) {
              aspect = pair.aspect;
            } else if (pair.rank === 'highest') {
              aspect = ASPECTS.reduce((best, a) =>
                opponentPlayer.aspects[a] > opponentPlayer.aspects[best] ? a : best, ASPECTS[0]);
            } else if (pair.rank === '2nd_highest') {
              const sorted = [...ASPECTS].sort((a, b) => opponentPlayer.aspects[b] - opponentPlayer.aspects[a]);
              aspect = sorted[1] ?? sorted[0];
            }
            if (aspect) {
              const amount = pair.amount;
              opponentPlayer.aspects[aspect] = Math.max(0, opponentPlayer.aspects[aspect] - amount);
              player.aspects[aspect] = Math.min(100, player.aspects[aspect] + amount);
              stolen.push({ aspect, amount });
            }
          }
          results.push({ type: 'multi_steal', stolen });
          break;
        }

        case 'copy_own_effect': {
          const best = player.activeEffects
            .filter(e => e.triggerOn === 'tick' && e.delta > 0 && e.targetPlayer === 'self')
            .sort((a, b) => (b.delta * b.durationTurns) - (a.delta * a.durationTurns))[0];
          if (best) {
            const originalDuration = best._originalDuration ?? best.durationTurns;
            player.activeEffects.push({ ...best, durationTurns: originalDuration, _originalDuration: originalDuration });
            results.push({ type: 'copy_own_effect', copied: best.sourceCard });
          } else {
            results.push({ type: 'copy_own_effect', copied: null });
          }
          break;
        }

        case 'top_aspect_boost': {
          const topAspect = ASPECTS.reduce((best, a) =>
            player.aspects[a] > player.aspects[best] ? a : best, ASPECTS[0]);
          player.aspects[topAspect] = Math.min(100, player.aspects[topAspect] + eff.delta);
          results.push({ type: 'top_aspect_boost', aspect: topAspect, delta: eff.delta });
          break;
        }
      }
    }

    // ── Register tick-based effects into activeEffects when card is played ──
    for (const eff of card.effects) {
      if (eff.triggerOn !== 'tick') continue;
      const targetPlayer = eff.targetPlayer === 'self' ? player : opponentPlayer;
      if (eff.exclusive) targetPlayer.activeEffects = targetPlayer.activeEffects.filter(e => e.type !== eff.type);
      const stored = { ...eff, _originalDuration: eff.durationTurns };
      targetPlayer.activeEffects.push(stored);
      results.push({ type: eff.type, durationTurns: eff.durationTurns, target: eff.target, targetPlayer: eff.targetPlayer });
    }

    // ── Amplify: fix the aura/amplify push bug + consume amplify ─────────────
    // (Remove any double-push from the aura/amplify case above — handled by tick loop instead)
    // Consume amplify if active card was played
    if (amplify && card.type === 'active') {
      if (amplify.remainingUses !== undefined) {
        amplify.remainingUses--;
        if (amplify.remainingUses <= 0) {
          player.activeEffects = player.activeEffects.filter(e => e !== amplify);
        }
      } else {
        player.activeEffects = player.activeEffects.filter(e => e !== amplify);
      }
    }

    return results;
  }

  removeEffectsByType(player, type) {
    const removed = player.activeEffects.filter(e => e.type === type);
    player.activeEffects = player.activeEffects.filter(e => e.type !== type);
    return removed;
  }

  removeNegativeEffects(player) {
    const removed = player.activeEffects.filter(e =>
      e.delta < 0 || ['lock', 'suppress', 'skip', 'block_active_play',
        'block_passive_play', 'block_draw', 'lock_foulplay_slot', 'nullify_next_passive'].includes(e.type)
    );
    player.activeEffects = player.activeEffects.filter(e => !removed.includes(e));
    return removed.map(e => e.sourceCard || e.type);
  }

  hasEffect(player, type) {
    return player.activeEffects.some(e => e.type === type);
  }

  isTypeLocked(player, cardType) {
    return player.activeEffects.some(e => {
      if (e.type === 'lock' && e.target === cardType) return true;
      if (e.type === 'block_active_play' && cardType === 'active') return true;
      if (e.type === 'block_passive_play' && cardType === 'passive') return true;
      return false;
    });
  }

  isFoulPlayLocked(player) {
    return player.activeEffects.some(e => e.type === 'lock_foulplay_slot');
  }

  isDrawBlocked(player) {
    return player.activeEffects.some(e => e.type === 'block_draw');
  }

  isSkipped(player) {
    return player.activeEffects.some(e => e.type === 'skip' && e.durationTurns > 0);
  }

  consumeSkip(player) {
    const skip = player.activeEffects.find(e => e.type === 'skip');
    if (skip) {
      skip.durationTurns--;
      if (skip.durationTurns <= 0) {
        player.activeEffects = player.activeEffects.filter(e => e !== skip);
      }
      return true;
    }
    return false;
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
    const targetPlayer = effect.targetPlayer === 'self' ? player : opponent;
    const targets = effect.target === 'all' ? ASPECTS : [effect.target];
    const avg = targets.reduce((s, a) => s + (targetPlayer.aspects[a] || 0), 0) / targets.length;
    return Math.round(avg * effect.delta / 100);
  }
}
