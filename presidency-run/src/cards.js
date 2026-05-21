// Card definitions — pure data, no logic.
//
// Three types only:
//   active  — direct, immediate aspect score changes
//   passive — non-direct: persistent auras, amplifiers, locks, draws, cleanse
//   foulplay — loaded into the foul play slot, activated as a free action
//
// Distribution: 10 active, 9 passive, 1 foulplay = 20 total
// Max 2 copies of any non-foulplay card. Max 1 foulplay per deck.

export const CARD_TYPES = {
  ACTIVE: 'active',
  PASSIVE: 'passive',
  FOULPLAY: 'foulplay',
};

export const ASPECTS = ['Ekonomi', 'Kesehatan', 'Keamanan', 'Pendidikan', 'Infrastruktur'];

export const BASE_DECK = [

  // ── ACTIVE (10) — direct immediate aspect changes ────────────────────────────

  {
    id: 'kampanye_ekonomi',
    name: 'Kampanye Ekonomi',
    type: 'active',
    color: 'blue',
    description: 'Ekonomi kamu +12',
    effects: [
      { id: 'ke_grow', type: 'growth', target: 'Ekonomi', targetPlayer: 'self', delta: 12, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Kampanye Ekonomi' },
    ],
  },
  {
    id: 'kampanye_ekonomi',
    name: 'Kampanye Ekonomi',
    type: 'active',
    color: 'blue',
    description: 'Ekonomi kamu +12',
    effects: [
      { id: 'ke_grow', type: 'growth', target: 'Ekonomi', targetPlayer: 'self', delta: 12, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Kampanye Ekonomi' },
    ],
  },

  {
    id: 'krisis_fasilitas',
    name: 'Krisis Fasilitas',
    type: 'active',
    color: 'red',
    description: 'Kesehatan lawan −15',
    effects: [
      { id: 'kf_decay', type: 'decay', target: 'Kesehatan', targetPlayer: 'opponent', delta: -15, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Krisis Fasilitas' },
    ],
  },
  {
    id: 'krisis_fasilitas',
    name: 'Krisis Fasilitas',
    type: 'active',
    color: 'red',
    description: 'Kesehatan lawan −15',
    effects: [
      { id: 'kf_decay', type: 'decay', target: 'Kesehatan', targetPlayer: 'opponent', delta: -15, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Krisis Fasilitas' },
    ],
  },

  {
    id: 'patroli_nasional',
    name: 'Patroli Nasional',
    type: 'active',
    color: 'blue',
    description: 'Keamanan kamu +10',
    effects: [
      { id: 'pn_grow', type: 'growth', target: 'Keamanan', targetPlayer: 'self', delta: 10, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Patroli Nasional' },
    ],
  },

  {
    id: 'potong_anggaran',
    name: 'Potong Anggaran',
    type: 'active',
    color: 'red',
    description: 'Pendidikan lawan −12',
    effects: [
      { id: 'pa_decay', type: 'decay', target: 'Pendidikan', targetPlayer: 'opponent', delta: -12, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Potong Anggaran' },
    ],
  },

  {
    id: 'proyek_mangkrak',
    name: 'Proyek Mangkrak',
    type: 'active',
    color: 'red',
    description: 'Infrastruktur lawan −10, Infrastruktur kamu +5',
    effects: [
      { id: 'pm_opp', type: 'decay', target: 'Infrastruktur', targetPlayer: 'opponent', delta: -10, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Proyek Mangkrak' },
      { id: 'pm_self', type: 'growth', target: 'Infrastruktur', targetPlayer: 'self', delta: 5, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Proyek Mangkrak' },
    ],
  },

  {
    id: 'bantuan_sosial',
    name: 'Bantuan Sosial',
    type: 'active',
    color: 'blue',
    description: 'Kesehatan kamu +10, Pendidikan kamu +6',
    effects: [
      { id: 'bs_kes', type: 'growth', target: 'Kesehatan', targetPlayer: 'self', delta: 10, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Bantuan Sosial' },
      { id: 'bs_pend', type: 'growth', target: 'Pendidikan', targetPlayer: 'self', delta: 6, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Bantuan Sosial' },
    ],
  },

  {
    id: 'skandal_bpjs',
    name: 'Skandal BPJS',
    type: 'active',
    color: 'red',
    description: 'Kesehatan lawan −20, tapi Kesehatan kamu −5',
    effects: [
      { id: 'sbpjs_opp', type: 'decay', target: 'Kesehatan', targetPlayer: 'opponent', delta: -20, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Skandal BPJS' },
      { id: 'sbpjs_self', type: 'decay', target: 'Kesehatan', targetPlayer: 'self', delta: -5, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Skandal BPJS' },
    ],
  },

  {
    id: 'serbu_ekonomi',
    name: 'Serbu Ekonomi',
    type: 'active',
    color: 'red',
    description: 'Ekonomi lawan −10, Ekonomi kamu +5',
    effects: [
      { id: 'se_opp', type: 'decay', target: 'Ekonomi', targetPlayer: 'opponent', delta: -10, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Serbu Ekonomi' },
      { id: 'se_self', type: 'growth', target: 'Ekonomi', targetPlayer: 'self', delta: 5, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Serbu Ekonomi' },
    ],
  },

  // ── PASSIVE (9) — persistent, amplify, control, support ─────────────────────
  // Passive cards never directly change aspect scores on play.
  // They place effects that tick each turn, modify future active cards,
  // control the opponent, or support your hand/board state.

  {
    id: 'koalisi_partai',
    name: 'Koalisi Partai',
    type: 'passive',
    color: 'blue',
    description: 'Semua aspek kamu +3/giliran selama 5 giliran',
    effects: [
      { id: 'kp_aura', type: 'aura', target: 'all', targetPlayer: 'self', delta: 3, deltaType: 'flat', durationTurns: 5, triggerOn: 'tick', condition: null, exclusive: false, sourceCard: 'Koalisi Partai' },
    ],
  },
  {
    id: 'koalisi_partai',
    name: 'Koalisi Partai',
    type: 'passive',
    color: 'blue',
    description: 'Semua aspek kamu +3/giliran selama 5 giliran',
    effects: [
      { id: 'kp_aura', type: 'aura', target: 'all', targetPlayer: 'self', delta: 3, deltaType: 'flat', durationTurns: 5, triggerOn: 'tick', condition: null, exclusive: false, sourceCard: 'Koalisi Partai' },
    ],
  },

  {
    id: 'penurunan_ekonomi',
    name: 'Penurunan Ekonomi',
    type: 'passive',
    color: 'red',
    description: 'Ekonomi lawan −5/giliran selama 4 giliran',
    effects: [
      { id: 'pek_dot', type: 'decay', target: 'Ekonomi', targetPlayer: 'opponent', delta: -5, deltaType: 'flat', durationTurns: 4, triggerOn: 'tick', condition: null, exclusive: false, sourceCard: 'Penurunan Ekonomi' },
    ],
  },

  {
    id: 'viral_medsos',
    name: 'Viral Media Sosial',
    type: 'passive',
    color: 'blue',
    description: 'Kartu Active berikutnya kamu mainkan mendapat +50% efek',
    effects: [
      { id: 'viral_amp', type: 'amplify', target: 'all', targetPlayer: 'self', delta: 50, deltaType: 'percent', durationTurns: -1, triggerOn: 'onPlay', condition: null, exclusive: true, sourceCard: 'Viral Media Sosial' },
    ],
  },

  {
    id: 'bocoran_data',
    name: 'Bocoran Data',
    type: 'passive',
    color: 'blue',
    description: 'Lihat 1 kartu lawan selama 2 giliran',
    effects: [
      { id: 'bd_reveal', type: 'reveal', target: 'opponent', targetPlayer: 'opponent', delta: 0, deltaType: 'flat', durationTurns: 2, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Bocoran Data' },
    ],
  },

  {
    id: 'kebijakan_diblokir',
    name: 'Kebijakan Diblokir',
    type: 'passive',
    color: 'red',
    description: 'Lawan tidak bisa memainkan kartu Active selama 2 giliran',
    effects: [
      { id: 'kb_lock', type: 'lock', target: 'active', targetPlayer: 'opponent', delta: 0, deltaType: 'flat', durationTurns: 2, triggerOn: 'onPlay', condition: null, exclusive: true, sourceCard: 'Kebijakan Diblokir' },
    ],
  },

  {
    id: 'konferensi_pers',
    name: 'Konferensi Pers',
    type: 'passive',
    color: 'blue',
    description: 'Bersihkan semua efek negatif pada kamu; tarik 1 kartu',
    effects: [
      { id: 'kpers_cleanse', type: 'cleanse', target: 'negative', targetPlayer: 'self', delta: 0, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Konferensi Pers' },
      { id: 'kpers_draw', type: 'draw', target: 'self', targetPlayer: 'self', delta: 1, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Konferensi Pers' },
    ],
  },

  {
    id: 'konsentrasi',
    name: 'Konsentrasi Kampanye',
    type: 'passive',
    color: 'blue',
    description: 'Tarik 2 kartu tambahan',
    effects: [
      { id: 'kons_draw', type: 'draw', target: 'self', targetPlayer: 'self', delta: 2, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Konsentrasi Kampanye' },
    ],
  },

  {
    id: 'jaringan_relawan',
    name: 'Jaringan Relawan',
    type: 'passive',
    color: 'blue',
    description: 'Kesehatan +4/giliran dan Pendidikan +4/giliran selama 3 giliran',
    effects: [
      { id: 'jr_kes', type: 'aura', target: 'Kesehatan', targetPlayer: 'self', delta: 4, deltaType: 'flat', durationTurns: 3, triggerOn: 'tick', condition: null, exclusive: false, sourceCard: 'Jaringan Relawan' },
      { id: 'jr_pend', type: 'aura', target: 'Pendidikan', targetPlayer: 'self', delta: 4, deltaType: 'flat', durationTurns: 3, triggerOn: 'tick', condition: null, exclusive: false, sourceCard: 'Jaringan Relawan' },
    ],
  },

  // ── FOUL PLAY (1) ────────────────────────────────────────────────────────────

  {
    id: 'manipulasi_data',
    name: 'Manipulasi Data Pemilu',
    type: 'foulplay',
    color: 'red',
    description: 'Semua aspek lawan −10; Ekonomi lawan disupres 2 giliran',
    effects: [
      { id: 'mdp_blast', type: 'decay', target: 'all', targetPlayer: 'opponent', delta: -10, deltaType: 'flat', durationTurns: 0, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Manipulasi Data Pemilu' },
      { id: 'mdp_suppress', type: 'suppress', target: 'Ekonomi', targetPlayer: 'opponent', delta: 0, deltaType: 'flat', durationTurns: 2, triggerOn: 'onPlay', condition: null, exclusive: false, sourceCard: 'Manipulasi Data Pemilu' },
    ],
  },

];

export function createDeck() {
  return BASE_DECK.map((card, index) => ({ ...card, instanceId: `${card.id}_${index}` }));
}
