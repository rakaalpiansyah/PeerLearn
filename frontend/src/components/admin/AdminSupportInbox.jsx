import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  MessageSquareText,
  Send,
  Search,
  CheckCircle2,
  Clock3,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { UserAvatar } from "../ui/UserAvatar";
import { supportApi } from "../../api/client";
import { useAuth } from "../../context/useAuth";

const THREAD_FILTERS = [
  { id: "open", label: "Perlu Respons / Terbuka" },
  { id: "resolved", label: "Selesai" },
  { id: "all", label: "Semua Percakapan" },
];

export function AdminSupportInbox({
  threads = [],
  loading = false,
  error = null,
  onRefresh,
}) {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatError, setChatError] = useState(null);

  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const chatBottomRef = useRef(null);

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return threads.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (q) {
        const hay = `${t.student?.full_name || ""} ${t.student?.email || ""} ${
          t.student?.campus_name || ""
        } ${t.subject} ${t.last_message || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [threads, statusFilter, searchQuery]);

  const effectiveSelectedId = useMemo(() => {
    if (selectedThreadId && filteredThreads.some((t) => t.id === selectedThreadId)) {
      return selectedThreadId;
    }
    return filteredThreads[0]?.id || null;
  }, [filteredThreads, selectedThreadId]);

  const loadThreadMessages = useCallback(async (threadId, silent = false) => {
    if (!threadId) return;
    if (!silent) {
      setLoadingChat(true);
      setChatError(null);
    }
    try {
      const res = await supportApi.adminGetMessages(threadId);
      if (res.success && res.data) {
        setActiveThread(res.data);
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      if (!silent) {
        setChatError(err.message || "Gagal memuat riwayat percakapan.");
      }
    } finally {
      if (!silent) {
        setLoadingChat(false);
      }
    }
  }, []);

  const [prevSelectedId, setPrevSelectedId] = useState(effectiveSelectedId);
  if (effectiveSelectedId !== prevSelectedId) {
    setPrevSelectedId(effectiveSelectedId);
    if (!effectiveSelectedId) {
      setActiveThread(null);
      setMessages([]);
    }
  }

  useEffect(() => {
    if (!effectiveSelectedId) return;
    const run = async () => {
      await loadThreadMessages(effectiveSelectedId, false);
    };
    run();
  }, [effectiveSelectedId, loadThreadMessages]);

  useEffect(() => {
    if (!effectiveSelectedId) return;
    const interval = setInterval(() => {
      loadThreadMessages(effectiveSelectedId, true);
      if (onRefresh) onRefresh(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [effectiveSelectedId, loadThreadMessages, onRefresh]);

  useEffect(() => {
    if (chatBottomRef.current && typeof chatBottomRef.current.scrollIntoView === "function") {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || !effectiveSelectedId || sending) return;

    setSending(true);
    setChatError(null);
    try {
      const res = await supportApi.adminReply(effectiveSelectedId, {
        message: text,
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal mengirim balasan.");
      }
      setMessages((prev) => [...prev, res.data]);
      setReplyText("");
      if (onRefresh) onRefresh(true);
    } catch (err) {
      setChatError(err.message || "Gagal mengirim balasan admin.");
    } finally {
      setSending(false);
    }
  };

  const handleToggleThreadStatus = async () => {
    if (!activeThread || updatingStatus) return;
    const nextStatus = activeThread.status === "open" ? "resolved" : "open";
    setUpdatingStatus(true);
    setChatError(null);
    try {
      const res = await supportApi.adminUpdateStatus(activeThread.id, nextStatus);
      if (!res.success) {
        throw new Error(res.message || "Gagal memperbarui status percakapan.");
      }
      setActiveThread((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      if (onRefresh) await onRefresh(true);
    } catch (err) {
      setChatError(err.message || "Gagal mengubah status percakapan.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const counts = useMemo(
    () => ({
      open: threads.filter((t) => t.status === "open").length,
      resolved: threads.filter((t) => t.status === "resolved").length,
      all: threads.length,
    }),
    [threads]
  );

  return (
    <section aria-labelledby="support-inbox-heading" className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1
            id="support-inbox-heading"
            className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight"
          >
            Kotak Masuk Bantuan Mahasiswa (Shared Inbox)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Setiap mahasiswa dapat mengirim pesan ke ruang ini, dan admin mana
            pun yang sedang bertugas dapat membalas dengan identitas pengirim
            yang tercatat jelas.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onRefresh && onRefresh(false)}
          disabled={loading}
          className="self-start sm:self-auto min-h-[40px] border-slate-300 text-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Segarkan Inbox
        </Button>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {THREAD_FILTERS.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setSelectedThreadId(null);
                  setMobileShowChat(false);
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
                  {counts[tab.id] || 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search
            aria-hidden="true"
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
          />
          <input
            type="search"
            aria-label="Cari percakapan mahasiswa"
            placeholder="Cari nama mahasiswa atau topik..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[40px] pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRefresh && onRefresh(false)}
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Two-Column Helpdesk */}
      {loading && threads.length === 0 ? (
        <div
          role="status"
          className="p-10 rounded-2xl bg-white border border-slate-200 text-center space-y-2"
        >
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-700 mx-auto" />
          <p className="text-sm font-medium text-slate-700">
            Memuat kotak masuk bantuan mahasiswa...
          </p>
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
          <MessageSquareText className="w-9 h-9 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">
            Belum Ada Pesan di Filter Ini
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            Saat mahasiswa mengirim pesan bantuan dari beranda atau modal sesi,
            percakapan akan otomatis masuk ke antrean bersama ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Thread List */}
          <div
            className={`lg:col-span-4 rounded-2xl bg-white border border-slate-200 overflow-hidden flex flex-col max-h-[640px] ${
              mobileShowChat ? "hidden lg:flex" : "flex"
            }`}
          >
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Daftar Mahasiswa ({filteredThreads.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredThreads.map((t) => {
                const isSelected = effectiveSelectedId === t.id;
                const awaitingAdmin =
                  t.status === "open" && t.last_sender_role !== "admin";

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedThreadId(t.id);
                      setMobileShowChat(true);
                    }}
                    className={`w-full text-left p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 ${
                      isSelected
                        ? "bg-emerald-50/70 ring-1 ring-inset ring-emerald-200"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar user={t.student} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {t.student?.full_name || "Mahasiswa"}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {t.student?.campus_name || "UIN SGD Bandung"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0 tabular-nums">
                        {new Date(t.last_message_at).toLocaleTimeString(
                          "id-ID",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 truncate mb-1">
                      {t.subject}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                      {t.last_sender_name ? `${t.last_sender_name}: ` : ""}
                      {t.last_message || "Belum ada pesan."}
                    </p>

                    <div className="flex items-center justify-between gap-2">
                      {t.status === "open" ? (
                        awaitingAdmin ? (
                          <Badge variant="warning">
                            <Clock3 className="w-3 h-3" />
                            Menunggu Balasan
                          </Badge>
                        ) : (
                          <Badge variant="primary">
                            <MessageSquareText className="w-3 h-3" />
                            Aktif (Sudah Dijawab)
                          </Badge>
                        )
                      ) : (
                        <Badge variant="success">
                          <CheckCircle2 className="w-3 h-3" />
                          Selesai
                        </Badge>
                      )}
                      <span className="text-[11px] font-medium text-slate-500">
                        {t.message_count || 0} pesan
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Chat Room */}
          <div
            className={`lg:col-span-8 rounded-2xl bg-white border border-slate-200 overflow-hidden flex flex-col h-[640px] ${
              mobileShowChat ? "flex" : "hidden lg:flex"
            }`}
          >
            {activeThread ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobileShowChat(false)}
                      aria-label="Kembali ke daftar percakapan"
                      className="lg:hidden min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <UserAvatar user={activeThread.student} size="md" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                          {activeThread.student?.full_name || "Mahasiswa"}
                        </h2>
                        {activeThread.student?.account_status === "restricted" && (
                          <Badge variant="warning">Akun Dibatasi</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 flex items-center gap-1 truncate">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">
                          {activeThread.student?.campus_name || "UIN SGD Bandung"} (
                          {activeThread.student?.email})
                        </span>
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={updatingStatus}
                    onClick={handleToggleThreadStatus}
                    className={`min-h-[40px] text-xs ${
                      activeThread.status === "open"
                        ? "border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {activeThread.status === "open" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        Tandai Selesai
                      </>
                    ) : (
                      <>
                        <Clock3 className="w-3.5 h-3.5 text-slate-600" />
                        Buka Kembali
                      </>
                    )}
                  </Button>
                </div>

                {/* Subject Banner */}
                <div className="px-4 py-2 bg-white border-b border-slate-100 text-xs text-slate-600 flex items-center justify-between gap-2">
                  <span className="truncate">
                    <strong className="text-slate-800">Topik:</strong>{" "}
                    {activeThread.subject}
                  </span>
                  <span className="text-[11px] text-slate-500 shrink-0">
                    Pembaruan otomatis aktif
                  </span>
                </div>

                {/* Messages Timeline */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#f8fafc]">
                  {loadingChat && messages.length === 0 ? (
                    <div
                      role="status"
                      className="py-12 text-center text-xs text-slate-500 space-y-2"
                    >
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-700 mx-auto" />
                      <p>Memuat riwayat pesan...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      Belum ada pesan di percakapan ini.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isAdminMsg = msg.sender?.role === "admin";
                      const isMe = msg.sender_id === user?.id;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isAdminMsg ? "items-end" : "items-start"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            {isAdminMsg && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-white">
                                <ShieldCheck className="w-3 h-3" />
                                Tim Admin
                              </span>
                            )}
                            <span className="text-[11px] font-semibold text-slate-700">
                              {msg.sender?.full_name || "Pengguna"}
                              {isMe ? " (Anda)" : ""}
                            </span>
                            <span className="text-[10px] text-slate-500 tabular-nums">
                              {new Date(msg.created_at).toLocaleString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div
                            className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap border ${
                              isMe
                                ? "bg-emerald-700 text-white border-emerald-700 rounded-tr-sm"
                                : isAdminMsg
                                  ? "bg-emerald-50 text-emerald-950 border-emerald-200 rounded-tr-sm"
                                  : "bg-white text-slate-900 border-slate-200 rounded-tl-sm"
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Error if any */}
                {chatError && (
                  <div
                    role="alert"
                    className="mx-4 mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{chatError}</span>
                  </div>
                )}

                {/* Reply Composer */}
                <form
                  onSubmit={handleSendReply}
                  className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center gap-2.5"
                >
                  <input
                    type="text"
                    aria-label="Balas pesan mahasiswa"
                    placeholder={`Balas sebagai ${user?.full_name || "Tim Admin"}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={sending}
                    disabled={!replyText.trim()}
                    className="min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim</span>
                  </Button>
                </form>
              </>
            ) : (
              <div className="m-auto p-8 text-center text-sm text-slate-500">
                Pilih percakapan mahasiswa di sebelah kiri untuk membaca dan
                membalas pesan.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
