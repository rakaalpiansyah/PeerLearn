import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock3,
  Search,
  Calendar,
  MapPin,
  Video,
  Users,
  ListOrdered,
  FileText,
  ExternalLink,
  Compass,
  AlertCircle,
  AlertTriangle,
  Award,
  GraduationCap,
  RefreshCw,
  ArrowLeft,
  Check,
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { UserAvatar } from "../ui/UserAvatar";
import { groupApi } from "../../api/client";
import { SESSION_CATEGORIES } from "../../data/campusData";

const STATUS_FILTERS = [
  { id: "pending_approval", label: "Menunggu ACC" },
  { id: "rejected", label: "Perlu Revisi" },
  { id: "open", label: "Tayang" },
  { id: "all", label: "Semua Sesi" },
];

const CATEGORIES = ["Semua Kategori", ...SESSION_CATEGORIES];

function StatusBadge({ status }) {
  switch (status) {
    case "pending_approval":
      return (
        <Badge variant="warning">
          <Clock3 className="w-3 h-3" />
          Menunggu ACC
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="danger">
          <XCircle className="w-3 h-3" />
          Ditolak / Revisi
        </Badge>
      );
    case "open":
      return (
        <Badge variant="success">
          <CheckCircle2 className="w-3 h-3" />
          Tayang (Open)
        </Badge>
      );
    case "ongoing":
      return (
        <Badge variant="primary">
          <Clock3 className="w-3 h-3" />
          Berlangsung
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="neutral">
          <Check className="w-3 h-3" />
          Selesai
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="danger">
          <AlertTriangle className="w-3 h-3" />
          Dibatalkan
        </Badge>
      );
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function AdminApprovalsPanel({
  groups = [],
  loading = false,
  error = null,
  initialSelectedId = null,
  onRefresh,
  onReviewed,
}) {
  const [statusFilter, setStatusFilter] = useState("pending_approval");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [mobileShowDetail, setMobileShowDetail] = useState(
    Boolean(initialSelectedId)
  );
  const [appliedInitialId, setAppliedInitialId] = useState(null);

  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  if (!initialSelectedId && appliedInitialId !== null) {
    setAppliedInitialId(null);
  } else if (
    initialSelectedId &&
    initialSelectedId !== appliedInitialId &&
    groups.length > 0
  ) {
    setAppliedInitialId(initialSelectedId);
    const target = groups.find((g) => g.id === initialSelectedId);
    if (target) {
      setStatusFilter(
        target.status === "pending_approval" ? "pending_approval" : "all"
      );
      setReviewNote(target.review_note || "");
    }
    setSelectedId(initialSelectedId);
    setMobileShowDetail(true);
  }

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return groups.filter((g) => {
      if (statusFilter !== "all" && g.status !== statusFilter) return false;
      if (categoryFilter !== "Semua Kategori" && g.category !== categoryFilter) {
        return false;
      }
      if (q) {
        const hay = `${g.title} ${g.description} ${g.host?.full_name || ""} ${
          g.category
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [groups, statusFilter, categoryFilter, searchQuery]);

  const selectedGroup = useMemo(() => {
    if (selectedId) {
      const found = filteredGroups.find((g) => g.id === selectedId);
      if (found) return found;
    }
    return filteredGroups[0] || null;
  }, [filteredGroups, selectedId]);

  const countsByStatus = useMemo(() => {
    return {
      pending_approval: groups.filter((g) => g.status === "pending_approval")
        .length,
      rejected: groups.filter((g) => g.status === "rejected").length,
      open: groups.filter((g) => g.status === "open").length,
      all: groups.length,
    };
  }, [groups]);

  const handleSelectGroup = (group) => {
    setSelectedId(group.id);
    setReviewNote(group.review_note || "");
    setActionError(null);
    setActionSuccess(null);
    setMobileShowDetail(true);
  };

  const handleReview = async (action) => {
    if (!selectedGroup) return;
    const note = reviewNote.trim();
    if (action === "reject" && !note) {
      setActionError(
        "Tuliskan alasan penolakan atau catatan revisi agar mahasiswa tahu bagian yang harus diperbaiki."
      );
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await groupApi.adminReview(selectedGroup.id, {
        action,
        note,
      });
      if (!res.success) {
        throw new Error(res.message || "Gagal memproses keputusan kurasi.");
      }
      setActionSuccess(
        action === "approve"
          ? `Sesi "${selectedGroup.title}" disetujui dan langsung tayang di katalog mahasiswa.`
          : `Pengajuan "${selectedGroup.title}" ditolak dengan catatan revisi untuk penyelenggara.`
      );
      setReviewNote("");
      setMobileShowDetail(false);
      if (onReviewed) {
        await onReviewed();
      }
    } catch (err) {
      setActionError(err.message || "Terjadi kesalahan saat menyimpan keputusan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="approvals-heading" className="space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1
            id="approvals-heading"
            className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight"
          >
            Antrean Verifikasi & Kurasi Sesi Belajar
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Periksa kelengkapan agenda, validitas lokasi atau tautan pertemuan,
            dan kesesuaian etika akademik sebelum sesi tampil ke mahasiswa lain.
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
          Segarkan Antrean
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setSelectedId(null);
                  setMobileShowDetail(false);
                  setActionError(null);
                }}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center gap-2 ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular-nums ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  {countsByStatus[tab.id] || 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="relative sm:col-span-8">
            <Search
              aria-hidden="true"
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            />
            <input
              type="search"
              aria-label="Cari pengajuan sesi"
              placeholder="Cari judul kegiatan, deskripsi, atau nama tutor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[42px] pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              aria-label="Filter program studi"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full min-h-[42px] px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-300 text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Coba Lagi
          </Button>
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-800 hover:text-emerald-950 font-semibold text-xs px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Master-Detail Content */}
      {loading && groups.length === 0 ? (
        <div
          role="status"
          className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2"
        >
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-700 mx-auto" />
          <p className="text-sm font-medium text-slate-700">
            Memuat antrean pengajuan sesi belajar...
          </p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
          <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">
            Tidak Ada Sesi di Daftar Ini
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            {statusFilter === "pending_approval"
              ? "Semua pengajuan kolaborasi belajar saat ini sudah selesai ditinjau oleh tim admin."
              : "Coba ubah filter status atau kata kunci pencarian untuk melihat sesi lainnya."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Queue List */}
          <div
            className={`lg:col-span-5 space-y-2.5 lg:max-h-[calc(100dvh-260px)] lg:overflow-y-auto lg:pr-1 ${
              mobileShowDetail ? "hidden lg:block" : "block"
            }`}
          >
            {filteredGroups.map((g) => {
              const isSelected = selectedGroup?.id === g.id;
              const startDate = new Date(g.start_time);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleSelectGroup(g)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                    isSelected
                      ? "bg-emerald-50/60 border-emerald-600 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={g.status} />
                      <Badge variant="neutral">{g.category}</Badge>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      {g.format === "online" ? (
                        <Video className="w-3 h-3 text-blue-700" />
                      ) : (
                        <MapPin className="w-3 h-3 text-emerald-700" />
                      )}
                      {g.format === "online" ? "Daring" : "Luring"}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-900 leading-snug mb-1.5">
                    {g.title}
                  </p>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                    {g.description || "Tanpa deskripsi tambahan."}
                  </p>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="font-medium truncate">
                      {g.host?.full_name || "Mahasiswa"}
                    </span>
                    <span className="text-[11px] text-slate-500 shrink-0 tabular-nums">
                      {startDate.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      ({g.agenda?.length || 0} agenda)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Inspection Panel */}
          {selectedGroup && (
            <div
              className={`lg:col-span-7 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden ${
                mobileShowDetail ? "block" : "hidden lg:block"
              }`}
            >
              {/* Mobile Back Button */}
              <div className="lg:hidden px-4 py-3 border-b border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setMobileShowDetail(false)}
                  className="min-h-[36px] inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali ke Daftar Antrean
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                {/* Header */}
                <div className="space-y-2 pb-4 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedGroup.status} />
                    <Badge variant="neutral">{selectedGroup.category}</Badge>
                    <Badge variant="outline">
                      <Users className="w-3 h-3" />
                      Kuota {selectedGroup.max_capacity} Peserta
                    </Badge>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                    {selectedGroup.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {selectedGroup.description ||
                      "Penyelenggara tidak menambahkan deskripsi tambahan."}
                  </p>
                </div>

                {/* Host Track Record */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar user={selectedGroup.host} size="md" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {selectedGroup.host?.full_name || "Mahasiswa"}
                        </p>
                        {selectedGroup.host?.account_status === "restricted" && (
                          <Badge variant="warning">Akun Dibatasi</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 truncate">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">
                          {selectedGroup.host?.campus_name || "UIN SGD Bandung"}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {selectedGroup.host?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 self-start sm:self-center shrink-0">
                    <Award className="w-4 h-4 text-amber-600" />
                    {selectedGroup.host?.contribution_points || 0} Poin Tutor
                  </div>
                </div>

                {/* Schedule & Location Verification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      Waktu Pelaksanaan
                    </p>
                    <p className="font-bold text-slate-900 text-sm">
                      {new Date(selectedGroup.start_time).toLocaleDateString(
                        "id-ID",
                        {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </p>
                    <p className="text-slate-600">
                      {new Date(selectedGroup.start_time).toLocaleTimeString(
                        "id-ID",
                        { hour: "2-digit", minute: "2-digit" }
                      )}{" "}
                      -{" "}
                      {new Date(selectedGroup.end_time).toLocaleTimeString(
                        "id-ID",
                        { hour: "2-digit", minute: "2-digit" }
                      )}{" "}
                      WIB
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      {selectedGroup.format === "online" ? (
                        <Video className="w-3.5 h-3.5 text-blue-700" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      )}
                      {selectedGroup.format === "online"
                        ? "Tautan Pertemuan Daring"
                        : "Lokasi Fisik & Ruangan"}
                    </p>
                    {selectedGroup.format === "online" ? (
                      <a
                        href={
                          selectedGroup.location_or_link?.startsWith("http")
                            ? selectedGroup.location_or_link
                            : `https://${selectedGroup.location_or_link}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-700 hover:underline font-semibold break-all"
                      >
                        {selectedGroup.location_or_link}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900">
                          {selectedGroup.location_or_link}
                        </p>
                        {selectedGroup.building_details && (
                          <p className="text-slate-600">
                            Detail: {selectedGroup.building_details}
                          </p>
                        )}
                        {selectedGroup.latitude != null &&
                          selectedGroup.longitude != null && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${selectedGroup.latitude},${selectedGroup.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-800 hover:underline font-semibold"
                            >
                              <Compass className="w-3.5 h-3.5" />
                              Cek Titik GPS ({selectedGroup.latitude.toFixed(4)},{" "}
                              {selectedGroup.longitude.toFixed(4)})
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Agenda & Prerequisites */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ListOrdered className="w-4 h-4 text-emerald-700" />
                      Rencana Agenda ({selectedGroup.agenda?.length || 0} Poin)
                    </h3>
                    {selectedGroup.agenda && selectedGroup.agenda.length > 0 ? (
                      <ol className="space-y-1.5">
                        {selectedGroup.agenda.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-xs text-slate-700"
                          >
                            <span className="w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                              {idx + 1}
                            </span>
                            <span className="pt-0.5 leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-xs text-rose-700 font-medium">
                        Penyelenggara belum menyertakan poin agenda pembahasan.
                      </p>
                    )}
                  </div>

                  {selectedGroup.prerequisites && (
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                      <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-700" />
                        Prasyarat & Perlengkapan Peserta
                      </h3>
                      <p className="text-xs text-amber-950 leading-relaxed">
                        {selectedGroup.prerequisites}
                      </p>
                    </div>
                  )}
                </div>

                {/* Previous Review Note */}
                {selectedGroup.review_note && (
                  <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-xs space-y-1">
                    <p className="font-bold text-slate-800">
                      Catatan Kurasi Sebelumnya:
                    </p>
                    <p className="text-slate-700 leading-relaxed">
                      {selectedGroup.review_note}
                    </p>
                  </div>
                )}

                {/* Decision Form */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div>
                    <label
                      htmlFor="admin-review-note"
                      className="block text-xs font-bold text-slate-800 mb-1.5"
                    >
                      Catatan Kurasi Admin (Wajib diisi jika menolak pengajuan)
                    </label>
                    <textarea
                      id="admin-review-note"
                      rows={3}
                      placeholder="Contoh: Agenda sudah jelas dan lokasi lab terkonfirmasi, atau jelaskan perbaikan yang diperlukan jika ditolak..."
                      value={reviewNote}
                      onChange={(e) => {
                        setReviewNote(e.target.value);
                        if (actionError) setActionError(null);
                      }}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                    />
                  </div>

                  {actionError && (
                    <div
                      role="alert"
                      className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="danger"
                      size="md"
                      disabled={submitting}
                      onClick={() => handleReview("reject")}
                      className="min-h-[44px] bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100"
                    >
                      <XCircle className="w-4 h-4" />
                      Tolak & Minta Revisi
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      isLoading={submitting}
                      onClick={() => handleReview("approve")}
                      className="min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      ACC & Tayangkan Sesi
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
