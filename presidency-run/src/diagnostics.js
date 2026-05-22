// Diagnostics — Jokowi vs Prabowo full engine check.
// Covers: deck build, president passives, new effect types, foulplay.

import { GameState, GAME_PHASE } from './game.js';
import { PRESIDENTS, PRESIDENT_MAP } from './presidents.js';
import { CARD_REGISTRY, ASPECTS } from './cards.js';
import { AspectEngine } from './aspects.js';
import { EffectEngine } from './effects.js';

let passed = 0, failed = 0;

function assert(cond, msg) {
  if (cond) { console.log(`  PASS  ${msg}`); passed++; }
  else { console.error(`  FAIL  ${msg}`); failed++; }
}

function section(title) { console.log(`\n── ${title} ${'─'.repeat(50 - title.length)}`); }

// ── 1. CARD REGISTRY ────────────────────────────────────────────────────────
section('Card Registry');

assert(CARD_REGISTRY.size >= 100, `Registry has ≥100 cards (got ${CARD_REGISTRY.size})`);

for (const president of PRESIDENTS) {
  const deckSize = president.deckIds.length;
  assert(deckSize === 20, `${president.id} deck has 20 cards (got ${deckSize})`);

  const foulPlayCount = president.deckIds.filter(id => {
    const c = CARD_REGISTRY.get(id);
    return c?.isFoulPlay;
  }).length;
  assert(foulPlayCount === 1, `${president.id} deck has exactly 1 foulplay (got ${foulPlayCount})`);

  const activeCount = president.deckIds.filter(id => {
    const c = CARD_REGISTRY.get(id);
    return c && !c.isFoulPlay && c.type === 'active';
  }).length;
  assert(activeCount === 10, `${president.id} deck has 10 non-foulplay active (got ${activeCount})`);

  const passiveCount = president.deckIds.filter(id => {
    const c = CARD_REGISTRY.get(id);
    return c?.type === 'passive';
  }).length;
  assert(passiveCount === 9, `${president.id} deck has 9 passive (got ${passiveCount})`);

  for (const id of president.deckIds) {
    if (!CARD_REGISTRY.has(id)) {
      assert(false, `${president.id}: unknown card id "${id}"`);
    }
  }
}

// ── 2. GAME INIT ─────────────────────────────────────────────────────────────
section('Game Init — Jokowi vs Prabowo');

const jokowi = PRESIDENT_MAP.get('jokowi');
const prabowo = PRESIDENT_MAP.get('prabowo');
assert(jokowi && prabowo, 'Presidents found in map');

const game = new GameState('Joko', 'Prabowo', jokowi, prabowo);
game.setup();

const p0 = game.players[0]; // Jokowi
const p1 = game.players[1]; // Prabowo

assert(p0.hand.length === 5, `Jokowi starting hand = 5 (got ${p0.hand.length})`);
assert(p1.hand.length === 5, `Prabowo starting hand = 5 (got ${p1.hand.length})`);
assert(p0.deck.length === 15, `Jokowi deck = 15 after deal (got ${p0.deck.length})`);

// ── 3. PRESIDENT PASSIVES ────────────────────────────────────────────────────
section('President Passives');

// Soeharto: Keamanan starts at 65
const soeharto = PRESIDENT_MAP.get('soeharto');
const megawati = PRESIDENT_MAP.get('megawati');
const soekarno = PRESIDENT_MAP.get('soekarno');

const gSH = new GameState('A', 'B', soeharto, megawati);
assert(gSH.players[0].aspects['Keamanan'] === 65, 'Soeharto Keamanan starts at 65');
assert(gSH.players[1].aspects['Ekonomi'] === 58, 'Megawati Ekonomi starts at 58');

// Soekarno: applyOnRoundFirstTurn gives +2 all aspects
const gSNO = new GameState('X', 'Y', soekarno, jokowi);
gSNO.setup();
gSNO.startFirstRound();
const beforeSno = { ...gSNO.players[0].aspects };
const turnResult = gSNO.beginTurn(); // round 1, turn 0 — Soekarno's first turn
const afterSno = gSNO.players[0].aspects;
const snoGot1 = ASPECTS.every(a => afterSno[a] === Math.min(100, beforeSno[a] + 1));
assert(snoGot1, 'Soekarno Orator Ulung: all aspects +1 on round first turn');
assert(turnResult.passiveNotification?.passive === 'orator_ulung', 'Orator Ulung notification returned');

// Prabowo: pantang_menyerah fires if aspect < 40
const gPRA = new GameState('X', 'Y', prabowo, jokowi);
gPRA.setup();
gPRA.startFirstRound();
gPRA.players[0].aspects['Ekonomi'] = 30; // force below 40
const beforePra = { ...gPRA.players[0].aspects };
const praTurn = gPRA.beginTurn();
assert(gPRA.players[0].aspects['Ekonomi'] === 35, `Prabowo Pantang Menyerah: Ekonomi 30→35 (got ${gPRA.players[0].aspects['Ekonomi']})`);
assert(praTurn.passiveNotification?.passive === 'pantang_menyerah', 'Pantang Menyerah notification returned');

