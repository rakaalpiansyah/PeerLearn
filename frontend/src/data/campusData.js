export const UIN_FACULTIES = [
  {
    faculty: "Fakultas Ushuluddin",
    campus: "Kampus 1 Cibiru",
    programs: [
      "UIN SGD Bandung - S1 Aqidah dan Filsafat Islam",
      "UIN SGD Bandung - S1 Ilmu Al-Quran dan Tafsir",
      "UIN SGD Bandung - S1 Ilmu Hadis",
      "UIN SGD Bandung - S1 Studi Agama-Agama",
      "UIN SGD Bandung - S1 Tasawuf dan Psikoterapi",
    ],
  },
  {
    faculty: "Fakultas Tarbiyah dan Keguruan (FTK)",
    campus: "Kampus 1 Cibiru",
    programs: [
      "UIN SGD Bandung - S1 Pendidikan Agama Islam",
      "UIN SGD Bandung - S1 Manajemen Pendidikan Islam",
      "UIN SGD Bandung - S1 Pendidikan Bahasa Arab",
      "UIN SGD Bandung - S1 Pendidikan Bahasa Inggris",
      "UIN SGD Bandung - S1 Pendidikan Matematika",
      "UIN SGD Bandung - S1 Pendidikan Biologi",
      "UIN SGD Bandung - S1 Pendidikan Fisika",
      "UIN SGD Bandung - S1 Pendidikan Kimia",
      "UIN SGD Bandung - S1 Pendidikan Guru Madrasah Ibtidaiyah",
      "UIN SGD Bandung - S1 Pendidikan Islam Anak Usia Dini",
    ],
  },
  {
    faculty: "Fakultas Syariah dan Hukum (FSH)",
    campus: "Kampus 1 Cibiru",
    programs: [
      "UIN SGD Bandung - S1 Hukum Keluarga (Ahwal Al-Syakhshiyah)",
      "UIN SGD Bandung - S1 Hukum Ekonomi Syariah (Muamalah)",
      "UIN SGD Bandung - S1 Hukum Tata Negara (Siyasah)",
      "UIN SGD Bandung - S1 Perbandingan Mazhab",
      "UIN SGD Bandung - S1 Ilmu Hukum",
      "UIN SGD Bandung - S1 Hukum Pidana Islam (Jinayah)",
    ],
  },
  {
    faculty: "Fakultas Dakwah dan Komunikasi (FDK)",
    campus: "Kampus 1 Cibiru",
    programs: [
      "UIN SGD Bandung - S1 Bimbingan dan Konseling Islam",
      "UIN SGD Bandung - S1 Komunikasi dan Penyiaran Islam",
      "UIN SGD Bandung - S1 Manajemen Dakwah",
      "UIN SGD Bandung - S1 Pengembangan Masyarakat Islam",
      "UIN SGD Bandung - S1 Ilmu Komunikasi Jurnalistik",
      "UIN SGD Bandung - S1 Ilmu Komunikasi Humas",
    ],
  },
  {
    faculty: "Fakultas Adab dan Humaniora (FAH)",
    campus: "Kampus 1 Cibiru",
    programs: [
      "UIN SGD Bandung - S1 Sejarah Peradaban Islam",
      "UIN SGD Bandung - S1 Bahasa dan Sastra Arab",
      "UIN SGD Bandung - S1 Sastra Inggris",
    ],
  },
  {
    faculty: "Fakultas Psikologi",
    campus: "Kampus 2 Cimencrang",
    programs: [
      "UIN SGD Bandung - S1 Psikologi",
    ],
  },
  {
    faculty: "Fakultas Sains dan Teknologi (FST)",
    campus: "Kampus 1 Cibiru",
    programs: [
      "UIN SGD Bandung - S1 Teknik Informatika",
      "UIN SGD Bandung - S1 Teknik Elektro",
      "UIN SGD Bandung - S1 Teknik Lingkungan",
      "UIN SGD Bandung - S1 Matematika",
      "UIN SGD Bandung - S1 Fisika",
      "UIN SGD Bandung - S1 Kimia",
      "UIN SGD Bandung - S1 Biologi",
      "UIN SGD Bandung - S1 Agroteknologi",
    ],
  },
  {
    faculty: "Fakultas Ilmu Sosial dan Ilmu Politik (FISIP)",
    campus: "Kampus 2 Cimencrang",
    programs: [
      "UIN SGD Bandung - S1 Administrasi Publik",
      "UIN SGD Bandung - S1 Sosiologi",
      "UIN SGD Bandung - S1 Ilmu Politik",
    ],
  },
  {
    faculty: "Fakultas Ekonomi dan Bisnis Islam (FEBI)",
    campus: "Kampus 2 Cimencrang",
    programs: [
      "UIN SGD Bandung - S1 Manajemen",
      "UIN SGD Bandung - S1 Akuntansi Syariah",
      "UIN SGD Bandung - S1 Ekonomi Syariah",
      "UIN SGD Bandung - S1 Manajemen Keuangan Syariah",
    ],
  },
  {
    faculty: "Pascasarjana UIN SGD Bandung",
    campus: "Kampus 2 Cimencrang",
    programs: [
      "UIN SGD Bandung - Magister (S2) Pascasarjana",
      "UIN SGD Bandung - Doktor (S3) Pascasarjana",
    ],
  },
];

