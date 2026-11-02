import React, { useRef } from "react";
import {
  X,
  Award,
  GraduationCap,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { useAuth } from "../../context/AuthContext";

export function TutorSummaryModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const printAreaRef = useRef(null);

  if (!isOpen || !user) return null;

  const masteredSkills =
    user.skills?.filter((s) => s.skill_type === "mastered") || [];
  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const certNumber = `SKPI/PL/${new Date().getFullYear()}/${(
    user.id || "USR"
  )
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="tutor-summary-title">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl print:bg-white print:border-none print:shadow-none print:max-w-none print:max-h-none print:p-0">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-certificate, #printable-certificate * {
              visibility: visible;
            }
            #printable-certificate {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 24px;
              background-color: white !important;
              color: #0f172a !important;
              border: 2px solid #0f172a !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Modal Top Bar (Hidden in Print) */}
        <div className="no-print flex items-center justify-between p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <h2
              id="tutor-summary-title"
              className="text-base font-bold text-slate-900"
            >
              Surat Keterangan Kontribusi Tutor (SKPI)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-10 min-h-10 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-slate-50/50">
          <div
            id="printable-certificate"
            ref={printAreaRef}
            className="p-6 sm:p-8 rounded-2xl bg-white border-2 border-amber-300 text-slate-900 space-y-6 relative overflow-hidden shadow-sm print:border-2 print:border-slate-900 print:bg-white print:text-slate-900 print:rounded-none"
          >
            {/* Watermark / Seal Icon */}
            <div className="absolute right-4 top-4 opacity-5 pointer-events-none">
              <Award className="w-48 h-48 text-amber-500" />
            </div>

            {/* Header / KOP Platform */}
            <div className="text-center space-y-2 border-b border-slate-200 pb-5 print:border-slate-300">
              <div className="flex items-center justify-center gap-2">
                <GraduationCap className="w-6 h-6 text-amber-600 print:text-slate-800" />
                <span className="text-xs font-extrabold tracking-widest uppercase text-amber-700 print:text-slate-800">
                  Fakultas Sains & Teknologi • UIN Sunan Gunung Djati Bandung
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 print:text-slate-950 uppercase">
                Surat Keterangan Kontribusi Tutor Sebaya (SKPI)
              </h1>
              <p className="text-[11px] text-slate-500 print:text-slate-600 font-mono">
                No. Registrasi: {certNumber} • Portofolio Kegiatan Akademik Mahasiswa
              </p>
            </div>

            {/* Statement Lead */}
            <div className="text-xs sm:text-sm text-slate-700 print:text-slate-700 leading-relaxed space-y-2">
              <p>
                Platform Pembelajaran Kolaboratif Mahasiswa{" "}
                <strong className="text-slate-900 print:text-slate-900">
                  PeerLearn
                </strong>{" "}
                menerangkan secara resmi bahwa mahasiswa berikut:
              </p>
            </div>

            {/* Student Info Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 print:bg-slate-50 print:border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                  Nama Mahasiswa
                </span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {user.full_name}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                  Institusi Perguruan Tinggi
                </span>
                <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 print:text-slate-700 shrink-0" />
                  {user.campus_name || "Mahasiswa Terverifikasi"}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                  Akun Kampus Terverifikasi
                </span>
                <p className="font-mono text-slate-700 mt-0.5">
                  {user.email}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                  Poin Kontribusi Tutor
                </span>
                <p className="font-extrabold text-amber-700 print:text-slate-900 text-sm mt-0.5 flex items-center gap-1">
                  <Award className="w-4 h-4 text-amber-600" />
                  {user.contribution_points || 0} Poin Pembelajaran
                </p>
              </div>
            </div>

            {/* Mastered Skills List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 print:text-slate-700" />
                Bidang / Mata Kuliah yang Dikuasai & Dibimbing:
              </span>

              {masteredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {masteredSkills.map((s) => (
                    <span
                      key={s.skill_id}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 print:bg-slate-100 print:text-slate-800 print:border-slate-300"
                    >
                      ✓ {s.skill?.name || "Keahlian"}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 print:text-slate-600 italic">
                  Telah aktif berpartisipasi dalam diskusi kelompok belajar dan pendampingan materi rekan sejawat.
                </p>
              )}
            </div>

            {/* Formal Description */}
            <p className="text-xs text-slate-700 print:text-slate-700 leading-relaxed">
              Telah mendedikasikan waktu dan keahlian akademik untuk mendampingi rekan sejawat secara sukarela tanpa memungut biaya apapun. Dokumen ini dapat digunakan sebagai portofolio akademik, bukti pengabdian sebaya, serta lampiran Surat Keterangan Pendamping Ijazah (SKPI).
            </p>

            {/* Signature & Validation Footer */}
            <div className="pt-4 border-t border-slate-200 print:border-slate-300 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-xs">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] text-slate-500 uppercase block font-medium">
                  Kode Validasi Sistem
                </span>
                <div className="font-mono text-[10px] text-slate-700 bg-slate-100 print:bg-transparent p-1.5 rounded border border-slate-200 print:border-none break-all">
                  SEC-HASH: PL-{(user.id || "").replace(/-/g, "").toUpperCase()}
                </div>
                <p className="text-[10px] text-emerald-700 print:text-emerald-700 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Terverifikasi Otomatis oleh PeerLearn FST UIN SGD Bandung</span>
                </p>
              </div>

              <div className="sm:text-right space-y-1 shrink-0">
                <p className="text-[11px] text-slate-500 print:text-slate-600">
                  Diterbitkan pada: {currentDate}
                </p>
                <div className="h-6 sm:h-10"></div>
                <p className="text-xs font-bold text-slate-900 print:text-slate-900 border-t border-slate-300 print:border-slate-400 pt-1">
                  Koordinator Peer Tutoring FST
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions (Hidden in Print) */}
        <div className="no-print p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <p className="text-xs text-slate-500">
            Dapat dicetak langsung atau disimpan sebagai dokumen PDF.
          </p>
          <div className="flex items-center justify-end gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Tutup
            </Button>
            <Button variant="primary" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
