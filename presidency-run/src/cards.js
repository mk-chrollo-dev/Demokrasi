// Card registry — pure data, no logic.
//
// Card types:
//   active   — direct aspect score changes / hostile actions
//   passive  — persistent auras, amplifiers, shields, draws, cleanse
//   (foulplay cards use type:'active' with isFoulPlay:true)
//
// Effect triggerOn:
//   'onPlay' — fires once when card is played
//   'tick'   — fires each turn for durationTurns turns
//
// durationTurns: 0 = instant, -1 = until consumed, N = N turns

export const ASPECTS = ['Ekonomi', 'Kesehatan', 'Keamanan', 'Pendidikan', 'Infrastruktur'];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a standard effect object with sensible defaults
// ─────────────────────────────────────────────────────────────────────────────
function fx(type, target, targetPlayer, delta, deltaType, durationTurns, triggerOn, sourceCard, overrides = {}) {
  return {
    type,
    target,
    targetPlayer,
    delta,
    deltaType,
    durationTurns,
    triggerOn,
    condition: null,
    exclusive: false,
    sourceCard,
    ...overrides,
  };
}

// Shorthand helpers
const growth  = (target, delta, src, extra = {}) => fx('growth',  target, 'self',     delta,  'flat', 0,  'onPlay', src, extra);
const decay   = (target, delta, src, extra = {}) => fx('decay',   target, 'opponent', delta,  'flat', 0,  'onPlay', src, extra);
const aura    = (target, delta, dur, src)        => fx('aura',    target, 'self',     delta,  'flat', dur, 'tick',  src);
const cleanse = (src)                            => fx('cleanse', 'negative', 'self', 0, 'flat', 0, 'onPlay', src);
const draw    = (n, src)                         => fx('draw',    'self',     'self',  n,      'flat', 0,  'onPlay', src);