export const UIN_PROGRAM_OPTIONS = UIN_FACULTIES.flatMap((f) => f.programs);

export const SESSION_CATEGORIES = [
  "Teknologi",
  "Teknik Elektro",
  "Teknik Lingkungan",
  "Matematika",
  "Fisika",
  "Kimia",
  "Biologi",
  "Agroteknologi",
  "Sains Data",
  "Ushuluddin & Studi Islam",
  "Pendidikan & Tarbiyah",
  "Hukum & Syariah",
  "Komunikasi & Dakwah",
  "Adab & Humaniora",
  "Psikologi & Konseling",
  "Ilmu Sosial & Politik",
  "Ekonomi & Bisnis Islam",
  "Desain",
  "Bahasa",
  "Soft Skills",
];

export const PRIMARY_CATEGORIES = [
  "Semua",
  "Teknologi",
  "Ekonomi & Bisnis Islam",
  "Hukum & Syariah",
  "Pendidikan & Tarbiyah",
];

export const DEFAULT_UIN_COORDS = {
  lat: "-6.931754",
  lng: "107.717145",
};

export const UIN_CAMPUS_PRESETS = [
  {
    id: "fst-lab",
    shortLabel: "FST & Lab Cibiru",
    icon: "building",
    name: "UIN SGD Kampus 1: Gedung FST & Lab Komputer",
    lat: -6.931754,
    lng: 107.717145,
    building: "Gedung FST Lt. 3 Lab Komputer",
  },
  {
    id: "mipa-lab",
    shortLabel: "Lab Terpadu MIPA",
    icon: "flask",
    name: "UIN SGD Kampus 1: Laboratorium Terpadu MIPA FST",
    lat: -6.93185,
    lng: 107.7173,
    building: "Lab Fisika, Kimia & Biologi Terpadu",
  },
  {
    id: "perpus-cibiru",
    shortLabel: "Perpus Rachmat Djatnika",
    icon: "book",
    name: "UIN SGD Kampus 1: Perpustakaan Rachmat Djatnika",
    lat: -6.9322,
    lng: 107.7175,
    building: "Lt. 2 Area Diskusi Kolaboratif",
  },
  {
    id: "gkb-cibiru",
    shortLabel: "GKB Kampus 1",
    icon: "building",
    name: "UIN SGD Kampus 1: Gedung Kuliah Bersama (GKB)",
    lat: -6.9315,
    lng: 107.7168,
    building: "Selasar & Gazebo Diskusi GKB",
  },
  {
    id: "sc-iqomah",
    shortLabel: "Student Center & Iqomah",
    icon: "compass",
    name: "UIN SGD Kampus 1: Student Center & Masjid Iqomah",
    lat: -6.9312,
    lng: 107.7179,
    building: "Selasar Student Center / Masjid Iqomah",
  },
  {
    id: "fakultas-k1",
    shortLabel: "Gedung Fakultas K1",
    icon: "building",
    name: "UIN SGD Kampus 1: Gedung Fakultas (FU/FTK/FSH/FDK/FAH)",
    lat: -6.93105,
    lng: 107.7174,
    building: "Ruang Diskusi Fakultas Kampus 1 Cibiru",
  },
  {
    id: "k2-gedung",
    shortLabel: "Kampus 2 Cimencrang",
    icon: "mappin",
    name: "UIN SGD Kampus 2: Gedung Perkuliahan Cimencrang",
    lat: -6.9388,
    lng: 107.698,
    building: "Gedung Perkuliahan Kampus 2 (FISIP/FEBI/Psikologi)",
  },
  {
    id: "k2-sc",
    shortLabel: "SC Kampus 2",
    icon: "compass",
    name: "UIN SGD Kampus 2: Student Center & Area Diskusi",
    lat: -6.9385,
    lng: 107.6984,
    building: "Student Center Kampus 2 Cimencrang",
  },
];
