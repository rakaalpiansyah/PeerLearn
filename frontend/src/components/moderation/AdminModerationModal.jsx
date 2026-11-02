import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  UserX,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { engagementApi } from "../../api/client";

export function AdminModerationModal({ isOpen, onClose, onModerated }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState("pending"); // "pending" | "all"

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await engagementApi.listModeration();
      if (res.data) {
        setItems(res.data);
      }
    } catch (err) {
      setError(err.message || "Gagal memuat daftar laporan moderasi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen, fetchReports]);

  if (!isOpen) return null;

  const handleModerate = async (reportedUserId, action) => {
    if (!reportedUserId) return;
    setProcessingId(reportedUserId);
    setError(null);
    try {
      const note = notes[reportedUserId] || "";
      await engagementApi.moderateUser(reportedUserId, {
        action,
        note,
      });
      await fetchReports();
      if (onModerated) onModerated();
    } catch (err) {
      setError(err.message || "Gagal memproses moderasi pengguna.");
    } finally {
      setProcessingId(null);
    }
  };

  // Group items by reported user for aggregated decision-making
  const groupedByUser = items.reduce((acc, item) => {
    const key = item.reported_user_id || "unassigned";
    if (!acc[key]) {
      acc[key] = {
        userId: item.reported_user_id,
        userName: item.reported_user_name || "Target Sesi",
        userRole: item.reported_user_role,
        campusName: item.reported_user_campus,
        status: item.reported_user_status || "active",
        restrictionNote: item.reported_user_restriction_note,
        reports: [],
      };
    }
    acc[key].reports.push(item);
    return acc;
  }, {});

  const userList = Object.values(groupedByUser).filter((entry) => {
    if (filter === "pending") {
      return entry.reports.some((r) => r.status === "pending") || entry.status === "restricted";
    }
    return true;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="admin-moderation-title">
      <div className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="admin-moderation-title"
                className="text-base font-bold text-slate-900 tracking-tight"
              >
                Panel Moderasi & Keamanan Komunitas
              </h2>
              <p className="text-xs text-slate-500">
                Tinjau akun yang dibatasi otomatis dan ambil keputusan penegakan kebijakan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-10 min-h-10 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                filter === "pending"
                  ? "bg-rose-50 text-rose-800 border-rose-300"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Perlu Tindakan
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                filter === "all"
                  ? "bg-rose-50 text-rose-800 border-rose-300"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Semua Laporan ({items.length})
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchReports}
            disabled={loading}
            className="text-xs py-1 px-2.5 h-8 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && userList.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-xs">Memuat laporan moderasi...</p>
          </div>
        ) : userList.length === 0 ? (
          <div className="py-12 text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-emerald-600" />
            <p className="text-sm font-semibold text-slate-800">
              Tidak Ada Laporan yang Memerlukan Tindakan
            </p>
            <p className="text-xs max-w-sm mx-auto text-slate-500">
              Semua sesi dan aktivitas komunitas saat ini berlangsung tertib sesuai etika belajar sebaya.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {userList.map((entry) => {
              const isRestricted = entry.status === "restricted";
              const isSuspended = entry.status === "suspended";
              const isProcessing = processingId === entry.userId;

              return (
                <div
                  key={entry.userId || entry.userName}
                  className={`p-4 rounded-xl border transition-all ${
                    isRestricted
                      ? "bg-amber-50/60 border-amber-300"
                      : isSuspended
                        ? "bg-slate-50 border-rose-300"
                        : "bg-white border-slate-200"
                  }`}
                >
                  {/* Account Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {entry.userName}
                        </h3>
                        {isRestricted ? (
                          <Badge variant="warning" className="text-[10px] py-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            Dibatasi Otomatis (≥3 Laporan)
                          </Badge>
                        ) : isSuspended ? (
                          <Badge variant="danger" className="text-[10px] py-0.5">
                            <UserX className="w-3 h-3" />
                            Ditangguhkan
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px] py-0.5">
                            Aktif
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {entry.campusName || "FST UIN SGD Bandung"} • {entry.reports.length} Laporan Masuk
                      </p>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      ID: {entry.userId ? entry.userId.slice(0, 8) : "N/A"}
                    </span>
                  </div>

                  {/* Restriction Note if any */}
                  {entry.restrictionNote && (
                    <div className="mb-3 p-2.5 rounded-lg bg-amber-100/70 border border-amber-200 text-amber-900 text-xs">
                      <span className="font-semibold">Catatan Pembatasan: </span>
                      {entry.restrictionNote}
                    </div>
                  )}

                  {/* Reports Breakdown */}
                  <div className="space-y-2 mb-3">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Kronologi & Alasan Pelaporan:
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {entry.reports.map((r) => (
                        <div
                          key={r.id}
                          className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-rose-700">
                              {r.reason}
                            </span>
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(r.created_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {r.details && (
                            <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
                              "{r.details}"
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                            <span>Pelapor: {r.reporter_name || "Mahasiswa"}</span>
                            {r.target_group_title && (
                              <span className="truncate max-w-[200px]">
                                Sesi: {r.target_group_title}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Admin Actions */}
                  {entry.userId && (
                    <div className="pt-3 border-t border-slate-200/80 space-y-2">
                      <input
                        type="text"
                        placeholder="Tulis catatan keputusan moderasi untuk pengguna..."
                        value={notes[entry.userId] || ""}
                        onChange={(e) =>
                          setNotes({ ...notes, [entry.userId]: e.target.value })
                        }
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleModerate(entry.userId, "restore")}
                          className="text-xs h-7 text-emerald-800 border-emerald-300 hover:bg-emerald-50 gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Pulihkan Akses
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleModerate(entry.userId, "suspend")}
                          className="text-xs h-7 gap-1"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Tangguhkan Akun
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup Panel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
