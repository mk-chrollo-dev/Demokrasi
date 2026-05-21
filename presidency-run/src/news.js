import { AspectEngine } from './aspects.js';

const HEADLINE_POOL = [
  { headline: 'Harga bahan pokok meroket, inflasi capai rekor tertinggi', aspect: 'Ekonomi', delta: -6 },
  { headline: 'Ekspor batubara melonjak, cadangan devisa meningkat pesat', aspect: 'Ekonomi', delta: 5 },
  { headline: 'Wabah demam berdarah menyebar ke 12 provinsi', aspect: 'Kesehatan', delta: -7 },
  { headline: 'Program vaksinasi nasional raih cakupan 90 persen', aspect: 'Kesehatan', delta: 6 },
  { headline: 'Bom meledak di pasar tradisional, korban berjatuhan', aspect: 'Keamanan', delta: -8 },
  { headline: 'Operasi bersih perbatasan berhasil, jalur penyelundupan ditutup', aspect: 'Keamanan', delta: 5 },
  { headline: 'Anggaran pendidikan disunat demi bayar utang luar negeri', aspect: 'Pendidikan', delta: -5 },
  { headline: 'Beasiswa luar negeri dibuka untuk 10.000 pelajar berprestasi', aspect: 'Pendidikan', delta: 7 },
  { headline: 'Jembatan Kalimantan runtuh, ratusan tertahan', aspect: 'Infrastruktur', delta: -6 },
  { headline: 'Jalan tol Trans-Sumatera resmi beroperasi penuh', aspect: 'Infrastruktur', delta: 6 },
  { headline: 'PHK massal di pabrik tekstil, ribuan buruh menganggur', aspect: 'Ekonomi', delta: -7 },
  { headline: 'Investasi asing naik 40 persen, lapangan kerja terbuka lebar', aspect: 'Ekonomi', delta: 7 },
  { headline: 'Rumah sakit kehabisan stok darah dan obat generik', aspect: 'Kesehatan', delta: -5 },
  { headline: 'BPJS Kesehatan catat surplus pertama dalam sejarah', aspect: 'Kesehatan', delta: 4 },
  { headline: 'Polisi terlibat jaringan narkoba lintas batas', aspect: 'Keamanan', delta: -6 },
  { headline: 'Densus 88 tangkap 30 tersangka teroris dalam sepekan', aspect: 'Keamanan', delta: 4 },
  { headline: 'Ribuan guru honorer mogok, sekolah lumpuh berhari-hari', aspect: 'Pendidikan', delta: -4 },
  { headline: 'Universitas negeri raih peringkat 100 besar Asia', aspect: 'Pendidikan', delta: 5 },
  { headline: 'Banjir bandang hancurkan jembatan di tiga kabupaten', aspect: 'Infrastruktur', delta: -5 },
  { headline: 'Proyek kereta cepat Jakarta-Surabaya dimulai', aspect: 'Infrastruktur', delta: 7 },
  { headline: 'Rupiah tembus Rp 18.000 per dolar, pasar saham anjlok', aspect: 'Ekonomi', delta: -8 },
  { headline: 'Bank sentral stabilkan kurs, kepercayaan investor pulih', aspect: 'Ekonomi', delta: 4 },
  { headline: 'Virus baru terdeteksi, WHO keluarkan peringatan dini', aspect: 'Kesehatan', delta: -8 },
  { headline: 'Posyandu digital diluncurkan di 5.000 desa terpencil', aspect: 'Kesehatan', delta: 3 },
  { headline: 'Konflik agraria berujung bentrokan berdarah di Kaltim', aspect: 'Keamanan', delta: -5 },
  { headline: 'Perlindungan WNI di luar negeri ditingkatkan signifikan', aspect: 'Keamanan', delta: 3 },
  { headline: 'Tawuran pelajar tewaskan dua remaja di ibukota', aspect: 'Pendidikan', delta: -3 },
  { headline: 'Program makan bergizi gratis perbaiki gizi 2 juta murid', aspect: 'Pendidikan', delta: 6 },
  { headline: 'Listrik padam 12 jam, industri manufaktur mati suri', aspect: 'Infrastruktur', delta: -7 },
  { headline: 'Sambungan internet desa capai 80 persen wilayah 3T', aspect: 'Infrastruktur', delta: 5 },
];

export class NewsEngine {
  constructor() {
    this._lastFiredIndex = -1;
  }

  // Returns the fired headline object (does NOT apply weight delta — caller does that)
  fire(weights) {
    const idx = Math.floor(Math.random() * HEADLINE_POOL.length);
    const item = HEADLINE_POOL[idx];
    this._lastFiredIndex = idx;
    const newWeights = AspectEngine.shiftWeight(weights, item.aspect, item.delta);
    return { headline: item.headline, aspect: item.aspect, delta: item.delta, newWeights };
  }
}
