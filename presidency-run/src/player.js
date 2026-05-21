import { AspectEngine } from './aspects.js';
import { createDeck } from './cards.js';

export class Player {
  constructor(name) {
    this.name = name;
    this.aspects = AspectEngine.initialScores();
    this.activeEffects = [];
    this.foulPlaySlot = null;     // card loaded into foul play slot
    this.foulPlayUses = 0;        // number of times foul play has been activated

    // Deck & hand
    this.deck = [];
    this.hand = [];
    this.discard = [];

    // Deck-out tracking
    this.emptyDeckRounds = 0;
  }

  initDeck() {
    this.deck = createDeck();
    this._shuffleDeck();
  }

  _shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  drawCard(count = 1) {
    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (this.hand.length >= 7) break;
      if (this.deck.length === 0) {
        if (this.discard.length === 0) break;
        this.deck = [...this.discard];
        this.discard = [];
        this._shuffleDeck();
      }
      const card = this.deck.pop();
      this.hand.push(card);
      drawn.push(card);
    }
    return drawn;
  }

  drawStartingHand() {
    this.drawCard(5);
  }

  playCard(handIndex) {
    if (handIndex < 0 || handIndex >= this.hand.length) return null;
    const [card] = this.hand.splice(handIndex, 1);
    this.discard.push(card);
    return card;
  }

  loadFoulPlay(handIndex) {
    const card = this.hand[handIndex];
    if (!card || card.type !== 'foulplay') return false;
    this.foulPlaySlot = this.hand.splice(handIndex, 1)[0];
    return true;
  }

  activateFoulPlay() {
    if (!this.foulPlaySlot) return null;
    const card = this.foulPlaySlot;
    this.foulPlaySlot = null;
    this.foulPlayUses++;
    this.discard.push(card);
    return card;
  }

  // Backfire chance indexed by foulPlayUses (capped at index 4)
  backfireChance() {
    const table = [5, 15, 30, 50, 75];
    const idx = Math.min(this.foulPlayUses - 1, table.length - 1);
    return idx < 0 ? 0 : table[idx];
  }

  isHandAndDeckEmpty() {
    return this.hand.length === 0 && this.deck.length === 0 && this.discard.length === 0;
  }
}
