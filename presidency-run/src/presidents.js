import { ASPECTS } from './cards.js';

// Each deckIds array has exactly 20 entries:
//   10 active (a01 ×2, a02-a09 ×1 each)
//    9 passive (p01-p09, all ×1)
//    1 foulplay

export const PRESIDENTS = [
  {
    id: 'soekarno',
    displayName: 'Ir. Soekar-NO',
    tagline: 'Bapak Bangsa. Pidatonya 4 jam, lawannya pingsan duluan.',
    humorBio: [
      'Proklamator kemerdekaan, penulis pidato terpanjang di dunia,',
      'dan arsitek kebijakan luar negeri yang berani — baca: nekat.',
      'PASSIVE ORATOR ULUNG: Tiap ronde, semua aspekmu naik +1',
      'sebelum giliran pertamamu. Belum apa-apa, lawan sudah tertinggal.',
    ],
    passive: {
      description: 'ORATOR ULUNG — Awal setiap ronde: semua aspek +1',
      applyOnRoundFirstTurn(player) {
        for (const a of ASPECTS) player.aspects[a] = Math.min(100, player.aspects[a] + 1);
        return { passive: 'orator_ulung', message: 'Orator Ulung aktif: semua aspek +1' };
      },
    },
    deckIds: [
      'sno_a01', 'sno_a01',
      'sno_a02', 'sno_a03', 'sno_a04', 'sno_a05',
      'sno_a06', 'sno_a07', 'sno_a09', 'sno_a10',
      'sno_p01', 'sno_p02', 'sno_p03', 'sno_p04', 'sno_p05',
      'sno_p06', 'sno_p07', 'sno_p08', 'sno_p09',
      'sno_fp01',
    ],
    foulPlayRegistry: ['sno_fp01', 'sno_fp02'],
  },

  {
    id: 'soeharto',
    displayName: 'Pak HAR-TOOO',
    tagline: '32 tahun, 1 keluarga, semua proyek.',
    humorBio: [
      'Bapak Pembangunan Indonesia. Juga Bapak KKN —',
      'tapi bagian itu tidak masuk buku pelajaran SD.',
      'PASSIVE STABILITAS ORDE BARU: Keamanan mulai 65, Ekonomi mulai 60.',
      'Dua aspek diatur sejak hari pertama. Sangat stabil. Jangan tanya caranya.',
    ],
    passive: {
      description: 'STABILITAS ORDE BARU — Keamanan mulai di 65, Ekonomi mulai di 60',
      applyOnInit(player) {
        player.aspects['Keamanan'] = 65;
        player.aspects['Ekonomi'] = 60;
      },
    },
    deckIds: [
      'har_a01', 'har_a01',
      'har_a02', 'har_a03', 'har_a04', 'har_a05',
      'har_a06', 'har_a07', 'har_a08', 'har_a09',
      'har_p01', 'har_p02', 'har_p03', 'har_p04', 'har_p05',
      'har_p06', 'har_p07', 'har_p08', 'har_p09',
      'har_fp01',
    ],
    foulPlayRegistry: ['har_fp01', 'har_fp02'],
  },

  {
    id: 'megawati',
    displayName: 'Mega-WATI',
    tagline: 'Putri Proklamasi. Jangan bawa pulang tukang bakso.',
    humorBio: [
      'Presiden perempuan pertama Indonesia. Naik karena pendahulunya',
      'dijatuhkan, kalah karena penggantinya lebih ganteng — kata pemilih.',
      'PASSIVE PUTRI PROKLAMASI: Ekonomimu mulai di 58 bukan 50.',
      'Warisan keluarga. Tidak perlu kerja keras untuk yang satu ini.',
    ],
    passive: {
      description: 'PUTRI PROKLAMASI — Ekonomi mulai di 58',
      applyOnInit(player) { player.aspects['Ekonomi'] = 58; },
    },
    deckIds: [
      'meg_a01', 'meg_a01',
      'meg_a02', 'meg_a03', 'meg_a04', 'meg_a05',
      'meg_a06', 'meg_a07', 'meg_a08', 'meg_a09',
      'meg_p01', 'meg_p02', 'meg_p03', 'meg_p04', 'meg_p05',
      'meg_p06', 'meg_p07', 'meg_p08', 'meg_p09',
      'meg_fp01',
    ],
    foulPlayRegistry: ['meg_fp01', 'meg_fp02'],
  },

  {
    id: 'prabowo',
    displayName: 'Pra-BOWO',
    tagline: 'Kalah 2x, menang sekali. Konsistensi dihargai.',
    humorBio: [
      'Mantan jenderal, mantan menantu Soeharto, tiga kali nyalon presiden.',
      'Akhirnya berhasil di percobaan ketiga setelah belajar TikTok.',
      'PASSIVE PANTANG MENYERAH: Awal setiap ronde, aspek di bawah 35 naik +5 (maks +15).',
      'Semakin tertinggal, semakin berbahaya.',
    ],
    passive: {
      description: 'PANTANG MENYERAH — Awal setiap ronde: aspek di bawah 35 → +5 (maks +15/ronde)',
      applyOnRoundFirstTurn(player) {
        const boosts = [];
        let totalBoost = 0;
        const sorted = ASPECTS.slice().sort((a, b) => player.aspects[a] - player.aspects[b]);
        for (const a of sorted) {
          if (player.aspects[a] < 35 && totalBoost < 15) {
            player.aspects[a] = Math.min(100, player.aspects[a] + 5);
            boosts.push(a);
            totalBoost += 5;
          }
        }
        return boosts.length > 0
          ? { passive: 'pantang_menyerah', message: `Pantang Menyerah: ${boosts.join(', ')} +5` }
          : null;
      },
    },
    deckIds: [
      'pra_a01', 'pra_a01',
      'pra_a02', 'pra_a03', 'pra_a04', 'pra_a05',
      'pra_a06', 'pra_a07', 'pra_a08', 'pra_a09',
      'pra_p01', 'pra_p02', 'pra_p03', 'pra_p04', 'pra_p05',
      'pra_p06', 'pra_p07', 'pra_p08', 'pra_p09',
      'pra_fp01',
    ],
    foulPlayRegistry: ['pra_fp01', 'pra_fp02'],
  },

  {
    id: 'jokowi',
    displayName: 'JOKO-WHY',
    tagline: 'Tukang kayu → presiden → bapak mertua wapres.',
    humorBio: [
      'Dari jualan furnitur di Solo ke Istana Negara dalam satu dekade.',
      'Kisah paling inspiratif Indonesia — sampai babak kedua.',
      'PASSIVE BLUSUKAN: Awal setiap ronde, aspek terendah +3 dan lihat 2 kartu teratas deck lawan.',
      'Tahu situasi lebih awal, tetap gerak maju.',
    ],
    passive: {
      description: 'BLUSUKAN — Awal setiap ronde: aspek terendah +3 & lihat 2 kartu teratas deck lawan',
      applyOnRoundFirstTurn(player, opponent) {
        const sorted = ASPECTS.slice().sort((a, b) => player.aspects[a] - player.aspects[b]);
        const lowestAsp = sorted[0];
        player.aspects[lowestAsp] = Math.min(100, player.aspects[lowestAsp] + 3);
        const topCards = opponent.deck.slice(-2).reverse().map(c => c.name);
        return {
          passive: 'blusukan',
          message: `[BLUSUKAN] ${lowestAsp} +3. Kartu berikutnya lawan: ${topCards.length > 0 ? topCards.join(', ') : '(kosong)'}`,
        };
      },
    },
    deckIds: [
      'jkw_a01', 'jkw_a01',
      'jkw_a02', 'jkw_a03', 'jkw_a04', 'jkw_a05',
      'jkw_a06', 'jkw_a07', 'jkw_a08', 'jkw_a09',
      'jkw_p01', 'jkw_p02', 'jkw_p03', 'jkw_p04', 'jkw_p05',
      'jkw_p06', 'jkw_p07', 'jkw_p08', 'jkw_p09',
      'jkw_fp01',
    ],
    foulPlayRegistry: ['jkw_fp01', 'jkw_fp02'],
  },
];

export const PRESIDENT_MAP = new Map(PRESIDENTS.map(p => [p.id, p]));