// Jokowi: blusukan peeks top 2 of opponent deck on round 1
const gJKW = new GameState('X', 'Y', jokowi, prabowo);
gJKW.setup();
gJKW.startFirstRound();
const jkwTurn = gJKW.beginTurn();
assert(jkwTurn.passiveNotification?.passive === 'blusukan', 'Jokowi Blusukan fires on round 1');
assert(typeof jkwTurn.passiveNotification.message === 'string', 'Blusukan message is a string');

// ── 4. WEIGHTS ───────────────────────────────────────────────────────────────
section('Weights');

const wGame = new GameState('A', 'B', jokowi, prabowo);
wGame.setup();
const preNewsWeights = AspectEngine.uniformWeights();
assert(Object.values(preNewsWeights).reduce((s, v) => s + v, 0) === 100, 'Uniform weights sum to 100');
assert(Object.values(preNewsWeights).every(v => v === 20), 'Uniform weights are all 20');

wGame.startFirstRound(); // fires news once
const postNews = Object.values(wGame.weights).reduce((s, v) => s + v, 0);
assert(postNews === 100, `Weights after news still sum to 100 (got ${postNews})`);

// ── 5. EFFECT ENGINE — NEW TYPES ─────────────────────────────────────────────
section('Effect Engine — New Types');

const ee = new EffectEngine();

// Build a scratch player/opponent
function makePlayer(name) {
  const p = { name, aspects: AspectEngine.initialScores(), activeEffects: [], handRevealed: false };
  p.hand = []; p.deck = []; p.discard = [];
  return p;
}

