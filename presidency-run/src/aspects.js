import { ASPECTS } from './cards.js';

export class AspectEngine {
  // All aspects start equal — news events shift weights from this baseline
  static uniformWeights() {
    return Object.fromEntries(ASPECTS.map(a => [a, 20]));
  }

  // Used only for sudden death re-randomisation
  static randomWeights() {
    const raw = ASPECTS.map(() => Math.random());
    const total = raw.reduce((s, v) => s + v, 0);
    const weights = {};
    let remaining = 100;
    for (let i = 0; i < ASPECTS.length - 1; i++) {
      const w = Math.round((raw[i] / total) * 100);
      weights[ASPECTS[i]] = w;
      remaining -= w;
    }
    weights[ASPECTS[ASPECTS.length - 1]] = remaining;
    return weights;
  }

  // Shift one aspect's weight by delta, then re-normalise so sum stays 100
  static shiftWeight(weights, aspect, delta) {
    if (!weights[aspect]) return weights;
    const updated = { ...weights };
    updated[aspect] = Math.max(1, updated[aspect] + delta);
    return AspectEngine.normalise(updated);
  }

  // Re-normalise weights to sum to exactly 100 (integer rounding)
  static normalise(weights) {
    const total = Object.values(weights).reduce((s, v) => s + v, 0);
    if (total === 0) return weights;
    const normalised = {};
    let remaining = 100;
    const keys = Object.keys(weights);
    for (let i = 0; i < keys.length - 1; i++) {
      const w = Math.round((weights[keys[i]] / total) * 100);
      normalised[keys[i]] = w;
      remaining -= w;
    }
    normalised[keys[keys.length - 1]] = remaining;
    return normalised;
  }

  // Calculate weighted score for a player
  static weightedScore(player, weights) {
    return ASPECTS.reduce((sum, aspect) => {
      return sum + (player.aspects[aspect] * (weights[aspect] / 100));
    }, 0);
  }

  // Initial aspect scores
  static initialScores() {
    return Object.fromEntries(ASPECTS.map(a => [a, 50]));
  }
}
