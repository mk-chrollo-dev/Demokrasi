// Future UI: migrate to Phaser 3. Game logic in src/ is UI-agnostic.
// Replace terminal.js with a Phaser scene. All other files stay identical.

import { GameState, GAME_PHASE } from './game.js';
import {
  printBoard,
  printHand,
  printPrompt,
  printMulliganPrompt,
  printCardPlayed,
  printFoulPlayResult,
  printNewsTicker,
  printRoundEnd,
  printError,
  printEndScreen,
  TerminalIO,
} from './terminal.js';

const io = new TerminalIO();

async function promptPlayerNames() {
  const p1 = await io.ask('Nama Pemain 1 (Enter = "Pemain 1"): ');
  const p2 = await io.ask('Nama Pemain 2 (Enter = "Pemain 2"): ');
  return [p1 || 'Pemain 1', p2 || 'Pemain 2'];
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

  // Draw
  const drawn = game.beginTurn();
  if (drawn.length > 0) {
    console.log(`\n  ${cp.name} menarik: ${drawn.map(c => c.name).join(', ')}`);
  } else if (cp.hand.length >= 7) {
    console.log(`\n  Tangan ${cp.name} penuh (7), lewati tarik kartu.`);
  } else {
    console.log(`\n  Dek ${cp.name} kosong, tidak bisa menarik kartu.`);
  }

  printBoard(game);
  printHand(cp.hand, cp.name);

  let cardPlayed = false;

  while (!cardPlayed) {
    const hasFoulPlayLoaded = !!cp.foulPlaySlot;
    const hasFoulPlayInHand = cp.hand.some(c => c.type === 'foulplay');
    printPrompt(hasFoulPlayLoaded, hasFoulPlayInHand);

    const input = await io.ask('');
    const upper = input.toUpperCase();

    if (upper === 'A') {
      if (!hasFoulPlayLoaded) {
        printError('Tidak ada Foul Play yang dimuat di slot.');
        continue;
      }
      const result = game.activateFoulPlay(cpIdx);
      if (result.error) {
        printError('Gagal mengaktifkan Foul Play.');
        continue;
      }
      printFoulPlayResult(cp.name, result.card, result);
      if (game.phase === GAME_PHASE.GAME_OVER) return true;
      // Foul play is a free action — still need to play a card unless hand empty
      if (cp.hand.length === 0) {
        cardPlayed = true;
      }
      continue;
    }

    if (upper === 'L') {
      const fpIdx = cp.hand.findIndex(c => c.type === 'foulplay');
      if (fpIdx === -1) {
        printError('Tidak ada kartu Foul Play di tangan.');
        continue;
      }
      const loaded = game.loadFoulPlay(fpIdx, cpIdx);
      if (loaded) {
        console.log(`  ${cp.name} memuat Foul Play ke slot.`);
      }
      continue;
    }

    const num = parseInt(input, 10);
    if (isNaN(num) || num < 1 || num > cp.hand.length) {
      printError(`Pilih nomor kartu antara 1 dan ${cp.hand.length}.`);
      continue;
    }

    const result = game.playCard(num - 1, cpIdx);
    if (result.error === 'locked') {
      const lockName = result.lockedType === 'active' ? 'AKTIF' : result.lockedType.toUpperCase();
      printError(`Kartu ${lockName} dikunci oleh efek lawan!`);
      continue;
    }
    if (result.error) {
      printError('Kartu tidak valid.');
      continue;
    }

    printCardPlayed(cp.name, result.card, result.effectResults);
    cardPlayed = true;
  }

  return false; // game not over
}

async function gameLoop(game) {
  // Start news ticker (fires every 4 seconds, silent weight delta)
  const newsInterval = setInterval(() => {
    const result = game.fireNewsTick();
    printNewsTicker(result.headline);
  }, 4000);

  game.startFirstRound();

  let gameOver = false;

  while (!gameOver) {
    if (game.phase === GAME_PHASE.GAME_OVER) break;

    const terminated = await takeTurn(game);
    if (terminated || game.phase === GAME_PHASE.GAME_OVER) {
      gameOver = true;
      break;
    }

    const cpIdx = game.currentPlayerIndex();
    const result = game.endTurn(cpIdx);

    if (result.expired && result.expired.length > 0) {
      const names = result.expired.map(e => e.name || e.sourceCard || e.type).join(', ');
      console.log(`  [Efek berakhir: ${names}]`);
    }

    if (result.phase === GAME_PHASE.GAME_OVER) {
      gameOver = true;
      break;
    }

    if (result.suddenDeath) {
      console.log('\n  ══ SUDDEN DEATH! Bobot diacak ulang. Setiap pemain tarik 3 kartu. ══\n');
    }

    if (result.phase === GAME_PHASE.ROUND_END) {
      printRoundEnd(game.round - 1);
      await io.ask('  Tekan Enter untuk lanjut ke ronde berikutnya...');
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

  const [p1Name, p2Name] = await promptPlayerNames();
  const game = new GameState(p1Name, p2Name);
  game.setup();

  await mulliganPhase(game);
  await gameLoop(game);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
