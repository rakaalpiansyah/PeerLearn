export const RULEBOOK_SECTIONS = [
  {
    type: "allowed",
    title: "100% Bebas Biaya (Zero-Fee)",
    description:
      "Seluruh sesi belajar di PeerLearn bersifat nirlaba. Dilarang memungut iuran komersial, berjualan produk, atau mempromosikan bimbel berbayar.",
  },
  {
    type: "allowed",
    title: "Fokus Pemahaman Konsep & Etika Ruang Kampus",
    description:
      "Diskusi bertujuan memperdalam materi kuliah dan persiapan praktikum. Jaga tutur kata santun serta ketertiban fasilitas kampus (Labkom, Perpustakaan, GKB) saat sesi luring.",
  },
  {
    type: "prohibited",
    title: "Larangan Joki & Kecurangan Akademik",
    description:
      "Dilarang keras menyelenggarakan sesi untuk mengerjakan tugas evaluasi, praktikum, kuis resmi, atau ujian secara langsung (joki akademik).",
  },
  {
    type: "prohibited",
    title: "Anti-Sesi Fiktif & Manipulasi Poin SKPI",
    description:
      "Dilarang membuat sesi palsu atau mendaftar tanpa kehadiran nyata demi mengumpulkan poin SKPI. Pelanggaran akan membatalkan poin dan membatasi akun.",
  },
];

export const RULEBOOK_SANCTIONS = [
  "Teguran tertulis melalui Kotak Masuk Bantuan Admin Komunitas.",
  "Penolakan (rejected) atau penghapusan sesi yang melanggar aturan.",
  "Pembatasan akun sementara (restricted) hingga penangguhan permanen (suspended).",
];

export const SKPI_GUIDE_STEPS = [
  {
    step: 1,
    title: "Penuhi Syarat Kelayakan Sesi",
    description:
      "Selesaikan minimal 1 sesi belajar (berstatus selesai/completed) dengan peserta terkonfirmasi. Kontribusi berlaku bagi Penyelenggara Utama (Host) maupun Co-Tutor yang tergabung.",
  },
  {
    step: 2,
    title: "Akumulasi Poin Kontribusi Komunitas",
    description:
      "Setiap sesi bimbingan yang berhasil dilaksanakan dan memperoleh ulasan positif dari peserta akan menambah +10 hingga +25 Poin Kontribusi Tutor pada profil Anda.",
  },
  {
    step: 3,
    title: "Cetak Portofolio SKPI (Format A4)",
    description:
      "Buka menu Profil → Cetak SKPI untuk mengunduh rekap resmi lengkap dengan Nomor Registrasi Surat, kode hash validasi sistem, daftar mata kuliah yang dibimbing, dan total poin.",
  },
  {
    step: 4,
    title: "Ajukan ke Borang SKPI Prodi / Fakultas",
    description:
      "Lampirkan dokumen PDF tersebut (disertai dokumentasi kegiatan bila diminta) pada borang pengajuan SKPI program studi atau bagian kemahasiswaan fakultas Anda.",
  },
];

export const SKPI_DISCLAIMER =
  "PeerLearn dikelola secara mandiri oleh komunitas mahasiswa (pilot project FST UIN SGD Bandung). Dokumen portofolio ini berfungsi sebagai bukti rekam jejak kontribusi komunitas yang sah secara sistem; besaran konversi poin akhir tetap mengikuti kebijakan verifikator prodi/fakultas masing-masing.";
