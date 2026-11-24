import React, { useEffect, useState } from "react";
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { userApi } from "../api/client";

export function SKPIVerifyPage({ userId, onBackHome }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    userApi
      .verifySKPI(userId)
      .then((res) => {
        if (cancelled) return;
        if (!res?.success || !res?.data) {
          throw new Error("Data verifikasi SKPI tidak ditemukan.");
        }
        setData(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Data verifikasi SKPI tidak ditemukan.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-extrabold tracking-tight text-slate-900 block truncate">
                PeerLearn
              </span>
              <span className="text-[11px] text-slate-500 block truncate">
                Verifikasi SKPI • UIN Sunan Gunung Djati Bandung
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBackHome}
            className="min-h-[40px] shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Katalog
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div
            aria-label="Memuat verifikasi SKPI"
            className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5 animate-pulse"
          >
            <div className="h-5 w-48 rounded bg-slate-200" />
            <div className="h-8 w-72 rounded bg-slate-200" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-20 rounded-xl bg-slate-100" />
              <div className="h-20 rounded-xl bg-slate-100" />
              <div className="h-20 rounded-xl bg-slate-100" />
            </div>
            <div className="h-32 rounded-xl bg-slate-100" />
          </div>
        ) : error ? (
          <div
            role="alert"
            className="p-6 sm:p-8 rounded-2xl bg-white border border-rose-200 shadow-xs text-center space-y-4 max-w-lg mx-auto"
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-bold text-slate-900">
                Data Verifikasi SKPI Tidak Ditemukan
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">{error}</p>
            </div>
            <Button type="button" variant="primary" onClick={onBackHome}>
              Kembali ke PeerLearn
            </Button>
          </div>
        ) : (
          <article className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
              <div className="space-y-2">
                {data.verified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Terverifikasi Resmi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    Belum Memiliki Catatan Sesi
                  </span>
                )}
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {data.full_name}
                </h1>
                <p className="text-sm text-slate-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    {data.campus_name || "UIN Sunan Gunung Djati Bandung"}
                  </span>
                </p>
              </div>

              <div className="sm:text-right space-y-1 shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Kode Validasi SKPI
                </span>
                <div className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg break-all">
                  {data.verification_code}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  Poin Kontribusi
                </span>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">
                  {data.contribution_points || 0}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                  Sesi Tutor Selesai
                </span>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">
                  {data.verified_hosted_count || 0}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  Kehadiran Terverifikasi
                </span>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">
                  {data.verified_attended_count || 0}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                Keahlian Dikuasai
              </h2>
              {data.mastered_skills && data.mastered_skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.mastered_skills.map((skillName) => (
                    <span
                      key={skillName}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200"
                    >
                      {skillName}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Belum ada keahlian khusus yang ditautkan pada profil.
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Riwayat Sesi Terverifikasi
              </h2>
              {data.completed_sessions && data.completed_sessions.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-600">
                      <tr>
                        <th scope="col" className="py-2.5 px-3 font-semibold">
                          Tanggal
                        </th>
                        <th scope="col" className="py-2.5 px-3 font-semibold">
                          Judul Sesi
                        </th>
                        <th scope="col" className="py-2.5 px-3 font-semibold">
                          Kategori
                        </th>
                        <th scope="col" className="py-2.5 px-3 font-semibold">
                          Peran
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.completed_sessions.map((item) => (
                        <tr key={`${item.role}-${item.group_id}`}>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {new Date(item.start_time).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {item.title}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {item.category}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {item.role === "tutor" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
                                Tutor ({item.attended_count || 0} hadir)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                Peserta Hadir
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">
                  Belum ada catatan sesi selesai atau kehadiran terverifikasi.
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button type="button" variant="primary" onClick={onBackHome}>
                Kembali ke Katalog PeerLearn
              </Button>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}

export default SKPIVerifyPage;
