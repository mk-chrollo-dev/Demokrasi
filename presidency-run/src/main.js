// Future UI: replace terminal.js with a Phaser 3 scene.
// All src/ files are UI-agnostic and need zero changes.

import { GameState, GAME_PHASE } from './game.js';
import { PRESIDENTS } from './presidents.js';
import {
  printBoard,
  printHand,
  printPrompt,
  printMulliganPrompt,
  printCardPlayed,
  printFoulPlayResult,
  printPassiveNotification,
  printNewsTicker,
  printRoundEnd,
  printError,
  printEndScreen,
  printPresidentSelect,
  printPresidentConfirm,
  TerminalIO,
} from './terminal.js';

const io = new TerminalIO();

async function selectPresident(playerLabel, usedIndex = -1) {
  printPresidentSelect(PRESIDENTS);
  while (true) {
    const input = await io.ask(`${playerLabel}, pilih presiden (1-${PRESIDENTS.length}): `);
    const num = parseInt(input, 10);
    if (isNaN(num) || num < 1 || num > PRESIDENTS.length) {
      console.log('  Pilihan tidak valid. Coba lagi.');
      continue;
    }
    return PRESIDENTS[num - 1];
  }
}

async function mulliganPhase(game) {
  for (let i = 0; i < 2; i++) {
    const p = game.players[i];
    printMulliganPrompt(p.name, p.hand);
    const answer = await io.ask('');
    if (answer.toLowerCase() === 'y') {
      game.doMulligan(i);
      console.log(`  Tangan baru ${p.name}:`);
      printHand(p.hand, p.name);
    } else {
      console.log(`  ${p.name} menyimpan tangan awal.`);
    }
  }
}

async function takeTurn(game) {
  const cpIdx = game.currentPlayerIndex();
  const cp = game.players[cpIdx];

  const turnResult = game.beginTurn();

  if (turnResult.skipped) {
    console.log(`\n  ${cp.name} melewati giliran (efek skip aktif).`);
    return false;
  }

  if (turnResult.passiveNotification) {
    printPassiveNotification(turnResult.passiveNotification);
  }

  if (turnResult.pendingRedrawHandled) {
    console.log(`\n  ${cp.name} menarik ulang ${turnResult.pendingRedrawHandled.drawn.length} kartu.`);
  }

  if (turnResult.drawn.length > 0) {
    console.log(`\n  ${cp.name} menarik: ${turnResult.drawn.map(c => c.name).join(', ')}`);
  } else if (cp.hand.length >= 7) {
    console.log(`\n  Tangan ${cp.name} penuh, lewati tarik kartu.`);
  } else {
    console.log(`\n  ${cp.name} tidak bisa menarik (blokir atau dek kosong).`);
  }

  // Reveal hand if flagged
  const opp = game.opponentOf(cpIdx);
  if (opp.handRevealed) {
    console.log(`  [TANGAN LAWAN TERBUKA]: ${opp.hand.map(c => c.name).join(', ')}`);
  }

  printBoard(game);
  printHand(cp.hand, cp.name);

  if (cp.hand.length === 0) {
    console.log('  Tangan kosong — tidak ada kartu untuk dimainkan.\n');
    return false;
  }

  let cardPlayed = false;

  while (!cardPlayed) {
    const hasFoulPlayLoaded = !!cp.foulPlaySlot;
    const hasFoulPlayInHand = cp.hand.some(c => c.isFoulPlay);
    printPrompt(hasFoulPlayLoaded, hasFoulPlayInHand);

    const input = await io.ask('');
    const upper = input.toUpperCase().trim();

    if (upper === 'A') {
      if (!hasFoulPlayLoaded) { printError('Tidak ada Foul Play di slot.'); continue; }
      const result = game.activateFoulPlay(cpIdx);
      if (result.error === 'foulplay_slot_locked') { printError('Slot Foul Play dikunci lawan!'); continue; }
      if (result.error) { printError('Gagal mengaktifkan Foul Play.'); continue; }
      printFoulPlayResult(cp.name, result.card, result);
      if (game.phase === GAME_PHASE.GAME_OVER) return true;
      if (cp.hand.length === 0) cardPlayed = true;
      continue;
    }

    if (upper === 'L') {
      const fpIdx = cp.hand.findIndex(c => c.isFoulPlay);
      if (fpIdx === -1) { printError('Tidak ada kartu Foul Play di tangan.'); continue; }
      if (game.loadFoulPlay(fpIdx, cpIdx)) console.log(`  ${cp.name} memuat Foul Play ke slot.`);
      continue;
    }

    const num = parseInt(input, 10);
    if (isNaN(num) || num < 1 || num > cp.hand.length) {
      printError(`Pilih nomor 1–${cp.hand.length}.`);
      continue;
    }

    const result = game.playCard(num - 1, cpIdx);
    if (result.error === 'locked') {
      const lockName = result.lockedType === 'active' ? 'AKTIF' : 'PASIF';
      printError(`Kartu ${lockName} dikunci oleh efek lawan!`);
      continue;
    }
    if (result.error) { printError('Kartu tidak valid.'); continue; }

    printCardPlayed(cp.name, result.card, result.effectResults);
    cardPlayed = true;
  }

  return false;
}

async function gameLoop(game) {
  const newsInterval = setInterval(() => {
    const result = game.fireNewsTick();
    printNewsTicker(result.headline);
  }, 4000);

  game.startFirstRound();

  let gameOver = false;

  while (!gameOver) {
    if (game.phase === GAME_PHASE.GAME_OVER) break;

    const terminated = await takeTurn(game);
    if (terminated || game.phase === GAME_PHASE.GAME_OVER) { gameOver = true; break; }

    const cpIdx = game.currentPlayerIndex();
    const result = game.endTurn(cpIdx);

    if (result.expired?.length > 0) {
      const names = result.expired.map(e => e.sourceCard || e.type).join(', ');
      console.log(`  [Efek berakhir: ${names}]`);
    }

    if (result.phase === GAME_PHASE.GAME_OVER) { gameOver = true; break; }
    if (result.suddenDeath) console.log('\n  ══ SUDDEN DEATH! Bobot diacak ulang. Setiap pemain tarik 3 kartu. ══\n');

    if (result.phase === GAME_PHASE.ROUND_END) {
      printRoundEnd(game.round - 1);
      await io.ask('  Tekan Enter untuk lanjut...');
      game.startNextRound();
    }
  }

  clearInterval(newsInterval);
  await printEndScreen(game);
  io.close();
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              PRESIDENCY RUN — Permainan Kartu Politik Indonesia              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  const p1Name = (await io.ask('Nama Pemain 1 (Enter = "Pemain 1"): ')) || 'Pemain 1';
  const p2Name = (await io.ask('Nama Pemain 2 (Enter = "Pemain 2"): ')) || 'Pemain 2';

  console.log(`\n${p1Name}, giliran kamu pilih presiden:`);
  const p1Pres = await selectPresident(p1Name);
  printPresidentConfirm(p1Name, p1Pres);

  console.log(`${p2Name}, giliran kamu pilih presiden (mirror match dibolehkan):`);
  const p2Pres = await selectPresident(p2Name);
  printPresidentConfirm(p2Name, p2Pres);

  const game = new GameState(p1Name, p2Name, p1Pres, p2Pres);
  game.setup();

  await mulliganPhase(game);
  await gameLoop(game);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
