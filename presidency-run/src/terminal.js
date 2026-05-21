// terminal.js — all console.log / readline I/O lives here.
// All other src/ files are UI-agnostic and return data only.

import readline from 'readline';
import { ASPECTS } from './cards.js';
import { GAME_PHASE, WIN_REASON } from './game.js';
import { AspectEngine } from './aspects.js';

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgBlue: '\x1b[44m',
};

function col(color, text) {
  return `${C[color]}${text}${C.reset}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function line(char = '═', width = 80) {
  return char.repeat(width);
}

function centreText(text, width = 80) {
  const stripped = text.replace(/\x1b\[[0-9;]*m/g, '');
  const pad = Math.max(0, Math.floor((width - stripped.length) / 2));
  return ' '.repeat(pad) + text;
}

function padRight(str, width) {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
  return str + ' '.repeat(Math.max(0, width - stripped.length));
}

// ── Board display ─────────────────────────────────────────────────────────────

export function printBoard(game) {
  const view = game.toView(false);
  const cpIdx = view.currentPlayerIndex;
  const p1 = view.players[0];
  const p2 = view.players[1];
  const turnNum = Math.floor(view.turnInRound / 2) + 1;
  const suddenLabel = view.isSuddenDeath ? ' [SUDDEN DEATH]' : '';

  console.log('\n' + col('cyan', line()));
  const header = ` RONDE ${view.round}/${view.totalRounds}${suddenLabel} | GILIRAN ${turnNum} | ${view.players[cpIdx].name.toUpperCase()} BERMAIN `;
  console.log(col('cyan', line('═', Math.floor((80 - header.length) / 2))) + col('bold', header) + col('cyan', line('═', Math.ceil((80 - header.length) / 2))));
  console.log(col('cyan', line()));

  // News ticker
  if (view.lastNewsHeadline) {
    console.log(col('yellow', `📰 ${view.lastNewsHeadline}`));
  }

  // Aspects table
  console.log('');
  console.log(col('bold', padRight('  ASPEK', 20) + padRight(p1.name.substring(0, 14), 16) + p2.name.substring(0, 14)));
  console.log(col('dim', '  ' + '─'.repeat(50)));
  for (const aspect of ASPECTS) {
    const v1 = p1.aspects[aspect];
    const v2 = p2.aspects[aspect];
    const bar1 = _bar(v1);
    const bar2 = _bar(v2);
    console.log(
      '  ' + padRight(aspect, 18) +
      padRight(`${col(v1 >= 50 ? 'green' : 'red', String(v1).padStart(3))} ${bar1}`, 24) +
      `${col(v2 >= 50 ? 'green' : 'red', String(v2).padStart(3))} ${bar2}`
    );
  }

  // Active effects
  console.log('');
  for (let i = 0; i < 2; i++) {
    const p = view.players[i];
    const label = `  EFEK AKTIF (${p.name}): `;
    if (p.activeEffects.length === 0) {
      console.log(label + col('dim', '— tidak ada —'));
    } else {
      const effs = p.activeEffects.map(e => {
        const dur = e.durationTurns === -1 ? 'sampai dipakai' : `${e.durationTurns} giliran lagi`;
        return `${col('cyan', e.name)} [${dur}]`;
      }).join(', ');
      console.log(label + effs);
    }
  }

  // Foul play slot for current player
  const cpView = view.players[cpIdx];
  console.log('');
  if (cpView.foulPlayLoaded) {
    console.log('  SLOT FOUL PLAY: ' + col('bgRed', col('bold', ' [ FOUL PLAY DIMUAT ] ')));
  } else {
    console.log('  SLOT FOUL PLAY: ' + col('dim', '[ SLOT KOSONG ]'));
  }

  // Deck info
  console.log('');
  for (let i = 0; i < 2; i++) {
    const p = view.players[i];
    console.log(col('dim', `  ${p.name}: Dek ${p.deckSize} | Tangan ${p.handSize} | Buang ${p.discardSize}`));
  }

  console.log('');
}

function _bar(value) {
  const filled = Math.round(value / 10);
  return '[' + '█'.repeat(filled) + '░'.repeat(10 - filled) + ']';
}

// ── Hand display ──────────────────────────────────────────────────────────────

export function printHand(hand, playerName) {
  console.log(col('bold', `  TANGAN (${playerName}):`));
  console.log('');
  if (hand.length === 0) {
    console.log(col('dim', '  — tangan kosong —'));
    return;
  }
  hand.forEach((card, i) => {
    const colorLabel = card.color === 'red' ? col('red', '[MERAH]') : col('blue', '[BIRU]');
    const typeDisplay = {
      active: col('yellow', '[AKTIF]'),
      passive: col('cyan', '[PASIF]'),
      foulplay: col('bgRed', '[FOUL PLAY]'),
    }[card.type] ?? col('dim', `[${card.type.toUpperCase()}]`);
    console.log(`  ${col('bold', String(i + 1) + '.')} ${card.name} ${colorLabel} ${typeDisplay}`);
    console.log(`     ${col('dim', card.description)}`);
  });
  console.log('');
}

// ── Prompts ───────────────────────────────────────────────────────────────────

export function printPrompt(hasFoulPlayLoaded, hasFoulPlayInHand) {
  console.log('  Pilih kartu (1-N) untuk dimainkan');
  if (hasFoulPlayInHand) {
    console.log(col('yellow', '  L = Muat Foul Play ke slot'));
  }
  if (hasFoulPlayLoaded) {
    console.log(col('red', '  A = Aktifkan Foul Play'));
  }
  process.stdout.write(col('bold', '  > '));
}

export function printMulliganPrompt(playerName, hand) {
  console.log('\n' + col('bold', `=== MULLIGAN — ${playerName} ===`));
  printHand(hand, playerName);
  console.log('  Mau tukar semua kartu? (y/n)');
  process.stdout.write(col('bold', '  > '));
}

// ── Feedback messages ─────────────────────────────────────────────────────────

export function printCardPlayed(playerName, card, effectResults) {
  console.log('');
  const colorLabel = card.color === 'red' ? col('red', '[MERAH]') : col('blue', '[BIRU]');
  console.log(`  ${col('bold', playerName)} memainkan ${col('bold', card.name)} ${colorLabel}`);
  for (const r of effectResults) {
    switch (r.type) {
      case 'growth':
      case 'decay': {
        const sign = r.delta >= 0 ? '+' : '';
        const targetLabel = r.targetPlayer === 'self' ? 'kamu' : 'lawan';
        const aspectLabel = r.target === 'all' ? 'semua aspek' : r.target;
        console.log(`    → ${aspectLabel} ${targetLabel} ${sign}${r.delta}`);
        break;
      }
      case 'cleanse':
        if (r.removed && r.removed.length > 0) {
          console.log(`    → Efek negatif dibersihkan: ${r.removed.join(', ')}`);
        } else {
          console.log(`    → Tidak ada efek negatif untuk dibersihkan`);
        }
        break;
      case 'draw':
        console.log(`    → Tarik ${r.delta} kartu tambahan`);
        break;
      case 'aura': {
        const aspectLabel = r.target === 'all' ? 'semua aspek' : r.target;
        const whoLabel = r.targetPlayer === 'self' ? 'kamu' : 'lawan';
        console.log(`    → ${aspectLabel} ${whoLabel} bertick selama ${r.durationTurns} giliran`);
        break;
      }
      case 'amplify':
        console.log(`    → Amplify aktif — kartu AKTIF berikutnya mendapat +50% efek`);
        break;
      case 'lock':
        console.log(`    → Lawan tidak bisa memainkan kartu ${r.target === 'active' ? 'AKTIF' : r.target.toUpperCase()} selama ${r.durationTurns} giliran`);
        break;
      case 'reveal':
        console.log(`    → Melihat 1 kartu lawan selama ${r.durationTurns} giliran`);
        break;
      case 'suppress':
        console.log(`    → ${r.target} lawan disupres selama ${r.durationTurns} giliran`);
        break;
      default:
        console.log(`    → ${r.type}`);
    }
  }
}

export function printFoulPlayResult(playerName, card, result) {
  console.log('');
  console.log(`  ${col('bgRed', col('bold', ` FOUL PLAY: ${card.name} `))} diaktifkan oleh ${playerName}`);
  if (result.backfired) {
    console.log(col('red', `  ⚠ BACKFIRE! (${result.chance}% peluang) — ${result.backfireAspect} kamu −15`));
    if (result.forfeit) {
      console.log(col('bgRed', col('bold', '  PERTANDINGAN BERAKHIR — FOUL PLAY FORFEIT!')));
    }
  } else {
    console.log(col('green', `  Foul Play berhasil! (peluang backfire ${result.chance}%)`));
    if (result.effectResults) {
      for (const r of result.effectResults) {
        if (r.type === 'decay' || r.type === 'growth') {
          const sign = r.delta >= 0 ? '+' : '';
          const targetLabel = r.targetPlayer === 'self' ? 'kamu' : 'lawan';
          const aspectLabel = r.target === 'all' ? 'semua aspek' : r.target;
          console.log(`    → ${aspectLabel} ${targetLabel} ${sign}${r.delta}`);
        }
      }
    }
  }
}

export function printNewsTicker(headline) {
  console.log('\n' + col('yellow', `📰 BERITA: ${headline}`));
}

export function printRoundEnd(roundNumber) {
  console.log('\n' + col('cyan', line('─')) + '\n');
  console.log(centreText(col('bold', `  FIN RONDE ${roundNumber}  `)));
  console.log('\n' + col('cyan', line('─')));
}

export function printError(msg) {
  console.log(col('red', `  ! ${msg}`));
}

// ── End screen ────────────────────────────────────────────────────────────────

export async function printEndScreen(game) {
  const view = game.toView(false);
  const winnerName = view.winner !== null ? view.players[view.winner].name : '???';

  console.log('\n' + col('cyan', line()));
  console.log(centreText(col('bold', col('yellow', '  PERTANDINGAN SELESAI  '))));
  console.log(col('cyan', line()));
  console.log('');

  // Reveal weights one by one with delay
  console.log(col('bold', '  Mengungkap bobot aspek...'));
  console.log('');
  for (const aspect of ASPECTS) {
    await _sleep(300);
    const w = game.weights[aspect];
    const bar = '█'.repeat(Math.round(w / 5));
    console.log(`  ${padRight(aspect, 18)} ${col('cyan', bar.padEnd(20))} ${String(w).padStart(3)}%`);
  }

  console.log('');
  await _sleep(400);

  // Final scores
  console.log(col('bold', '  Skor akhir:'));
  for (let i = 0; i < 2; i++) {
    const p = view.players[i];
    const score = game.weightedScore(i).toFixed(2);
    const label = i === view.winner ? col('green', col('bold', ` ★ ${p.name}: ${score} ◄ PEMENANG`)) : `   ${p.name}: ${score}`;
    await _sleep(300);
    console.log('  ' + label);
  }

  console.log('');
  switch (view.winReason) {
    case WIN_REASON.SCORE:
      console.log(col('dim', '  Kemenangan berdasarkan skor tertinggi.'));
      break;
    case WIN_REASON.FOUL_PLAY_FORFEIT:
      console.log(col('red', '  Kekalahan karena Foul Play backfire saat tertinggal dengan risiko tinggi!'));
      break;
    case WIN_REASON.DECK_OUT:
      console.log(col('red', '  Kekalahan karena kehabisan kartu selama 2 ronde.'));
      break;
    case WIN_REASON.SUDDEN_DEATH:
      console.log(col('yellow', '  Kemenangan dalam sudden death!'));
      break;
  }

  console.log('\n' + col('cyan', line()));
  console.log('');
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Readline wrapper ──────────────────────────────────────────────────────────

export class TerminalIO {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
    this._lineQueue = [];
    this._resolvers = [];
    this.rl.on('line', line => {
      if (this._resolvers.length > 0) {
        this._resolvers.shift()(line.trim());
      } else {
        this._lineQueue.push(line.trim());
      }
    });
  }

  ask(prompt) {
    process.stdout.write(prompt);
    return new Promise(resolve => {
      if (this._lineQueue.length > 0) {
        resolve(this._lineQueue.shift());
      } else {
        this._resolvers.push(resolve);
      }
    });
  }

  close() {
    this.rl.close();
  }
}
