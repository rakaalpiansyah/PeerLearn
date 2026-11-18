import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  UserX,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  Flag,
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { engagementApi } from "../../api/client";

export function AdminModerationPanel({
  items = [],
  loading = false,
  error = null,
  onRefresh,
  onModerated,
}) {
  const [filter, setFilter] = useState("pending");
  const [notes, setNotes] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const groupedByUser = useMemo(() => {
    return items.reduce((acc, item) => {
      const rep = item.report || {};
      const reportedUser = item.reported_user || null;
      const reportedUserId = rep.reported_user_id || reportedUser?.id || null;
      const key = reportedUserId || `group-${rep.target_group_id || rep.id}`;

      if (!acc[key]) {
        acc[key] = {
          key,
          userId: reportedUserId,
          userName:
            reportedUser?.full_name ||
            item.target_group?.title ||
            "Target Laporan",
          userEmail: reportedUser?.email || "",
          campusName: reportedUser?.campus_name || "FST UIN SGD Bandung",
          status: reportedUser?.account_status || "active",
          restrictionNote: reportedUser?.restriction_note || "",
          weeklyReportsCount: item.weekly_reports_count || 0,
          reports: [],
        };
      }

      acc[key].reports.push({
        id: rep.id,
        reason: rep.reason,
        details: rep.details,
        status: rep.status,
        created_at: rep.created_at,
        reporter_name: item.reporter?.full_name || "Mahasiswa",
        reporter_campus: item.reporter?.campus_name || "",
        target_group_title: item.target_group?.title || "",
      });

      if ((item.weekly_reports_count || 0) > acc[key].weeklyReportsCount) {
        acc[key].weeklyReportsCount = item.weekly_reports_count || 0;
      }

      return acc;
    }, {});
  }, [items]);

  const userList = useMemo(() => {
    return Object.values(groupedByUser).filter((entry) => {
      if (filter === "pending") {
        return (
          entry.reports.some((r) => r.status === "pending") ||
          entry.status === "restricted"
        );
      }
      return true;
    });
  }, [groupedByUser, filter]);

  const handleModerate = async (reportedUserId, userName, action) => {
    if (!reportedUserId) return;
    setProcessingId(reportedUserId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const note = notes[reportedUserId] || "";
      await engagementApi.moderateUser(reportedUserId, { action, note });
      setActionSuccess(
        action === "restore"
          ? `Akses akun ${userName} dipulihkan dan laporan terkait telah ditandai selesai.`
          : `Akun ${userName} ditangguhkan dan seluruh sesi aktifnya dibatalkan.`
      );
      if (onModerated) await onModerated();
    } catch (err) {
      setActionError(err.message || "Gagal memproses moderasi pengguna.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolveSingleReport = async (reportId) => {
    if (!reportId) return;
    setProcessingId(reportId);
    setActionError(null);
    try {
      await engagementApi.resolveReport(reportId, "resolved");
      if (onModerated) await onModerated();
    } catch (err) {
      setActionError(err.message || "Gagal menyelesaikan laporan.");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingReportCount = items.filter(
    (i) => (i.report?.status || "pending") === "pending"
  ).length;

  return (
    <section aria-labelledby="moderation-heading" className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1
            id="moderation-heading"
            className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight"
          >
            Pusat Laporan & Moderasi Keamanan Komunitas
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Tinjau laporan pelanggaran etika belajar sebaya, akun yang dibatasi
            otomatis oleh sistem, dan ambil tindakan pemulihan atau penangguhan.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="self-start sm:self-auto min-h-[40px] border-slate-300 text-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Segarkan Laporan
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center gap-2 ${
              filter === "pending"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Perlu Tindakan</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular-nums ${
                filter === "pending"
                  ? "bg-white/20 text-white"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              {pendingReportCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center gap-2 ${
              filter === "all"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Semua Laporan ({items.length})</span>
          </button>
        </div>
      </div>

      {(error || actionError) && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError || error}</span>
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* List */}
      {loading && items.length === 0 ? (
        <div
          role="status"
          className="p-10 rounded-2xl bg-white border border-slate-200 text-center space-y-2"
        >
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-700 mx-auto" />
          <p className="text-sm font-medium text-slate-700">
            Memuat daftar laporan moderasi...
          </p>
        </div>
      ) : userList.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
          <ShieldCheck className="w-9 h-9 text-emerald-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">
            Tidak Ada Laporan yang Menunggu Tindakan
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            Semua laporan komunitas sudah ditangani dan saat ini aktivitas sesi
            belajar berjalan tertib.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {userList.map((entry) => {
            const isRestricted = entry.status === "restricted";
            const isSuspended = entry.status === "suspended";
            const isProcessing = processingId === entry.userId;

            return (
              <article
                key={entry.key}
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${
                  isRestricted
                    ? "bg-amber-50/50 border-amber-300"
                    : isSuspended
                      ? "bg-rose-50/40 border-rose-300"
                      : "bg-white border-slate-200"
                }`}
              >
                <div className="space-y-4">
                  {/* Account Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {entry.userName}
                        </h2>
                        {isRestricted ? (
                          <Badge variant="warning">
                            <AlertTriangle className="w-3 h-3" />
                            Dibatasi Otomatis ({entry.weeklyReportsCount} pelapor/7hr)
                          </Badge>
                        ) : isSuspended ? (
                          <Badge variant="danger">
                            <UserX className="w-3 h-3" />
                            Ditangguhkan
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Aktif</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {entry.campusName}
                        {entry.userEmail ? ` (${entry.userEmail})` : ""}
                      </p>
                    </div>

                    <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                      {entry.reports.length} Laporan
                    </span>
                  </div>

                  {entry.restrictionNote && (
                    <div className="p-3 rounded-xl bg-amber-100/70 border border-amber-200 text-amber-950 text-xs leading-relaxed">
                      <span className="font-bold">Catatan Pembatasan: </span>
                      {entry.restrictionNote}
                    </div>
                  )}

                  {/* Chronology */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Kronologi Laporan Masuk
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {entry.reports.map((r) => (
                        <div
                          key={r.id}
                          className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-rose-700">
                              {r.reason}
                            </span>
                            <div className="flex items-center gap-2">
                              {r.status === "resolved" ? (
                                <Badge variant="success">Selesai</Badge>
                              ) : (
                                <button
                                  type="button"
                                  disabled={processingId === r.id}
                                  onClick={() => handleResolveSingleReport(r.id)}
                                  className="text-[11px] font-semibold text-emerald-800 hover:underline px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200"
                                >
                                  Tandai Selesai
                                </button>
                              )}
                              <span className="text-[11px] text-slate-500 flex items-center gap-1 tabular-nums">
                                <Clock className="w-3 h-3" />
                                {new Date(r.created_at).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                          </div>

                          {r.details && (
                            <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                              "{r.details}"
                            </p>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
                            <span>Pelapor: {r.reporter_name}</span>
                            {r.target_group_title && (
                              <span className="truncate max-w-[260px]">
                                Sesi: {r.target_group_title}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Moderation Action */}
                {entry.userId && (
                  <div className="pt-3 border-t border-slate-200 space-y-2.5">
                    <input
                      type="text"
                      aria-label={`Catatan moderasi untuk ${entry.userName}`}
                      placeholder="Tulis catatan keputusan moderasi untuk pengguna..."
                      value={notes[entry.userId] || ""}
                      onChange={(e) =>
                        setNotes({ ...notes, [entry.userId]: e.target.value })
                      }
                      className="w-full min-h-[40px] px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                    />
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        disabled={isProcessing}
                        onClick={() =>
                          handleModerate(entry.userId, entry.userName, "restore")
                        }
                        className="min-h-[40px] text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        Pulihkan Akses
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        type="button"
                        disabled={isProcessing}
                        onClick={() =>
                          handleModerate(entry.userId, entry.userName, "suspend")
                        }
                        className="min-h-[40px] text-xs bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Tangguhkan Akun
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
