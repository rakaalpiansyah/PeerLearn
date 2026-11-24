import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Send,
  MessageSquareText,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { supportApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export function StudentSupportModal({ isOpen, onClose }) {
  const { user, isAuthenticated } = useAuth();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [subject, setSubject] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const loadThread = useCallback(async (silent = false) => {
    if (!isAuthenticated) return;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await supportApi.getMyThread();
      if (res.success && res.data) {
        setThread(res.data);
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      if (!silent) {
        setError(err.message || "Gagal memuat ruang bantuan admin.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    loadThread(false);
    const interval = setInterval(() => loadThread(true), 4000);
    return () => clearInterval(interval);
  }, [isOpen, isAuthenticated, loadThread]);

  useEffect(() => {
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = messageInput.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await supportApi.sendStudentMessage({
        subject: subject.trim() || undefined,
        message: text,
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal mengirim pesan ke admin.");
      }
      setMessages((prev) => [...prev, res.data]);
      setThread((prev) => (prev ? { ...prev, status: "open" } : prev));
      setMessageInput("");
      setSubject("");
    } catch (err) {
      setError(err.message || "Gagal mengirim pesan ke admin.");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="student-support-title">
      <div className="relative w-full max-w-xl max-h-[calc(100dvh-1.5rem)] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-200 bg-white gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="student-support-title"
                  className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
                >
                  Ruang Bantuan & Chat Admin
                </h2>
                {thread?.status === "resolved" ? (
                  <Badge variant="success">
                    <CheckCircle2 className="w-3 h-3" />
                    Selesai
                  </Badge>
                ) : (
                  <Badge variant="primary">
                    <Clock3 className="w-3 h-3" />
                    Aktif
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Tanyakan persetujuan sesi, kendala akun, atau validasi SKPI.
                Admin yang sedang bertugas akan membalas di sini.
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={onClose}
            className="min-w-10 min-h-10 shrink-0 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#f8fafc] min-h-[300px] max-h-[55dvh]">
          {loading && messages.length === 0 ? (
            <div
              role="status"
              className="py-12 text-center text-xs text-slate-500 space-y-2"
            >
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-700 mx-auto" />
              <p>Memuat percakapan dengan tim admin...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-2xl bg-white border border-slate-200 space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-700 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">
                Mulai Percakapan dengan Tim Admin PeerLearn UIN SGD
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Kirim pertanyaan Anda terkait pengajuan sesi belajar, revisi
                kegiatan, atau bantuan teknis lainnya.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              const isAdmin = msg.sender?.role === "admin";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                        <ShieldCheck className="w-3 h-3" />
                        Tim Admin
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-700">
                      {isMe ? "Anda" : msg.sender?.full_name || "Admin UIN SGD"}
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
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap border ${
                      isMe
                        ? "bg-emerald-700 text-white border-emerald-700 rounded-tr-sm"
                        : "bg-white text-slate-900 border-slate-200 rounded-tl-sm"
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div
            role="alert"
            className="mx-4 mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-slate-200 bg-white space-y-2.5"
        >
          {messages.length === 0 && (
            <input
              type="text"
              aria-label="Topik bantuan (opsional)"
              placeholder="Topik singkat, misal: Verifikasi Pengajuan Sesi (opsional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full min-h-[38px] px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              aria-label="Tulis pesan untuk admin"
              placeholder="Tulis pesan atau pertanyaan untuk admin..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="flex-1 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={sending}
              disabled={!messageInput.trim()}
              className="min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Kirim</span>
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
