import React, { useState, useEffect } from "react";
import {
  X,
  BookOpen,
  Award,
  Shield,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Mail,
  GraduationCap,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

const TABS = [
  { id: "ethics", label: "Etika Belajar", icon: BookOpen },
  { id: "skpi", label: "Panduan SKPI", icon: Award },
  { id: "safety", label: "Keamanan Komunitas", icon: Shield },
  { id: "help", label: "Pusat Bantuan", icon: HelpCircle },
];

export function InfoGuideModal({ isOpen, onClose, initialTab = "ethics" }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="guide-modal-title">
      <div className="relative w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="guide-modal-title"
                className="text-base font-bold text-slate-900 tracking-tight"
              >
                Pusat Informasi & Pedoman Komunitas
              </h2>
              <p className="text-xs text-slate-500">
                Fakultas Sains & Teknologi • UIN Sunan Gunung Djati Bandung
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-10 min-h-10 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-white text-emerald-800 shadow-xs border border-slate-200 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-emerald-700" : "text-slate-400"}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content based on tab */}
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed min-h-[220px]">
          {activeTab === "ethics" && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <p className="font-bold text-emerald-950 text-sm">
                  Komitmen Integritas Belajar Sebaya
                </p>
                <p className="text-emerald-900">
                  PeerLearn dirancang murni sebagai wadah saling mengasah pemahaman konsep perkuliahan dan responsi praktikum laboratorium.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Bimbingan Konsep & Diskusi</p>
                    <p className="text-slate-600">
                      Tutor dan peserta saling bertukar wawasan, cara penyelesaian masalah, serta studi kasus yang belum dipahami di kelas kuliah.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Saling Menghormati & Tanpa Perundungan</p>
                    <p className="text-slate-600">
                      Seluruh anggota berhak bertanya tanpa takut dinilai. Jaga tutur kata yang santun dan profesional.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Larangan Perjokian & Kecurangan</p>
                    <p className="text-slate-600">
                      Dilarang keras menyelenggarakan sesi untuk mengerjakan tugas evaluasi, kuis resmi, atau ujian secara langsung (joki akademik). Pelanggaran berakibat penangguhan akun permanen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "skpi" && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                <p className="font-bold text-amber-900 text-sm">
                  Pengakuan Poin SKPI Kemahasiswaan
                </p>
                <p className="text-amber-800">
                  Aktivitas pendampingan sebaya yang Anda laksanakan sebagai tutor dapat diakui dalam Surat Keterangan Pendamping Ijazah (SKPI).
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Kumpulkan Poin Kontribusi</p>
                    <p className="text-slate-600">
                      Setiap sesi belajar yang Anda bimbing dan berhasil selesai dengan rating positif dari peserta memberikan +10 hingga +25 Poin Kontribusi Tutor.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Ekspor Portofolio Mandiri</p>
                    <p className="text-slate-600">
                      Gunakan fitur <strong>"Cetak SKPI"</strong> di profil Anda untuk mengunduh rekap riwayat sesi bimbingan, tanggal, topik keahlian, dan testimoni rekan belajar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Verifikasi Kemahasiswaan FST</p>
                    <p className="text-slate-600">
                      Bawa cetakan portofolio ke bagian kemahasiswaan program studi atau dekanat FST sebagai bukti pengabdian kemahasiswaan dan tutor sebaya.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "safety" && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900 text-sm">
                  Sistem Moderasi Dua Tahap
                </p>
                <p className="text-slate-600">
                  PeerLearn menerapkan sistem perlindungan komunitas untuk menjaga kenyamanan seluruh mahasiswa.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Tahap 1: Pembatasan Otomatis (≥ 3 Laporan)
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Jika suatu akun menerima 3 atau lebih laporan unik dalam kurun waktu 7 hari, akun tersebut otomatis dibatasi sementara oleh sistem demi pencegahan gangguan meluas.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Tahap 2: Keputusan Administrator Kampus
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Tim administrator memeriksa laporan, keterangan kronologi, dan dapat mengambil keputusan untuk <em>Memulihkan Akses</em> jika laporan keliru, atau <em>Menangguhkan Akun</em> jika terbukti melanggar aturan.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <p className="font-bold text-slate-900 text-xs">
                    Perlindungan Privasi Tautan & Lokasi
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Link Google Meet / Zoom serta nomor kontak tutor hanya dibuka kepada peserta yang permohonannya telah disetujui host.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "help" && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900 text-sm">
                  Pusat Bantuan & Layanan Mahasiswa
                </p>
                <p className="text-slate-600">
                  Mengalami kendala akun, sesi belajar, atau ingin memberikan masukan perbaikan sistem?
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <p className="font-bold text-slate-900 text-xs">Bagaimana jika jadwal sesi bentrok?</p>
                  <p className="text-slate-600 text-[11px]">
                    Penyelenggara (Host) dapat mengajukan <em>Reschedule Jadwal</em> kapan saja melalui menu Sesi Saya. Peserta terdaftar akan menerima notifikasi pembaruan secara instan.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <p className="font-bold text-slate-900 text-xs">Bagaimana jika peserta ingin membatalkan keikutsertaan?</p>
                  <p className="text-slate-600 text-[11px]">
                    Buka menu <strong>"Sesi Saya"</strong>, pilih sesi yang ingin dibatalkan, lalu tekan <em>"Batal Bergabung"</em>. Kuota peserta akan otomatis bertambah kembali untuk mahasiswa lain.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-950 text-xs">Sekretariat Laboratorium FST</p>
                      <p className="text-emerald-800 text-[11px]">Gedung Fakultas Sains & Teknologi Lt. 2</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    fst@uinsgd.ac.id
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
}
