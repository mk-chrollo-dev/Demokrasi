import { AspectEngine } from './aspects.js';
import { buildDeck } from './cards.js';

export class Player {
  constructor(name, president = null) {
    this.name = name;
    this.president = president;
    this.aspects = AspectEngine.initialScores();
    this.activeEffects = [];
    this.foulPlaySlot = null;
    this.foulPlayUses = 0;
    this.handRevealed = false; // set true by reveal_hand_permanent

    this.deck = [];
    this.hand = [];
    this.discard = [];
    this.emptyDeckRounds = 0;

    // Apply init passive (e.g. Soeharto Keamanan→65, Megawati Ekonomi→58)
    if (president?.passive?.applyOnInit) {
      president.passive.applyOnInit(this);
    }
  }

  initDeck() {
    this.deck = this.president ? buildDeck(this.president.deckIds) : [];
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

  drawStartingHand() { this.drawCard(5); }

  playCard(handIndex) {
    if (handIndex < 0 || handIndex >= this.hand.length) return null;
    const [card] = this.hand.splice(handIndex, 1);
    this.discard.push(card);
    return card;
  }

  loadFoulPlay(handIndex) {
    const card = this.hand[handIndex];
    if (!card || !card.isFoulPlay) return false;
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

  backfireChance() {
    const table = [5, 15, 30, 50, 75];
    const idx = Math.min(this.foulPlayUses - 1, table.length - 1);
    return idx < 0 ? 0 : table[idx];
  }

  // Discard entire hand; return count discarded
  discardHand() {
    const count = this.hand.length;
    this.discard.push(...this.hand);
    this.hand = [];
    return count;
  }

  isHandAndDeckEmpty() {
    return this.hand.length === 0 && this.deck.length === 0 && this.discard.length === 0;
  }
}