// ─────────────────────────────────────────────────────────────────────────────
// ALL_CARDS — flat array of every card definition
// ─────────────────────────────────────────────────────────────────────────────
const ALL_CARDS = [

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESIDENT 1 — SOEKARNO
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Soekarno Active ────────────────────────────────────────────────────────

  {
    id: 'sno_a01',
    name: 'Pidato Bakar Semangat',
    type: 'active',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Ekonomi kamu +12.',
    effects: [
      growth('Ekonomi', 12, 'Pidato Bakar Semangat'),
    ],
  },

  {
    id: 'sno_a02',
    name: 'Janji Kemakmuran',
    type: 'active',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Ekonomi kamu +10, Kesehatan kamu +6, Keamanan kamu −5.',
    effects: [
      growth('Ekonomi',   10, 'Janji Kemakmuran'),
      growth('Kesehatan',  6, 'Janji Kemakmuran'),
      growth('Keamanan',  -5, 'Janji Kemakmuran'),
    ],
  },

  {
    id: 'sno_a03',
    name: 'Anti-Imperialisme',
    type: 'active',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Keamanan kamu +8, Ekonomi lawan −10.',
    effects: [
      growth('Keamanan', 8, 'Anti-Imperialisme'),
      decay('Ekonomi', -10, 'Anti-Imperialisme'),
    ],
  },

  {
    id: 'sno_a04',
    name: 'Pidato Anti-Penjajah',
    type: 'active',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Ekonomi lawan −12, Pendidikan lawan −8.',
    effects: [
      decay('Ekonomi',    -12, 'Pidato Anti-Penjajah'),
      decay('Pendidikan',  -8, 'Pidato Anti-Penjajah'),
    ],
  },

  {
    id: 'sno_a05',
    name: 'Aliansi Nasional',
    type: 'active',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Semua aspek kamu +3.',
    effects: [
      growth('all', 3, 'Aliansi Nasional'),
    ],
  },

  {
    id: 'sno_a06',
    name: 'Kunjungan Desa',
    type: 'active',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Ekonomi kamu +8, Infrastruktur kamu +6.',
    effects: [
      growth('Ekonomi',      8, 'Kunjungan Desa'),
      growth('Infrastruktur', 6, 'Kunjungan Desa'),
    ],
  },

  {
    id: 'sno_a07',
    name: 'Debat Nasional',
    type: 'active',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Pendidikan kamu +10, Pendidikan lawan −8.',
    effects: [
      growth('Pendidikan', 10, 'Debat Nasional'),
      decay('Pendidikan',  -8, 'Debat Nasional'),
    ],
  },

  {
    id: 'sno_a09',
    name: 'Framing Anti-Nasional',
    type: 'active',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Keamanan lawan −14; lawan tidak bisa menarik kartu giliran berikutnya.',
    effects: [
      decay('Keamanan', -14, 'Framing Anti-Nasional'),
      fx('skip', 'all', 'opponent', 1, 'flat', 1, 'onPlay', 'Framing Anti-Nasional'),
    ],
  },

  {
    id: 'sno_a10',
    name: 'Gosip Lawan',
    type: 'active',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Pendidikan lawan −10, Keamanan lawan −8.',
    effects: [
      decay('Pendidikan', -10, 'Gosip Lawan'),
      decay('Keamanan',    -8, 'Gosip Lawan'),
    ],
  },

  // ── Soekarno Passive ───────────────────────────────────────────────────────

  {
    id: 'sno_p01',
    name: 'Retorika Revolusi',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Semua aspek kamu +2/giliran selama 3 giliran.',
    effects: [
      aura('all', 2, 3, 'Retorika Revolusi'),
    ],
  },

  {
    id: 'sno_p02',
    name: 'Koalisi Lintas Partai',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Semua aspek kamu +1/giliran selama 5 giliran.',
    effects: [
      aura('all', 1, 5, 'Koalisi Lintas Partai'),
    ],
  },

  {
    id: 'sno_p03',
    name: 'Manifesto Rakyat',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Ekonomi kamu +6/giliran selama 3 giliran; Pendidikan kamu +5/giliran selama 3 giliran.',
    effects: [
      aura('Ekonomi',    6, 3, 'Manifesto Rakyat'),
      aura('Pendidikan', 5, 3, 'Manifesto Rakyat'),
    ],
  },

  {
    id: 'sno_p04',
    name: 'Mobilisasi Pemuda',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Pendidikan kamu +7/giliran selama 3 giliran.',
    effects: [
      aura('Pendidikan', 7, 3, 'Mobilisasi Pemuda'),
    ],
  },

  {
    id: 'sno_p05',
    name: 'Relawan Spontan',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Semua aspek kamu +4 seketika; tarik 1 kartu.',
    effects: [
      growth('all', 4, 'Relawan Spontan'),
      draw(1, 'Relawan Spontan'),
    ],
  },

  {
    id: 'sno_p06',
    name: 'Bersihkan Citra',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Bersihkan semua efek negatif dari papan kamu.',
    effects: [
      cleanse('Bersihkan Citra'),
    ],
  },

  {
    id: 'sno_p07',
    name: 'Sukarelawan Lapangan',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Ekonomi kamu +5 seketika, Infrastruktur kamu +5 seketika.',
    effects: [
      growth('Ekonomi',      5, 'Sukarelawan Lapangan'),
      growth('Infrastruktur', 5, 'Sukarelawan Lapangan'),
    ],
  },

  {
    id: 'sno_p08',
    name: 'Siaran Radio Kampanye',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Kartu Active berikutnya mendapat efek +50% (sekali pakai).',
    effects: [
      fx('amplify', 'all', 'self', 50, 'flat', -1, 'onPlay', 'Siaran Radio Kampanye', { exclusive: true, remainingUses: 1 }),
    ],
  },

  {
    id: 'sno_p09',
    name: 'Massa Terorganisir',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soekarno',
    description: 'Keamanan kamu +5/giliran selama 3 giliran; Ekonomi kamu +4/giliran selama 3 giliran.',
    effects: [
      aura('Keamanan', 5, 3, 'Massa Terorganisir'),
      aura('Ekonomi',  4, 3, 'Massa Terorganisir'),
    ],
  },

  // ── Soekarno Foul Play ─────────────────────────────────────────────────────

  {
    id: 'sno_fp01',
    name: 'Kotak Suara Ajaib',
    type: 'active',
    isFoulPlay: true,
    owner: 'soekarno',
    description: 'Semua aspek kamu +12 seketika; semua aspek lawan −8 seketika; lawan dilewati 1 giliran.',
    effects: [
      growth('all', 12, 'Kotak Suara Ajaib'),
      fx('decay', 'all', 'opponent', -8, 'flat', 0, 'onPlay', 'Kotak Suara Ajaib'),
      fx('skip', 'all', 'opponent', 1, 'flat', 1, 'onPlay', 'Kotak Suara Ajaib'),
    ],
  },

  {
    id: 'sno_fp02',
    name: 'Massa Mengambil Alih',
    type: 'active',
    isFoulPlay: true,
    owner: 'soekarno',
    description: 'Curi 20 dari aspek tertinggi dan 20 dari aspek kedua-tertinggi lawan; blokir kartu Active lawan 2 giliran; Ekonomi kamu +10.',
    effects: [
      fx('multi_steal', 'all', 'opponent', 0, 'flat', 0, 'onPlay', 'Massa Mengambil Alih', {
        pairs: [{ rank: 'highest', amount: 20 }, { rank: '2nd_highest', amount: 20 }],
      }),
      fx('block_active_play', 'all', 'opponent', 0, 'flat', 2, 'onPlay', 'Massa Mengambil Alih'),
      growth('Ekonomi', 10, 'Massa Mengambil Alih'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESIDENT 2 — SOEHARTO
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Soeharto Active ────────────────────────────────────────────────────────

  {
    id: 'har_a01',
    name: 'Rekam Jejak Pembangunan',
    type: 'active',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Infrastruktur kamu +16, Ekonomi kamu +8.',
    effects: [
      growth('Infrastruktur', 16, 'Rekam Jejak Pembangunan'),
      growth('Ekonomi',        8, 'Rekam Jejak Pembangunan'),
    ],
  },

  {
    id: 'har_a02',
    name: 'Janji Pertumbuhan Ekonomi',
    type: 'active',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Ekonomi kamu +18.',
    effects: [
      growth('Ekonomi', 18, 'Janji Pertumbuhan Ekonomi'),
    ],
  },

  {
    id: 'har_a03',
    name: 'Program Swasembada',
    type: 'active',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Kesehatan kamu +10, Pendidikan kamu +6.',
    effects: [
      growth('Kesehatan',  10, 'Program Swasembada'),
      growth('Pendidikan',  6, 'Program Swasembada'),
    ],
  },

  {
    id: 'har_a04',
    name: 'Stabilitas di Atas Segalanya',
    type: 'active',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Keamanan kamu +14.',
    effects: [
      growth('Keamanan', 14, 'Stabilitas di Atas Segalanya'),
    ],
  },

  {
    id: 'har_a05',
    name: 'Serangan Fajar Terorganisir',
    type: 'active',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Ekonomi kamu +10, Infrastruktur kamu +8.',
    effects: [
      growth('Ekonomi',      10, 'Serangan Fajar Terorganisir'),
      growth('Infrastruktur',  8, 'Serangan Fajar Terorganisir'),
    ],
  },

  {
    id: 'har_a06',
    name: 'Framing Provokator',
    type: 'active',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Keamanan lawan −14, Pendidikan lawan −8.',
    effects: [
      decay('Keamanan',   -14, 'Framing Provokator'),
      decay('Pendidikan',  -8, 'Framing Provokator'),
    ],
  },

  {
    id: 'har_a07',
    name: 'Reshuffle Narasi',
    type: 'active',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Hapus 1 efek positif terkuat dari papan lawan; Pendidikan lawan −8.',
    effects: [
      fx('hostile_cleanse', 'all', 'opponent', 1, 'flat', 0, 'onPlay', 'Reshuffle Narasi'),
      decay('Pendidikan', -8, 'Reshuffle Narasi'),
    ],
  },

  {
    id: 'har_a08',
    name: 'Intimidasi Halus',
    type: 'active',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Lawan tidak bisa memainkan kartu Active selama 2 giliran.',
    effects: [
      fx('block_active_play',  'all', 'opponent', 0, 'flat', 2, 'onPlay', 'Intimidasi Halus'),
    ],
  },

  {
    id: 'har_a09',
    name: 'Arsip Lama',
    type: 'active',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Keamanan lawan −16; lawan tidak bisa menarik kartu selama 2 giliran.',
    effects: [
      decay('Keamanan', -16, 'Arsip Lama'),
      fx('block_draw', 'all', 'opponent', 0, 'flat', 2, 'onPlay', 'Arsip Lama'),
    ],
  },

  {
    id: 'har_a10',
    name: 'Kampanye Tanpa Lawan',
    type: 'active',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Ekonomi lawan −12, Infrastruktur lawan −10.',
    effects: [
      decay('Ekonomi',      -12, 'Kampanye Tanpa Lawan'),
      decay('Infrastruktur', -10, 'Kampanye Tanpa Lawan'),
    ],
  },

  // ── Soeharto Passive ───────────────────────────────────────────────────────

  {
    id: 'har_p01',
    name: 'Mesin Golkar',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Semua aspek kamu +3/giliran selama 5 giliran.',
    effects: [
      aura('all', 3, 5, 'Mesin Golkar'),
    ],
  },

  {
    id: 'har_p02',
    name: 'Dana Kampanye Tak Terbatas',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Ekonomi kamu +6/giliran selama 5 giliran.',
    effects: [
      aura('Ekonomi', 6, 5, 'Dana Kampanye Tak Terbatas'),
    ],
  },

  {
    id: 'har_p03',
    name: 'Jaringan Birokrasi',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Infrastruktur kamu +5/giliran selama 3 giliran; Keamanan kamu +4/giliran selama 3 giliran.',
    effects: [
      aura('Infrastruktur', 5, 3, 'Jaringan Birokrasi'),
      aura('Keamanan',      4, 3, 'Jaringan Birokrasi'),
    ],
  },

  {
    id: 'har_p04',
    name: 'Pembangunan Sebagai Narasi',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Infrastruktur kamu +8/giliran selama 3 giliran.',
    effects: [
      aura('Infrastruktur', 8, 3, 'Pembangunan Sebagai Narasi'),
    ],
  },

  {
    id: 'har_p05',
    name: 'Bapakisme',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Bersihkan semua efek negatif dari papan kamu; semua aspek kamu +3 seketika.',
    effects: [
      cleanse('Bapakisme'),
      growth('all', 3, 'Bapakisme'),
    ],
  },

  {
    id: 'har_p06',
    name: 'Kepala Desa Loyal',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Ekonomi kamu +6/giliran selama 3 giliran.',
    effects: [
      aura('Ekonomi', 6, 3, 'Kepala Desa Loyal'),
    ],
  },

  {
    id: 'har_p07',
    name: 'TVRI Satu Channel',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soeharto',
    description: '2 kartu Active berikutnya masing-masing mendapat efek +50% flat.',
    effects: [
      fx('amplify', 'all', 'self', 50, 'flat', -1, 'onPlay', 'TVRI Satu Channel', { exclusive: true, remainingUses: 2 }),
    ],
  },

  {
    id: 'har_p08',
    name: 'Pendukung PNS',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Semua aspek kamu +4 seketika; tarik 1 kartu.',
    effects: [
      growth('all', 4, 'Pendukung PNS'),
      draw(1, 'Pendukung PNS'),
    ],
  },

  {
    id: 'har_p09',
    name: 'Stabilisasi Harga',
    type: 'passive',
    isFoulPlay: false,
    owner: 'soeharto',
    description: 'Kesehatan kamu +6/giliran selama 3 giliran; Ekonomi kamu +5/giliran selama 3 giliran.',
    effects: [
      aura('Kesehatan', 6, 3, 'Stabilisasi Harga'),
      aura('Ekonomi',   5, 3, 'Stabilisasi Harga'),
    ],
  },

  // ── Soeharto Foul Play ─────────────────────────────────────────────────────

  {
    id: 'har_fp01',
    name: 'Kandidat Tunggal',
    type: 'active',
    isFoulPlay: true,
    owner: 'soeharto',
    description: 'Lawan buang seluruh tangan, ambil ulang 2 kartu; kunci slot foul play lawan 3 giliran; blokir kartu Active lawan 2 giliran; semua aspek kamu +10.',
    effects: [
      fx('force_discard_hand', 'all', 'opponent', 2, 'flat', 0, 'onPlay', 'Kandidat Tunggal'),
      fx('lock_foulplay_slot', 'all', 'opponent', 0, 'flat', 3, 'onPlay', 'Kandidat Tunggal'),
      fx('block_active_play',  'all', 'opponent', 0, 'flat', 2, 'onPlay', 'Kandidat Tunggal'),
      growth('all', 10, 'Kandidat Tunggal'),
    ],
  },

  {
    id: 'har_fp02',
    name: 'Operasi Intelijen',
    type: 'active',
    isFoulPlay: true,
    owner: 'soeharto',
    description: 'Tangan lawan terungkap permanen; semua aspek lawan −15; Keamanan kamu +15; semua efek aktif lawan dihapus.',
    effects: [
      fx('reveal_hand_permanent', 'all', 'opponent', 0, 'flat', -1, 'onPlay', 'Operasi Intelijen'),
      fx('decay', 'all', 'opponent', -15, 'flat', 0, 'onPlay', 'Operasi Intelijen'),
      growth('Keamanan', 15, 'Operasi Intelijen'),
      fx('nullify_effect_stack', 'all', 'opponent', 0, 'flat', 0, 'onPlay', 'Operasi Intelijen'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESIDENT 3 — MEGAWATI
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Megawati Active ────────────────────────────────────────────────────────

  {
    id: 'meg_a01',
    name: 'Nama Besar Soekarno',
    type: 'active',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Ekonomi kamu +12, Pendidikan kamu +8.',
    effects: [
      growth('Ekonomi',    12, 'Nama Besar Soekarno'),
      growth('Pendidikan',  8, 'Nama Besar Soekarno'),
    ],
  },

  {
    id: 'meg_a02',
    name: 'Janji PDI-P',
    type: 'active',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Ekonomi kamu +10, Kesehatan kamu +8.',
    effects: [
      growth('Ekonomi',   10, 'Janji PDI-P'),
      growth('Kesehatan',  8, 'Janji PDI-P'),
    ],
  },

  {
    id: 'meg_a03',
    name: 'Pidato Keras',
    type: 'active',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Keamanan kamu +10, Ekonomi kamu +6.',
    effects: [
      growth('Keamanan', 10, 'Pidato Keras'),
      growth('Ekonomi',   6, 'Pidato Keras'),
    ],
  },

  {
    id: 'meg_a04',
    name: 'Kampanye Gotong Royong',
    type: 'active',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Ekonomi kamu +8, Infrastruktur kamu +6.',
    effects: [
      growth('Ekonomi',      8, 'Kampanye Gotong Royong'),
      growth('Infrastruktur', 6, 'Kampanye Gotong Royong'),
    ],
  },

  {
    id: 'meg_a05',
    name: 'Debat Langsung',
    type: 'active',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Keamanan kamu +14, Pendidikan lawan −8.',
    effects: [
      growth('Keamanan',   14, 'Debat Langsung'),
      decay('Pendidikan',  -8, 'Debat Langsung'),
    ],
  },

  {
    id: 'meg_a06',
    name: 'Serangan Balik',
    type: 'active',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Ekonomi lawan −14, Ekonomi kamu +8.',
    effects: [
      decay('Ekonomi',  -14, 'Serangan Balik'),
      growth('Ekonomi',   8, 'Serangan Balik'),
    ],
  },

  {
    id: 'meg_a07',
    name: 'Bocoran Rekam Jejak',
    type: 'active',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Keamanan lawan −14, Pendidikan lawan −10.',
    effects: [
      decay('Keamanan',   -14, 'Bocoran Rekam Jejak'),
      decay('Pendidikan', -10, 'Bocoran Rekam Jejak'),
    ],
  },

  {
    id: 'meg_a08',
    name: 'Komentar Kontroversial Lawan',
    type: 'active',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Ekonomi lawan −12, Kesehatan lawan −10; passive berikutnya lawan tidak berdampak.',
    effects: [
      decay('Ekonomi',   -12, 'Komentar Kontroversial Lawan'),
      decay('Kesehatan', -10, 'Komentar Kontroversial Lawan'),
      fx('nullify_next_passive', 'all', 'opponent', 0, 'flat', -1, 'onPlay', 'Komentar Kontroversial Lawan'),
    ],
  },

  {
    id: 'meg_a09',
    name: 'Pidato Warisan',
    type: 'active',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Pendidikan kamu +9, Ekonomi kamu +7.',
    effects: [
      growth('Pendidikan', 9, 'Pidato Warisan'),
      growth('Ekonomi',    7, 'Pidato Warisan'),
    ],
  },

  {
    id: 'meg_a10',
    name: 'Turun ke Basis',
    type: 'active',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Ekonomi kamu +8, Keamanan kamu +5.',
    effects: [
      growth('Ekonomi',  8, 'Turun ke Basis'),
      growth('Keamanan', 5, 'Turun ke Basis'),
    ],
  },

  // ── Megawati Passive ───────────────────────────────────────────────────────

  {
    id: 'meg_p01',
    name: 'Mesin PDI-P',
    type: 'passive',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Semua aspek kamu +2/giliran selama 6 giliran.',
    effects: [
      aura('all', 2, 6, 'Mesin PDI-P'),
    ],
  },

  {
    id: 'meg_p02',
    name: 'Loyalitas Banteng',
    type: 'passive',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Ekonomi kamu +6/giliran selama 4 giliran.',
    effects: [
      aura('Ekonomi', 6, 4, 'Loyalitas Banteng'),
    ],
  },

  {
    id: 'meg_p03',
    name: 'Warisan Politik',
    type: 'passive',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Ekonomi kamu +5/giliran selama 3 giliran; Pendidikan kamu +4/giliran selama 3 giliran.',
    effects: [
      aura('Ekonomi',    5, 3, 'Warisan Politik'),
      aura('Pendidikan', 4, 3, 'Warisan Politik'),
    ],
  },

  {
    id: 'meg_p04',
    name: 'Benteng Partai',
    type: 'passive',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Ekonomi kamu terlindungi 2×; Pendidikan kamu terlindungi 2×.',
    effects: [
      fx('shield', 'Ekonomi',    'self', 2, 'flat', -1, 'onPlay', 'Benteng Partai'),
      fx('shield', 'Pendidikan', 'self', 2, 'flat', -1, 'onPlay', 'Benteng Partai'),
    ],
  },

  {
    id: 'meg_p05',
    name: 'Tim Humas Darurat',
    type: 'passive',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Bersihkan semua efek negatif dari papan kamu.',
    effects: [
      cleanse('Tim Humas Darurat'),
    ],
  },

  {
    id: 'meg_p06',
    name: 'Kader Setia',
    type: 'passive',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Ekonomi kamu +6 seketika, Keamanan kamu +5 seketika.',
    effects: [
      growth('Ekonomi',  6, 'Kader Setia'),
      growth('Keamanan', 5, 'Kader Setia'),
    ],
  },

  {
    id: 'meg_p07',
    name: 'Sukarelawan Banteng Muda',
    type: 'passive',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Semua aspek kamu +4 seketika; tarik 1 kartu.',
    effects: [
      growth('all', 4, 'Sukarelawan Banteng Muda'),
      draw(1, 'Sukarelawan Banteng Muda'),
    ],
  },

  {
    id: 'meg_p08',
    name: 'Konferensi Pers Mendadak',
    type: 'passive',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Passive berikutnya lawan tidak berdampak.',
    effects: [
      fx('nullify_next_passive', 'all', 'opponent', 0, 'flat', -1, 'onPlay', 'Konferensi Pers Mendadak'),
    ],
  },

  {
    id: 'meg_p09',
    name: 'Strategi Diam',
    type: 'passive',
    isFoulPlay: false,
    owner: 'megawati',
    description: 'Semua aspek kamu masing-masing terlindungi 1× (5 perisai total).',
    effects: [
      fx('shield', 'Ekonomi',      'self', 1, 'flat', -1, 'onPlay', 'Strategi Diam'),
      fx('shield', 'Kesehatan',    'self', 1, 'flat', -1, 'onPlay', 'Strategi Diam'),
      fx('shield', 'Keamanan',     'self', 1, 'flat', -1, 'onPlay', 'Strategi Diam'),
      fx('shield', 'Pendidikan',   'self', 1, 'flat', -1, 'onPlay', 'Strategi Diam'),
      fx('shield', 'Infrastruktur','self', 1, 'flat', -1, 'onPlay', 'Strategi Diam'),
    ],
  },

  // ── Megawati Foul Play ─────────────────────────────────────────────────────

  {
    id: 'meg_fp01',
    name: 'Tidak Hadir di Pelantikan',
    type: 'active',
    isFoulPlay: true,
    owner: 'megawati',
    description: 'Semua aspek lawan −12; kunci slot foul play lawan 3 giliran; lawan dilewati 1 giliran; Ekonomi kamu +10, Keamanan kamu +8.',
    effects: [
      fx('decay', 'all', 'opponent', -12, 'flat', 0, 'onPlay', 'Tidak Hadir di Pelantikan'),
      fx('lock_foulplay_slot', 'all', 'opponent', 0, 'flat', 3, 'onPlay', 'Tidak Hadir di Pelantikan'),
      fx('skip', 'all', 'opponent', 1, 'flat', 1, 'onPlay', 'Tidak Hadir di Pelantikan'),
      growth('Ekonomi',  10, 'Tidak Hadir di Pelantikan'),
      growth('Keamanan',  8, 'Tidak Hadir di Pelantikan'),
    ],
  },

  {
    id: 'meg_fp02',
    name: 'Konsolidasi Diam-Diam',
    type: 'active',
    isFoulPlay: true,
    owner: 'megawati',
    description: 'Curi 18 Ekonomi, 15 Keamanan, 12 Pendidikan dari lawan; semua aspek kamu +4/giliran selama 3 giliran.',
    effects: [
      fx('multi_steal', 'all', 'opponent', 0, 'flat', 0, 'onPlay', 'Konsolidasi Diam-Diam', {
        pairs: [
          { aspect: 'Ekonomi',    amount: 18 },
          { aspect: 'Keamanan',   amount: 15 },
          { aspect: 'Pendidikan', amount: 12 },
        ],
      }),
      aura('all', 4, 3, 'Konsolidasi Diam-Diam'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESIDENT 4 — PRABOWO
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Prabowo Active ─────────────────────────────────────────────────────────

  {
    id: 'pra_a01',
    name: 'Debat Tegas',
    type: 'active',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Keamanan kamu +10.',
    effects: [
      growth('Keamanan', 10, 'Debat Tegas'),
    ],
  },

  {
    id: 'pra_a02',
    name: 'Visi Indonesia Maju',
    type: 'active',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Ekonomi kamu +8, Infrastruktur kamu +6.',
    effects: [
      growth('Ekonomi',      8, 'Visi Indonesia Maju'),
      growth('Infrastruktur', 6, 'Visi Indonesia Maju'),
    ],
  },

  {
    id: 'pra_a03',
    name: 'Gemoy Offensive',
    type: 'active',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Pendidikan kamu +8, Ekonomi kamu +6.',
    effects: [
      growth('Pendidikan', 8, 'Gemoy Offensive'),
      growth('Ekonomi',    6, 'Gemoy Offensive'),
    ],
  },

  {
    id: 'pra_a04',
    name: 'Kampanye Makan Siang Gratis',
    type: 'active',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Kesehatan kamu +12, Pendidikan kamu +10, Ekonomi kamu −10.',
    effects: [
      growth('Kesehatan',  12, 'Kampanye Makan Siang Gratis'),
      growth('Pendidikan', 10, 'Kampanye Makan Siang Gratis'),
      growth('Ekonomi',   -10, 'Kampanye Makan Siang Gratis'),
    ],
  },

  {
    id: 'pra_a05',
    name: 'Serangan Balik Keras',
    type: 'active',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Keamanan lawan −16, Keamanan kamu +6.',
    effects: [
      decay('Keamanan',  -16, 'Serangan Balik Keras'),
      growth('Keamanan',   6, 'Serangan Balik Keras'),
    ],
  },

  {
    id: 'pra_a06',
    name: 'Menang dari Nol',
    type: 'active',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Semua aspek kamu +3.',
    effects: [
      growth('all', 3, 'Menang dari Nol'),
    ],
  },

  {
    id: 'pra_a07',
    name: 'Rekam Jejak Lawan',
    type: 'active',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Keamanan lawan −12, Pendidikan lawan −10.',
    effects: [
      decay('Keamanan',   -12, 'Rekam Jejak Lawan'),
      decay('Pendidikan', -10, 'Rekam Jejak Lawan'),
    ],
  },

  {
    id: 'pra_a08',
    name: 'Isu Keamanan Nasional',
    type: 'active',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Keamanan lawan −14, Pendidikan lawan −8.',
    effects: [
      decay('Keamanan',   -14, 'Isu Keamanan Nasional'),
      decay('Pendidikan',  -8, 'Isu Keamanan Nasional'),
    ],
  },

  {
    id: 'pra_a09',
    name: 'Koalisi Besar 2024',
    type: 'active',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Semua aspek kamu +4.',
    effects: [
      growth('all', 4, 'Koalisi Besar 2024'),
    ],
  },

  {
    id: 'pra_a10',
    name: 'Konten Viral TikTok',
    type: 'active',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Lihat 3 kartu teratas deck lawan; Pendidikan kamu +8.',
    effects: [
      fx('peek_deck', 'all', 'opponent', 3, 'flat', 0, 'onPlay', 'Konten Viral TikTok'),
      growth('Pendidikan', 8, 'Konten Viral TikTok'),
    ],
  },

  // ── Prabowo Passive ────────────────────────────────────────────────────────

  {
    id: 'pra_p01',
    name: 'Gerindra Mesin',
    type: 'passive',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Semua aspek kamu +2/giliran selama 3 giliran.',
    effects: [
      aura('all', 2, 3, 'Gerindra Mesin'),
    ],
  },

  {
    id: 'pra_p02',
    name: 'Branding Baru',
    type: 'passive',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Pendidikan kamu +4/giliran selama 3 giliran; Ekonomi kamu +3/giliran selama 3 giliran.',
    effects: [
      aura('Pendidikan', 4, 3, 'Branding Baru'),
      aura('Ekonomi',    3, 3, 'Branding Baru'),
    ],
  },

  {
    id: 'pra_p03',
    name: 'Anggaran Kampanye Terorganisir',
    type: 'passive',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Keamanan kamu +3/giliran selama 3 giliran.',
    effects: [
      aura('Keamanan', 3, 3, 'Anggaran Kampanye Terorganisir'),
    ],
  },

  {
    id: 'pra_p04',
    name: 'TKN Prabowo-Gibran',
    type: 'passive',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Semua aspek kamu +2 seketika; tarik 1 kartu.',
    effects: [
      growth('all', 2, 'TKN Prabowo-Gibran'),
      draw(1, 'TKN Prabowo-Gibran'),
    ],
  },

  {
    id: 'pra_p05',
    name: 'Ganti Rugi Citra',
    type: 'passive',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Bersihkan semua efek negatif dari papan kamu.',
    effects: [
      cleanse('Ganti Rugi Citra'),
    ],
  },

  {
    id: 'pra_p06',
    name: 'Relawan Gemoy',
    type: 'passive',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Pendidikan kamu +6 seketika, Ekonomi kamu +5 seketika.',
    effects: [
      growth('Pendidikan', 6, 'Relawan Gemoy'),
      growth('Ekonomi',    5, 'Relawan Gemoy'),
    ],
  },

  {
    id: 'pra_p07',
    name: 'Koalisi Pita Merah',
    type: 'passive',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Semua aspek kamu +2/giliran selama 3 giliran.',
    effects: [
      aura('all', 2, 3, 'Koalisi Pita Merah'),
    ],
  },

  {
    id: 'pra_p08',
    name: 'Narasi Pahlawan',
    type: 'passive',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Keamanan kamu +4/giliran selama 3 giliran.',
    effects: [
      aura('Keamanan', 4, 3, 'Narasi Pahlawan'),
    ],
  },

  {
    id: 'pra_p09',
    name: 'Strategi Sabar',
    type: 'passive',
    isFoulPlay: false,
    owner: 'prabowo',
    description: 'Keamanan kamu terlindungi 1×; Ekonomi kamu terlindungi 1×.',
    effects: [
      fx('shield', 'Keamanan', 'self', 1, 'flat', -1, 'onPlay', 'Strategi Sabar'),
      fx('shield', 'Ekonomi',  'self', 1, 'flat', -1, 'onPlay', 'Strategi Sabar'),
    ],
  },

  // ── Prabowo Foul Play ──────────────────────────────────────────────────────

  {
    id: 'pra_fp01',
    name: 'Dukungan Terakhir Menit',
    type: 'active',
    isFoulPlay: true,
    owner: 'prabowo',
    description: 'Semua aspek kamu +15; semua aspek lawan −10; kunci slot foul play lawan 3 giliran; blokir passive lawan 2 giliran.',
    effects: [
      growth('all', 15, 'Dukungan Terakhir Menit'),
      fx('decay', 'all', 'opponent', -10, 'flat', 0, 'onPlay', 'Dukungan Terakhir Menit'),
      fx('lock_foulplay_slot', 'all', 'opponent', 0, 'flat', 3, 'onPlay', 'Dukungan Terakhir Menit'),
      fx('block_passive_play',  'all', 'opponent', 0, 'flat', 2, 'onPlay', 'Dukungan Terakhir Menit'),
    ],
  },

  {
    id: 'pra_fp02',
    name: 'Operasi Swing State',
    type: 'active',
    isFoulPlay: true,
    owner: 'prabowo',
    description: 'Curi 20 dari aspek tertinggi dan 15 dari aspek kedua-tertinggi lawan; lawan dilewati 2 giliran; Keamanan kamu +12.',
    effects: [
      fx('multi_steal', 'all', 'opponent', 0, 'flat', 0, 'onPlay', 'Operasi Swing State', {
        pairs: [{ rank: 'highest', amount: 20 }, { rank: '2nd_highest', amount: 15 }],
      }),
      fx('skip', 'all', 'opponent', 2, 'flat', 2, 'onPlay', 'Operasi Swing State'),
      growth('Keamanan', 12, 'Operasi Swing State'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESIDENT 5 — JOKOWI
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Jokowi Active ──────────────────────────────────────────────────────────

  {
    id: 'jkw_a01',
    name: 'Blusukan Kampanye',
    type: 'active',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Ekonomi kamu +12, Infrastruktur kamu +8.',
    effects: [
      growth('Ekonomi',      12, 'Blusukan Kampanye'),
      growth('Infrastruktur',  8, 'Blusukan Kampanye'),
    ],
  },

  {
    id: 'jkw_a02',
    name: 'Janji Infrastruktur',
    type: 'active',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Infrastruktur kamu +18.',
    effects: [
      growth('Infrastruktur', 18, 'Janji Infrastruktur'),
    ],
  },

  {
    id: 'jkw_a03',
    name: 'Kartu Indonesia Sehat',
    type: 'active',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Kesehatan kamu +16.',
    effects: [
      growth('Kesehatan', 16, 'Kartu Indonesia Sehat'),
    ],
  },

  {
    id: 'jkw_a04',
    name: 'IKN Nusantara',
    type: 'active',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Infrastruktur kamu +14, Ekonomi kamu −8.',
    effects: [
      growth('Infrastruktur', 14, 'IKN Nusantara'),
      growth('Ekonomi',       -8, 'IKN Nusantara'),
    ],
  },

  {
    id: 'jkw_a05',
    name: 'Debat Wong Cilik',
    type: 'active',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Ekonomi kamu +10, Pendidikan kamu +8.',
    effects: [
      growth('Ekonomi',    10, 'Debat Wong Cilik'),
      growth('Pendidikan',  8, 'Debat Wong Cilik'),
    ],
  },

  {
    id: 'jkw_a06',
    name: 'Serangan Balik Santai',
    type: 'active',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Ekonomi lawan −16, Pendidikan lawan −12.',
    effects: [
      decay('Ekonomi',    -16, 'Serangan Balik Santai'),
      decay('Pendidikan', -12, 'Serangan Balik Santai'),
    ],
  },

  {
    id: 'jkw_a07',
    name: 'Buzzer Army Deploy',
    type: 'active',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Passive berikutnya lawan tidak berdampak; semua aspek lawan −3.',
    effects: [
      fx('nullify_next_passive', 'all', 'opponent', 0, 'flat', -1, 'onPlay', 'Buzzer Army Deploy'),
      decay('all', -3, 'Buzzer Army Deploy'),
    ],
  },

  {
    id: 'jkw_a08',
    name: 'Framing Negatif Lawan',
    type: 'active',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Ekonomi lawan −18, Keamanan lawan −14.',
    effects: [
      decay('Ekonomi',  -18, 'Framing Negatif Lawan'),
      decay('Keamanan', -14, 'Framing Negatif Lawan'),
    ],
  },

  {
    id: 'jkw_a09',
    name: 'Kunjungan Pasar Mendadak',
    type: 'active',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Ekonomi kamu +8, Kesehatan kamu +6.',
    effects: [
      growth('Ekonomi',   8, 'Kunjungan Pasar Mendadak'),
      growth('Kesehatan', 6, 'Kunjungan Pasar Mendadak'),
    ],
  },

  {
    id: 'jkw_a10',
    name: 'Narasi Anti-Elite',
    type: 'active',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Pendidikan kamu +9, semua aspek lawan −2.',
    effects: [
      growth('Pendidikan', 9, 'Narasi Anti-Elite'),
      decay('all',        -2, 'Narasi Anti-Elite'),
    ],
  },

  // ── Jokowi Passive ─────────────────────────────────────────────────────────

  {
    id: 'jkw_p01',
    name: 'Relawan Jokowi Organik',
    type: 'passive',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Semua aspek kamu +2/giliran selama 6 giliran.',
    effects: [
      aura('all', 2, 6, 'Relawan Jokowi Organik'),
    ],
  },

  {
    id: 'jkw_p02',
    name: 'Program Kartu Sakti',
    type: 'passive',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Kesehatan kamu +5/giliran selama 4 giliran; Pendidikan kamu +5/giliran selama 4 giliran.',
    effects: [
      aura('Kesehatan',  5, 4, 'Program Kartu Sakti'),
      aura('Pendidikan', 5, 4, 'Program Kartu Sakti'),
    ],
  },

  {
    id: 'jkw_p03',
    name: 'Koalisi Lanjutkan',
    type: 'passive',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Semua aspek kamu +3/giliran selama 4 giliran.',
    effects: [
      aura('all', 3, 4, 'Koalisi Lanjutkan'),
    ],
  },

  {
    id: 'jkw_p04',
    name: 'Narasi Pembangunan',
    type: 'passive',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Infrastruktur kamu +9/giliran selama 4 giliran.',
    effects: [
      aura('Infrastruktur', 9, 4, 'Narasi Pembangunan'),
    ],
  },

  {
    id: 'jkw_p05',
    name: 'Wong Cilik Turun Tangan',
    type: 'passive',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Ekonomi kamu +5 seketika; tarik 2 kartu.',
    effects: [
      growth('Ekonomi', 5, 'Wong Cilik Turun Tangan'),
      draw(2, 'Wong Cilik Turun Tangan'),
    ],
  },

  {
    id: 'jkw_p06',
    name: 'Tim Pemenangan Nasional',
    type: 'passive',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Bersihkan semua efek negatif dari papan kamu.',
    effects: [
      cleanse('Tim Pemenangan Nasional'),
    ],
  },

  {
    id: 'jkw_p07',
    name: 'Relawan Digital',
    type: 'passive',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Pendidikan kamu +6 seketika, Ekonomi kamu +5 seketika.',
    effects: [
      growth('Pendidikan', 6, 'Relawan Digital'),
      growth('Ekonomi',    5, 'Relawan Digital'),
    ],
  },

  {
    id: 'jkw_p08',
    name: 'Blusukan Media',
    type: 'passive',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Semua aspek kamu +4 seketika; tarik 1 kartu.',
    effects: [
      growth('all', 4, 'Blusukan Media'),
      draw(1, 'Blusukan Media'),
    ],
  },

  {
    id: 'jkw_p09',
    name: 'Infrastruktur sebagai Kampanye',
    type: 'passive',
    isFoulPlay: false,
    owner: 'jokowi',
    description: 'Infrastruktur kamu +6/giliran selama 3 giliran; Ekonomi kamu +4/giliran selama 3 giliran.',
    effects: [
      aura('Infrastruktur', 6, 3, 'Infrastruktur sebagai Kampanye'),
      aura('Ekonomi',       4, 3, 'Infrastruktur sebagai Kampanye'),
    ],
  },

  // ── Jokowi Foul Play ───────────────────────────────────────────────────────

  {
    id: 'jkw_fp01',
    name: 'Dinasti Politik',
    type: 'active',
    isFoulPlay: true,
    owner: 'jokowi',
    description: 'Semua aspek kamu +12; semua aspek lawan −10; kunci slot foul play lawan 3 giliran; duplikasi efek passive terkuat di papan kamu.',
    effects: [
      growth('all', 12, 'Dinasti Politik'),
      fx('decay', 'all', 'opponent', -10, 'flat', 0, 'onPlay', 'Dinasti Politik'),
      fx('lock_foulplay_slot', 'all', 'opponent', 0, 'flat', 3, 'onPlay', 'Dinasti Politik'),
      fx('copy_own_effect', 'all', 'self', 0, 'flat', 0, 'onPlay', 'Dinasti Politik'),
    ],
  },

  {
    id: 'jkw_fp02',
    name: 'Raja Tanpa Mahkota',
    type: 'active',
    isFoulPlay: true,
    owner: 'jokowi',
    description: 'Tukar aspek tertinggi dan terendah lawan; aspek tertinggi kamu +20; lawan tidak bisa menarik kartu 2 giliran; semua efek aktif lawan dihapus.',
    effects: [
      fx('swap_aspects',      'all', 'opponent', 0,  'flat', 0, 'onPlay', 'Raja Tanpa Mahkota'),
      fx('top_aspect_boost',  'all', 'self',     20, 'flat', 0, 'onPlay', 'Raja Tanpa Mahkota'),
      fx('block_draw',        'all', 'opponent', 0,  'flat', 2, 'onPlay', 'Raja Tanpa Mahkota'),
      fx('nullify_effect_stack','all','opponent', 0,  'flat', 0, 'onPlay', 'Raja Tanpa Mahkota'),
    ],
  },

];

// ─────────────────────────────────────────────────────────────────────────────
// Build CARD_REGISTRY — Map<id, cardObject>
// ─────────────────────────────────────────────────────────────────────────────
export const CARD_REGISTRY = new Map(ALL_CARDS.map(card => [card.id, card]));

// ─────────────────────────────────────────────────────────────────────────────
// buildDeck(deckIds) — given an ordered array of card ids (may repeat),
// returns an array of card instances each with a unique instanceId.
// ─────────────────────────────────────────────────────────────────────────────
export function buildDeck(deckIds) {
  return deckIds.map((id, index) => {
    const card = CARD_REGISTRY.get(id);
    if (!card) throw new Error(`buildDeck: unknown card id "${id}"`);
    return { ...card, instanceId: `${id}_${index}` };
  });
}
