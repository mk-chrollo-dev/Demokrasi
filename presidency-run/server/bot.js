import { CARD_REGISTRY } from '../src/cards.js';

const ALL_PRESIDENTS = ['soekarno', 'soeharto', 'megawati', 'prabowo', 'jokowi'];

function getCard(instanceId) {
  const baseId = instanceId.replace(/_\d+$/, '');
  return CARD_REGISTRY.get(baseId) || null;
}

export function pickBotPresident(excludeId) {
  const choices = ALL_PRESIDENTS.filter(id => id !== excludeId);
  return choices[Math.floor(Math.random() * choices.length)];
}

export function pickBotAction(state, botRole = 'p2') {
  const botPlayer = state.players[botRole];

  // Card already played → end turn
  if (state.cardPlayedThisTurn) {
    return { type: 'END_TURN' };
  }

  const hand = botPlayer.hand || [];

  if (hand.length === 0) {
    return { type: 'END_TURN' };
  }

  // Detect locked card types
  const effects = botPlayer.activeEffects || [];
  const lockedTypes = new Set();
  if (effects.some(e => e.type === 'block_active_play'  && (e.durationTurns || 0) > 0)) lockedTypes.add('active');
  if (effects.some(e => e.type === 'block_passive_play' && (e.durationTurns || 0) > 0)) lockedTypes.add('passive');

  // Collect playable (non-FP, non-locked) cards
  const playable = hand.filter(instanceId => {
    const card = getCard(instanceId);
    if (!card) return false;
    if (card.isFoulPlay) return false;
    if (lockedTypes.has(card.type)) return false;
    return true;
  });

  if (playable.length > 0) {
    const pick = playable[Math.floor(Math.random() * playable.length)];
    return { type: 'PLAY_CARD', payload: { cardId: pick } };
  }

  // Hand has only FP / locked cards — try to load FP to slot to reduce hand size
  const fpInHand = hand.find(instanceId => {
    const card = getCard(instanceId);
    return card?.isFoulPlay;
  });

  if (fpInHand && !botPlayer.foulPlaySlot) {
    return { type: 'LOAD_FOUL_PLAY', payload: { cardId: fpInHand } };
  }

  // Slot loaded and still stuck — activate as last resort (avoids stuck state)
  if (botPlayer.foulPlaySlot) {
    return { type: 'ACTIVATE_FOUL_PLAY' };
  }

  return { type: 'END_TURN' };
}
