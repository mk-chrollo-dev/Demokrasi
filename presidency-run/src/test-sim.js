// Dry simulation — 2 turns, no I/O. Verifies effect engine is wired correctly.

import { GameState } from './game.js';
import { ASPECTS } from './cards.js';
import { AspectEngine } from './aspects.js';

function assert(condition, msg) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${msg}`);
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const game = new GameState('Alice', 'Bob');
game.setup();
game.startFirstRound();

const p0 = game.players[0];
const p1 = game.players[1];

console.log('\n=== Initial state ===');
console.log(`P1 aspects: ${JSON.stringify(p0.aspects)}`);
console.log(`P2 aspects: ${JSON.stringify(p1.aspects)}`);
console.log(`Weights: ${JSON.stringify(game.weights)}`);
assert(Object.values(game.weights).reduce((s, v) => s + v, 0) === 100, 'weights sum to 100');
// Weights start uniform (20 each) before any news fires; after startFirstRound news fires once
const allStartNear20 = Object.values(game.weights).every(w => w >= 12 && w <= 28);
assert(allStartNear20, 'weights start near-uniform after first news shift');

// ── Verify starting hands ─────────────────────────────────────────────────────
assert(p0.hand.length === 5, `P1 starting hand = 5 (got ${p0.hand.length})`);
assert(p1.hand.length === 5, `P2 starting hand = 5 (got ${p1.hand.length})`);

// ── Turn 1: P1 draws & plays first attack card ────────────────────────────────
console.log('\n=== Turn 1 (P1) ===');
const drawn1 = game.beginTurn();
console.log(`P1 drew: ${drawn1.map(c => c.name).join(', ') || '(none)'}`);

// Find an attack card in P1's hand
const attackIdx = p0.hand.findIndex(c => c.type === 'active' || c.type === 'passive');
assert(attackIdx !== -1, 'P1 has at least one playable card');

const cardToPlay = p0.hand[attackIdx];
console.log(`P1 plays: ${cardToPlay.name}`);

const ekonomiBefore = { p0: p0.aspects['Ekonomi'], p1: p1.aspects['Ekonomi'] };
const result1 = game.playCard(attackIdx, 0);
assert(!result1.error, `P1 card play succeeded (${result1.error || 'ok'})`);
assert(result1.effectResults !== undefined, 'effectResults present');
console.log(`Effect results: ${JSON.stringify(result1.effectResults)}`);

// If an active card was played expect an immediate aspect change; passive cards tick later
if (cardToPlay.type === 'active') {
  const anyChange = ASPECTS.some(a => p0.aspects[a] !== 50 || p1.aspects[a] !== 50);
  assert(anyChange, 'Active card: at least one aspect changed after P1 turn 1');
} else {
  // Passive — effects are queued; verify effect landed on activeEffects
  const hasQueuedEffect = p0.activeEffects.length > 0 || p1.activeEffects.length > 0;
  assert(hasQueuedEffect, `Passive card (${cardToPlay.name}): effect queued on activeEffects`);
}

// End turn 1
const end1 = game.endTurn(0);
assert(end1.phase !== 'game_over', 'Game not over after turn 1');
console.log(`Turn 1 ended. Phase: ${end1.phase}`);

// ── Turn 2: P2 draws & plays ──────────────────────────────────────────────────
console.log('\n=== Turn 2 (P2) ===');
const drawn2 = game.beginTurn();
console.log(`P2 drew: ${drawn2.map(c => c.name).join(', ') || '(none)'}`);

const p2AttackIdx = p1.hand.findIndex(c => c.type !== 'foulplay');
assert(p2AttackIdx !== -1, 'P2 has a playable card');

const p2Card = p1.hand[p2AttackIdx];
console.log(`P2 plays: ${p2Card.name}`);
const result2 = game.playCard(p2AttackIdx, 1);
assert(!result2.error, `P2 card play succeeded`);
console.log(`Effect results: ${JSON.stringify(result2.effectResults)}`);

const end2 = game.endTurn(1);
assert(end2.phase !== 'game_over', 'Game not over after turn 2');

// ── Verify weighted score ─────────────────────────────────────────────────────
console.log('\n=== Weighted scores ===');
const s0 = game.weightedScore(0);
const s1 = game.weightedScore(1);
console.log(`P1 weighted score: ${s0.toFixed(2)}`);
console.log(`P2 weighted score: ${s1.toFixed(2)}`);
assert(typeof s0 === 'number' && !isNaN(s0), 'P1 score is a number');
assert(typeof s1 === 'number' && !isNaN(s1), 'P2 score is a number');

// ── Foul play load & backfire probability ─────────────────────────────────────
console.log('\n=== Foul Play slot ===');
// Inject a foul play card into P1 hand for testing
import('../src/cards.js').then(({ BASE_DECK }) => {
  const fpCard = BASE_DECK.find(c => c.type === 'foulplay');
  p0.hand.push({ ...fpCard, instanceId: 'test_fp' });
  const fpIdx = p0.hand.findIndex(c => c.type === 'foulplay');
  const loaded = game.loadFoulPlay(fpIdx, 0);
  assert(loaded, 'Foul Play loaded into slot');
  assert(p0.foulPlaySlot !== null, 'foulPlaySlot is set');

  // Manually simulate uses and check backfire chances
  const expectedChances = [5, 15, 30, 50, 75];
  for (let uses = 1; uses <= 5; uses++) {
    p0.foulPlayUses = uses;
    const chance = p0.backfireChance();
    assert(chance === expectedChances[Math.min(uses - 1, 4)], `backfireChance at uses=${uses} is ${chance}% (expected ${expectedChances[Math.min(uses - 1, 4)]}%)`);
  }
  p0.foulPlayUses = 0;

  // ── News engine ───────────────────────────────────────────────────────────
  console.log('\n=== News Engine ===');
  const weightsBefore = { ...game.weights };
  const newsResult = game.fireNewsTick();
  assert(typeof newsResult.headline === 'string', 'News returns a headline');
  assert(newsResult.newWeights !== undefined, 'News returns new weights');
  const newSum = Object.values(newsResult.newWeights).reduce((s, v) => s + v, 0);
  assert(newSum === 100, `News weights re-normalise to 100 (got ${newSum})`);
  console.log(`News: "${newsResult.headline}"`);

  console.log('\n=== All checks complete ===\n');
});