// nullify_next_passive
{
  const pa = makePlayer('A'), pb = makePlayer('B');
  pa.activeEffects.push({
    type: 'nullify_next_passive', targetPlayer: 'self', durationTurns: -1, triggerOn: 'onPlay', sourceCard: 'Test'
  });
  const fakePassiveCard = {
    type: 'passive', isFoulPlay: false,
    effects: [{ type: 'growth', target: 'Ekonomi', targetPlayer: 'self', delta: 10, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Test' }]
  };
  const results = ee.applyOnPlayEffects(fakePassiveCard, pa, pb);
  assert(pa.activeEffects.length === 0, 'nullify_next_passive: consumed from activeEffects');
  assert(results[0]?.type === 'nullified', 'nullify_next_passive: returns nullified result');
  assert(pa.aspects['Ekonomi'] === 50, 'nullify_next_passive: passive effect did not apply');
}

// shield blocks negative
{
  const pa = makePlayer('A'), pb = makePlayer('B');
  pa.activeEffects.push({ type: 'shield', target: 'Ekonomi', remainingCount: 1, durationTurns: -1, triggerOn: 'onPlay', sourceCard: 'Test' });
  const fakeAttack = {
    type: 'active', isFoulPlay: false,
    effects: [{ type: 'decay', target: 'Ekonomi', targetPlayer: 'self', delta: -15, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Test' }]
  };
  ee.applyOnPlayEffects(fakeAttack, pa, pa);
  assert(pa.aspects['Ekonomi'] === 50, 'shield blocks negative delta on own aspect');
  assert(pa.activeEffects.length === 0, 'shield consumed after blocking');
}

// swap_aspects
{
  const pa = makePlayer('A'), pb = makePlayer('B');
  pb.aspects['Ekonomi'] = 80;
  pb.aspects['Keamanan'] = 20;
  const fakeSwap = {
    type: 'active', isFoulPlay: false,
    effects: [{ type: 'swap_aspects', target: 'all', targetPlayer: 'opponent', delta: 0, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Test' }]
  };
  ee.applyOnPlayEffects(fakeSwap, pa, pb);
  assert(pb.aspects['Ekonomi'] === 20, `swap_aspects: Ekonomi (was 80) → 20 (got ${pb.aspects['Ekonomi']})`);
  assert(pb.aspects['Keamanan'] === 80, `swap_aspects: Keamanan (was 20) → 80 (got ${pb.aspects['Keamanan']})`);
}

// nullify_effect_stack
{
  const pa = makePlayer('A'), pb = makePlayer('B');
  pb.activeEffects = [
    { type: 'aura', delta: 3, durationTurns: 5, triggerOn: 'tick', sourceCard: 'X' },
    { type: 'aura', delta: 2, durationTurns: 3, triggerOn: 'tick', sourceCard: 'Y' },
  ];
  const fakeNullify = {
    type: 'active', isFoulPlay: false,
    effects: [{ type: 'nullify_effect_stack', target: 'all', targetPlayer: 'opponent', delta: 0, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Test' }]
  };
  ee.applyOnPlayEffects(fakeNullify, pa, pb);
  assert(pb.activeEffects.length === 0, 'nullify_effect_stack: all opponent effects cleared');
}

// multi_steal (fixed aspects)
{
  const pa = makePlayer('A'), pb = makePlayer('B');
  pb.aspects['Ekonomi'] = 70; pa.aspects['Ekonomi'] = 40;
  const fakeSteal = {
    type: 'active', isFoulPlay: false,
    effects: [{
      type: 'multi_steal', target: 'all', targetPlayer: 'opponent', delta: 0, deltaType: 'flat', durationTurns: 0,
      triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Test',
      pairs: [{ aspect: 'Ekonomi', amount: 15 }]
    }]
  };
  ee.applyOnPlayEffects(fakeSteal, pa, pb);
  assert(pb.aspects['Ekonomi'] === 55, `multi_steal: opp Ekonomi 70→55 (got ${pb.aspects['Ekonomi']})`);
  assert(pa.aspects['Ekonomi'] === 55, `multi_steal: self Ekonomi 40→55 (got ${pa.aspects['Ekonomi']})`);
}

// force_discard_hand (game-level)
{
  const g = new GameState('A', 'B', jokowi, prabowo);
  g.setup();
  g.startFirstRound();
  g.players[1].hand = [{ id: 'test', name: 'Test Card', type: 'active', isFoulPlay: false, effects: [], instanceId: 'x' }];
  g.players[1].discardHand();
  assert(g.players[1].hand.length === 0, 'force_discard_hand: hand cleared');
  assert(g.players[1].discard.length >= 1, 'force_discard_hand: card in discard');
}

// block_draw: player cannot draw when blocked
{
  const pa = makePlayer('A');
  pa.deck = [{ id: 'x', name: 'X', type: 'active', isFoulPlay: false, effects: [], instanceId: 'x' }];
  pa.activeEffects.push({ type: 'block_draw', durationTurns: 2, triggerOn: 'onPlay', sourceCard: 'Test' });
  assert(ee.isDrawBlocked(pa), 'block_draw: isDrawBlocked returns true');
}

// lock_foulplay_slot
{
  const pa = makePlayer('A');
  pa.activeEffects.push({ type: 'lock_foulplay_slot', durationTurns: 3, triggerOn: 'onPlay', sourceCard: 'Test' });
  assert(ee.isFoulPlayLocked(pa), 'lock_foulplay_slot: isFoulPlayLocked returns true');
}

// peek_deck
{
  const pa = makePlayer('A'), pb = makePlayer('B');
  pb.deck = [
    { id: 'a', name: 'Card A', instanceId: 'a0', effects: [] },
    { id: 'b', name: 'Card B', instanceId: 'b0', effects: [] },
    { id: 'c', name: 'Card C', instanceId: 'c0', effects: [] },
  ];
  const fakePeek = {
    type: 'active', isFoulPlay: false,
    effects: [{ type: 'peek_deck', target: 'opponent', targetPlayer: 'opponent', delta: 2, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Test' }]
  };
  const res = ee.applyOnPlayEffects(fakePeek, pa, pb);
  const peekRes = res.find(r => r.type === 'peek_deck');
  assert(peekRes !== undefined, 'peek_deck: result returned');
  assert(peekRes.cards.length === 2, `peek_deck: returns 2 cards (got ${peekRes.cards.length})`);
  assert(pb.deck.length === 3, 'peek_deck: deck not modified');
}

// ── 6. FOUL PLAY BACKFIRE ─────────────────────────────────────────────────────
section('Foul Play Backfire');

{
  // Force backfire by rigging Math.random
  const g2 = new GameState('A', 'B', jokowi, prabowo);
  g2.setup();
  g2.startFirstRound();

  const fpCard = [...g2.players[0].deck, ...g2.players[0].hand].find(c => c.isFoulPlay);
  assert(fpCard !== undefined, 'Jokowi deck or hand has a foulplay card');

  // Load it into slot manually
  g2.players[0].foulPlaySlot = fpCard;
  g2.players[0].foulPlayUses = 0;

  const origRandom = Math.random;
  Math.random = () => 0.01; // guaranteed backfire (5% → 1% roll)
  const result = g2.activateFoulPlay(0);
  Math.random = origRandom;

  assert(result.backfired === true, 'Foul play backfired as expected');
  assert(result.backfireAspect !== undefined, 'Backfire aspect reported');
  const totalAfter = ASPECTS.reduce((s, a) => s + g2.players[0].aspects[a], 0);
  assert(totalAfter < 250, `Backfire applied −15 to a random aspect (total=${totalAfter})`);
}

// Backfire chance table
{
  const g3 = new GameState('A', 'B', jokowi, prabowo);
  g3.setup();
  const p = g3.players[0];
  const expected = [5, 15, 30, 50, 75];
  for (let uses = 1; uses <= 5; uses++) {
    p.foulPlayUses = uses;
    assert(p.backfireChance() === expected[Math.min(uses - 1, 4)], `backfireChance uses=${uses} = ${expected[Math.min(uses - 1, 4)]}%`);
  }
}

// ── 7. TURN LOOP ──────────────────────────────────────────────────────────────
section('Turn Loop — 10 turns (1 full round)');

{
  const g = new GameState('A', 'B', jokowi, prabowo);
  g.setup();
  g.startFirstRound();

  for (let t = 0; t < 10; t++) {
    const cpIdx = g.currentPlayerIndex();
    const cp = g.players[cpIdx];
    const turnR = g.beginTurn();
    if (turnR.skipped) {
      const r = g.endTurn(cpIdx);
      continue;
    }
    // Play first non-foulplay card
    const cardIdx = cp.hand.findIndex(c => !c.isFoulPlay);
    if (cardIdx !== -1) g.playCard(cardIdx, cpIdx);
    const r = g.endTurn(cpIdx);
    if (r.phase === GAME_PHASE.GAME_OVER) break;
  }

  assert(g.round >= 1, 'Game survives 10 turns without crashing');
  const s0 = g.weightedScore(0);
  const s1 = g.weightedScore(1);
  assert(typeof s0 === 'number' && !isNaN(s0), `P1 weighted score is a number (${s0.toFixed(2)})`);
  assert(typeof s1 === 'number' && !isNaN(s1), `P2 weighted score is a number (${s1.toFixed(2)})`);
}

// ── 8. AMPLIFY (Jokowi's copy_own_effect) ────────────────────────────────────
section('Amplify & copy_own_effect');

{
  const ee2 = new EffectEngine();
  const pa = makePlayer('A'), pb = makePlayer('B');

  // Install an aura first
  pa.activeEffects.push({
    type: 'aura', target: 'Ekonomi', targetPlayer: 'self', delta: 5,
    durationTurns: 4, triggerOn: 'tick', sourceCard: 'TestAura', _originalDuration: 4
  });

  const fakeCopy = {
    type: 'passive', isFoulPlay: false,
    effects: [{ type: 'copy_own_effect', target: 'self', targetPlayer: 'self', delta: 0, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Blusukan Media' }]
  };
  const res = ee2.applyOnPlayEffects(fakeCopy, pa, pb);
  const copyRes = res.find(r => r.type === 'copy_own_effect');
  assert(copyRes?.copied === 'TestAura', `copy_own_effect: copied TestAura (got ${copyRes?.copied})`);
  const auraCount = pa.activeEffects.filter(e => e.type === 'aura').length;
  assert(auraCount === 2, `copy_own_effect: now 2 aura effects on board (got ${auraCount})`);
}

// Amplify consumes only on active card
{
  const ee3 = new EffectEngine();
  const pa = makePlayer('A'), pb = makePlayer('B');
  pa.activeEffects.push({
    type: 'amplify', delta: 100, deltaType: 'percent', remainingUses: 1,
    exclusive: true, durationTurns: -1, triggerOn: 'onPlay', sourceCard: 'Radio'
  });

  // Play a passive card — amplify should NOT be consumed
  const fakePassive = {
    type: 'passive', isFoulPlay: false,
    effects: [draw(1, 'Test')]
  };
  function draw(n, src) {
    return { type: 'draw', target: 'self', targetPlayer: 'self', delta: n, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: src };
  }
  ee3.applyOnPlayEffects(fakePassive, pa, pb);
  assert(pa.activeEffects.find(e => e.type === 'amplify') !== undefined, 'Amplify not consumed on passive card');

  // Now play an active card — amplify should be consumed
  pa.aspects['Ekonomi'] = 50;
  const fakeActive = {
    type: 'active', isFoulPlay: false,
    effects: [{ type: 'growth', target: 'Ekonomi', targetPlayer: 'self', delta: 10, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Test' }]
  };
  ee3.applyOnPlayEffects(fakeActive, pa, pb);
  assert(pa.activeEffects.find(e => e.type === 'amplify') === undefined, 'Amplify consumed on active card');
  assert(pa.aspects['Ekonomi'] === 70, `Amplify applied 100%: Ekonomi 50 + 10*2 = 70 (got ${pa.aspects['Ekonomi']})`);
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(55)}`);
console.log(`  PASSED: ${passed}   FAILED: ${failed}   TOTAL: ${passed + failed}`);
console.log('═'.repeat(55));
if (failed > 0) process.exitCode = 1;
