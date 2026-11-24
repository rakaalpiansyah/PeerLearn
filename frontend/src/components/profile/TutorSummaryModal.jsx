import React, { useRef, useState, useEffect } from "react";
import {
  X,
  Award,
  GraduationCap,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  BookOpen,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { membershipApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { buildSKPIVerifyUrl } from "../../utils/sessionRoute";

export function TutorSummaryModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const printAreaRef = useRef(null);
  const [sessions, setSessions] = useState({ hosted: [], joined: [] });
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);
  const [copiedVerifyUrl, setCopiedVerifyUrl] = useState(false);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    let cancelled = false;
    setLoadingSessions(true);
    setSessionsError(null);

    membershipApi
      .getMySessions()
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res?.data) {
          setSessions({
            hosted: res.data.hosted || [],
            joined: res.data.joined || [],
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setSessionsError(
          err?.message || "Riwayat sesi terverifikasi belum dapat dimuat."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSessions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  const masteredSkills =
    user.skills?.filter((s) => s.skill_type === "mastered") || [];
  const verifiedHosted = (sessions.hosted || []).filter(
    (g) => g.status === "completed"
  );
  const verifiedAttended = (sessions.joined || []).filter(
    (g) => g.user_membership === "attended"
  );
  const totalVerifiedSessions = verifiedHosted.length + verifiedAttended.length;
  const canPrint =
    (user.contribution_points || 0) > 0 || totalVerifiedSessions > 0;
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

  const verifyUrl = buildSKPIVerifyUrl(user.id);
  const handleCopyVerifyUrl = async () => {
    if (!verifyUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(verifyUrl);
      }
      setCopiedVerifyUrl(true);
      setTimeout(() => setCopiedVerifyUrl(false), 2500);
    } catch {
      setCopiedVerifyUrl(true);
      setTimeout(() => setCopiedVerifyUrl(false), 2500);
    }
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
            className="min-w-10 min-h-10 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
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
                  PeerLearn • UIN Sunan Gunung Djati Bandung
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
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 print:text-slate-700 shrink-0" />
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
                <BookOpen className="w-3.5 h-3.5 text-emerald-700 print:text-slate-700" />
                Bidang / Mata Kuliah yang Dikuasai & Dibimbing:
              </span>

              {masteredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {masteredSkills.map((s) => (
                    <span
                      key={s.skill_id}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-900 print:bg-white print:text-black print:border-slate-400"
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

            {/* Verified Activity Metrics */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:bg-white print:border-slate-300">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                  Poin Kontribusi
                </span>
                <p className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5">
                  {user.contribution_points || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:bg-white print:border-slate-300">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                  Sesi Tutor Selesai
                </span>
                <p className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5">
                  {verifiedHosted.length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:bg-white print:border-slate-300">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                  Kehadiran Terverifikasi
                </span>
                <p className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5">
                  {verifiedAttended.length}
                </p>
              </div>
            </div>

            {/* Verified Session Transcript Table */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700 print:text-black" />
                Riwayat Sesi Terverifikasi (SKPI)
              </span>

              {loadingSessions ? (
                <div className="space-y-2 no-print" aria-label="Memuat riwayat sesi">
                  <div className="h-8 rounded-lg bg-slate-100 animate-pulse" />
                  <div className="h-8 rounded-lg bg-slate-100 animate-pulse" />
                </div>
              ) : sessionsError ? (
                <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5 print:text-black print:bg-white print:border-slate-300">
                  {sessionsError} Ringkasan poin dan keahlian tetap dapat dilihat.
                </p>
              ) : totalVerifiedSessions === 0 ? (
                <p className="text-xs text-slate-600 italic">
                  Belum ada sesi selesai atau kehadiran terverifikasi yang tercatat pada sistem.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 print:border-slate-300">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-600 print:bg-white print:text-black">
                      <tr>
                        <th scope="col" className="py-2 px-3 font-semibold">Tanggal</th>
                        <th scope="col" className="py-2 px-3 font-semibold">Judul Sesi</th>
                        <th scope="col" className="py-2 px-3 font-semibold">Kategori</th>
                        <th scope="col" className="py-2 px-3 font-semibold">Peran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                      {verifiedHosted.map((g) => (
                        <tr key={`host-${g.id}`}>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap print:text-black">
                            {new Date(g.start_time).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 print:text-black">
                            {g.title}
                          </td>
                          <td className="py-2 px-3 text-slate-600 print:text-black">
                            {g.category}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 print:bg-white print:text-black print:border-slate-400">
                              {g.viewer_role === "cohost" ? "Co-Tutor" : "Tutor"} ({g.attended_count || 0} hadir)
                            </span>
                          </td>
                        </tr>
                      ))}
                      {verifiedAttended.map((g) => (
                        <tr key={`join-${g.id}`}>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap print:text-black">
                            {new Date(g.start_time).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 print:text-black">
                            {g.title}
                          </td>
                          <td className="py-2 px-3 text-slate-600 print:text-black">
                            {g.category}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 print:bg-white print:text-black print:border-slate-400">
                              Peserta Hadir
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Formal Description */}
            <p className="text-xs text-slate-700 print:text-slate-700 leading-relaxed">
              Telah mendedikasikan waktu dan keahlian akademik untuk mendampingi rekan sejawat secara sukarela tanpa memungut biaya apapun. Dokumen ini dapat digunakan sebagai portofolio akademik, bukti pengabdian sebaya, serta lampiran Surat Keterangan Pendamping Ijazah (SKPI).
            </p>

            {/* Signature & Validation Footer */}
            <div className="pt-4 border-t border-slate-200 print:border-slate-300 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-xs">
              <div className="space-y-1.5 min-w-0">
                <span className="text-[10px] text-slate-500 uppercase block font-medium">
                  Kode Validasi & Verifikasi Online
                </span>
                <div className="font-mono text-[10px] text-slate-700 bg-slate-100 print:bg-transparent p-1.5 rounded border border-slate-200 print:border-none break-all">
                  SEC-HASH: PL-{(user.id || "").replace(/-/g, "").toUpperCase()}
                </div>
                {verifyUrl && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-600 break-all">
                      {verifyUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyVerifyUrl}
                      className="no-print min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-800 text-[11px] font-semibold transition-colors"
                    >
                      {copiedVerifyUrl ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                          <span>Link Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" aria-hidden="true" />
                          <span>Salin Link Verifikasi</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-emerald-700 print:text-emerald-700 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Terverifikasi Otomatis oleh PeerLearn UIN SGD Bandung</span>
                </p>
              </div>

              <div className="sm:text-right space-y-1 shrink-0">
                <p className="text-[11px] text-slate-500 print:text-slate-600">
                  Diterbitkan pada: {currentDate}
                </p>
                <div className="h-6 sm:h-10"></div>
                <p className="text-xs font-bold text-slate-900 print:text-slate-900 border-t border-slate-300 print:border-slate-400 pt-1">
                  Koordinator Peer Tutoring UIN SGD Bandung
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions (Hidden in Print) */}
        <div className="no-print p-4 sm:p-5 border-t border-slate-100 flex flex-col gap-3 bg-slate-50/70">
          {!canPrint && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              Pencetakan surat SKPI memerlukan minimal 1 poin kontribusi atau 1 sesi terverifikasi setelah Anda menyelesaikan sesi sebagai tutor atau peserta hadir.
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-600">
              {!canPrint
                ? "Selesaikan minimal satu sesi tutor atau kehadiran terverifikasi untuk mengaktifkan cetak SKPI."
                : "Dapat dicetak langsung atau disimpan sebagai dokumen PDF."}
            </p>
            <div className="flex items-center justify-end gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Tutup
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
                disabled={!canPrint}
              >
                <Printer className="w-4 h-4" />
                Cetak / Simpan PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
