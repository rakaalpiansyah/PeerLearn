import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  MessageSquarePlus,
  Plus,
  Search,
  ThumbsUp,
  Video,
} from "lucide-react";
import { Button } from "../ui/Button";
import { LoadError } from "../ui/LoadError";
import { UserAvatar } from "../ui/UserAvatar";
import { studyRequestApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { SESSION_CATEGORIES } from "../../data/campusData";
import { CreateStudyRequestModal } from "./CreateStudyRequestModal";

export function StudyRequestBoard({
  onOpenAuth,
  onFulfillRequest,
  onOpenGroupById,
}) {
  const { isAuthenticated } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("Semua");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [votingId, setVotingId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadRequests = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    const nextCat = overrides.category ?? category;
    const nextStatus = overrides.status ?? statusFilter;
    const nextSearch = overrides.search ?? search;
    try {
      const params = {};
      if (nextCat && nextCat !== "Semua") params.category = nextCat;
      if (nextStatus) params.status = nextStatus;
      if (nextSearch.trim()) params.search = nextSearch.trim();
      const res = await studyRequestApi.list(params);
      if (!res?.success) {
        throw new Error(res?.message || "Gagal memuat papan usulan topik.");
      }
      setRequests(res.data || []);
    } catch (err) {
      setError(err?.message || "Papan usulan topik belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [category, statusFilter, search]);

  useEffect(() => {
    loadRequests();
  }, [category, statusFilter, isAuthenticated]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadRequests({ search });
  };

  const handleToggleVote = async (reqItem) => {
    if (!isAuthenticated) {
      onOpenAuth?.("login");
      return;
    }
    setVotingId(reqItem.id);
    try {
      const res = await studyRequestApi.toggleVote(reqItem.id);
      if (res?.success && res?.data) {
        setRequests((prev) =>
          prev.map((item) =>
            item.id === reqItem.id
              ? {
                  ...item,
                  user_voted: res.data.voted,
                  vote_count: res.data.vote_count,
                }
              : item
          )
        );
      }
    } catch (err) {
      setError(err?.message || "Gagal memperbarui dukungan topik.");
    } finally {
      setVotingId(null);
    }
  };

  const handleOpenCreate = () => {
    if (!isAuthenticated) {
      onOpenAuth?.("login");
      return;
    }
    setCreateOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Papan Usulan Topik Belajar
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Ajukan mata kuliah yang belum tersedia di katalog atau dukung usulan mahasiswa lain agar tutor segera membuka sesinya.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            className="min-h-[44px] shrink-0 self-start sm:self-center"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Ajukan Usulan Topik</span>
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div role="search" className="w-full lg:w-80">
            <form onSubmit={handleSearchSubmit} className="relative">
              <label htmlFor="sr-board-search" className="sr-only">
                Cari usulan topik belajar
              </label>
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="sr-board-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari usulan mata kuliah atau topik..."
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full min-h-[44px] pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="sr-board-category" className="sr-only">
              Filter kategori usulan
            </label>
            <select
              id="sr-board-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            >
              <option value="Semua">Semua Rumpun Ilmu</option>
              {SESSION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
              {[
                { label: "Semua", value: "" },
                { label: "Menunggu Tutor", value: "open" },
                { label: "Sesi Dibuka", value: "fulfilled" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  aria-pressed={statusFilter === opt.value}
                  className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    statusFilter === opt.value
                      ? "bg-white text-emerald-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <LoadError
          message={error}
          onRetry={() => loadRequests()}
          isRetrying={loading}
          hasStaleData={requests.length > 0}
        />
      )}

      {loading && requests.length === 0 ? (
        <div role="status" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-48 rounded-2xl bg-white border border-slate-200 animate-pulse p-5 space-y-3"
            >
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-5 w-3/4 bg-slate-200 rounded" />
              <div className="h-12 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-white border border-slate-200 p-6 space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
            <MessageSquarePlus className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-sm font-bold text-slate-900">
              Belum Ada Usulan Topik Belajar
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Belum ada usulan topik untuk filter yang dipilih. Jadilah yang pertama mengusulkan topik belajar!
            </p>
          </div>
          <Button type="button" variant="primary" size="sm" onClick={handleOpenCreate} className="min-h-[44px]">
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Ajukan Usulan Pertama</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {requests.map((item) => (
            <article
              key={item.id}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 flex flex-col justify-between gap-4 shadow-2xs"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {item.preferred_format === "online" ? (
                        <>
                          <Video className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                          <span>Daring</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                          <span>Luring</span>
                        </>
                      )}
                    </span>

                    {item.status === "fulfilled" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white">
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                        <span>Sesi Dibuka</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                        Menunggu Tutor
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {item.description || "Belum ada catatan tambahan dari pengusul."}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <UserAvatar user={item.requester} size="xs" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {item.requester?.full_name || "Mahasiswa UIN SGD"}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {item.requester?.campus_name || "UIN Sunan Gunung Djati Bandung"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleVote(item)}
                  disabled={votingId === item.id}
                  aria-pressed={Boolean(item.user_voted)}
                  className={`min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                    item.user_voted
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{item.user_voted ? "Didukung" : "Dukung"}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-slate-100 text-slate-800 font-bold">
                    {item.vote_count || 0}
                  </span>
                </button>

                {item.status === "open" && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (!isAuthenticated) {
                        onOpenAuth?.("login");
                        return;
                      }
                      onFulfillRequest?.(item);
                    }}
                    className="min-h-[44px]"
                  >
                    Buka Sesi Ini
                  </Button>
                )}

                {item.status === "fulfilled" && item.fulfilled_group_id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenGroupById?.(item.fulfilled_group_id)}
                    className="min-h-[44px]"
                  >
                    <span>Lihat Sesi</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <CreateStudyRequestModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => setRequests((prev) => [created, ...prev])}
      />
    </div>
  );
}
