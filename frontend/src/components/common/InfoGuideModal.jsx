import React, { useState, useEffect } from "react";
import {
  X,
  BookOpen,
  Award,
  Shield,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  MessageSquare,
  GraduationCap,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import {
  RULEBOOK_SECTIONS,
  RULEBOOK_SANCTIONS,
  SKPI_GUIDE_STEPS,
  SKPI_DISCLAIMER,
} from "../../constants/communityGuides";

const TABS = [
  { id: "ethics", label: "Rulebook", icon: BookOpen },
  { id: "skpi", label: "Panduan SKPI", icon: Award },
  { id: "safety", label: "Keamanan", icon: Shield },
  { id: "help", label: "Bantuan", icon: HelpCircle },
];

const normalizeTab = (tab) => (tab === "rulebook" ? "ethics" : tab || "ethics");

export function InfoGuideModal({ isOpen, onClose, initialTab = "ethics" }) {
  const [activeTab, setActiveTab] = useState(normalizeTab(initialTab));

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(normalizeTab(initialTab));
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
                Komunitas Belajar Sebaya Mahasiswa • UIN Sunan Gunung Djati
                Bandung
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
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? "text-emerald-700" : "text-slate-400"
                  }`}
                />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content based on tab */}
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed min-h-[240px]">
          {activeTab === "ethics" && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <p className="font-bold text-emerald-950 text-sm">
                  Rulebook & Tata Tertib Komunitas PeerLearn
                </p>
                <p className="text-emerald-900">
                  Seluruh anggota wajib mematuhi aturan ini demi menjaga kultur
                  belajar sebaya yang sehat, aman, dan bebas biaya di lingkungan
                  kampus.
                </p>
              </div>

              <div className="space-y-2.5">
                {RULEBOOK_SECTIONS.map((item) => (
                  <div key={item.title} className="flex items-start gap-2.5">
                    {item.type === "allowed" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-slate-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <p className="font-bold text-slate-900 text-xs">
                  Tingkatan Sanksi Pelanggaran
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
                  {RULEBOOK_SANCTIONS.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {activeTab === "skpi" && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                <p className="font-bold text-amber-900 text-sm">
                  Panduan Klaim Portofolio SKPI Tutor Sebaya
                </p>
                <p className="text-amber-800">
                  Rekam jejak kontribusi Anda sebagai Tutor atau Co-Tutor dapat
                  dicetak sebagai bukti pendampingan akademik untuk pengajuan
                  SKPI.
                </p>
              </div>

              <div className="space-y-2.5">
                {SKPI_GUIDE_STEPS.map((item) => (
                  <div key={item.step} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-xs">
                      {item.step}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-slate-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2 text-[11px] text-slate-600">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p>{SKPI_DISCLAIMER}</p>
              </div>
            </div>
          )}

          {activeTab === "safety" && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900 text-sm">
                  Sistem Moderasi Komunitas Dua Tahap
                </p>
                <p className="text-slate-600">
                  PeerLearn dikelola oleh tim admin komunitas mahasiswa lintas
                  fakultas (dimulai dari pilot project FST) untuk menjaga
                  keamanan setiap sesi belajar.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Tahap 1: Pembatasan Otomatis (≥ 3 Laporan)
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Jika suatu akun menerima 3 atau lebih laporan unik dalam
                    kurun waktu 7 hari, akun tersebut otomatis dibatasi
                    sementara oleh sistem demi mencegah gangguan meluas.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Tahap 2: Peninjauan Tim Admin Komunitas
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Admin komunitas memeriksa kronologi laporan berdasarkan
                    Rulebook, lalu memutuskan untuk <em>Memulihkan Akses</em>{" "}
                    jika laporan keliru atau <em>Menangguhkan Akun</em> jika
                    terbukti melanggar.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <p className="font-bold text-slate-900 text-xs">
                    Perlindungan Privasi Tautan & Lokasi
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Link Google Meet / Zoom serta detail lokasi pertemuan hanya
                    terbuka kepada peserta yang permohonannya telah disetujui
                    oleh penyelenggara.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "help" && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900 text-sm">
                  Pusat Bantuan & Layanan Anggota
                </p>
                <p className="text-slate-600">
                  Mengalami kendala akun, jadwal sesi, atau ingin memberi
                  masukan untuk pengembangan komunitas?
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <p className="font-bold text-slate-900 text-xs">
                    Bagaimana jika jadwal sesi bentrok?
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Penyelenggara (Host) dapat menekan tombol{" "}
                    <em>Jadwalkan Ulang / Reschedule</em> pada detail sesi kapan
                    saja. Peserta yang sudah diterima otomatis tetap terdaftar
                    di jadwal baru.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <p className="font-bold text-slate-900 text-xs">
                    Bagaimana jika peserta ingin membatalkan keikutsertaan?
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Buka menu <strong>&quot;Sesi Saya&quot;</strong>, pilih sesi
                    terkait, lalu tekan <em>&quot;Batal Ikut Sesi&quot;</em>.
                    Kuota peserta akan otomatis kembali tersedia bagi mahasiswa
                    lain.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5">
                  <MessageSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-950 text-xs">
                      Hubungi Tim Admin Komunitas PeerLearn
                    </p>
                    <p className="text-emerald-800 text-[11px]">
                      Gunakan menu <strong>Bantuan Admin</strong> di bilah
                      navigasi setelah login untuk mengirim pesan langsung ke
                      tim pengelola yang sedang bertugas.
                    </p>
                  </div>
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
