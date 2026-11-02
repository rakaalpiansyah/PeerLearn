import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, CheckCircle, Clock3 } from "lucide-react";
import { Badge } from "../ui/Badge";
import { LoadError } from "../ui/LoadError";
import { Modal } from "../ui/Modal";
import { membershipApi } from "../../api/client";

export function MySessionsModal({ isOpen, onClose, onSelectGroup }) {
  const [tab, setTab] = useState("joined"); // 'joined' | 'hosted'
  const [data, setData] = useState({ hosted: [], joined: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const requestSequence = useRef(0);

  const loadSessions = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    try {
      const res = await membershipApi.getMySessions();
      if (requestId !== requestSequence.current) return;
      if (!res.success) throw new Error("Session request failed");
      setData({ hosted: res.data.hosted ?? [], joined: res.data.joined ?? [] });
      setHasLoaded(true);
      setError(false);
    } catch {
      if (requestId === requestSequence.current) setError(true);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadSessions();
    return () => {
      // Closing or unmounting invalidates requests even if the API cannot abort them.
      requestSequence.current += 1;
    };
  }, [isOpen, loadSessions]);

  if (!isOpen) return null;

  const items = tab === "joined" ? data.joined : data.hosted;

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="my-sessions-title">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
          <div>
            <h2
              id="my-sessions-title"
              className="text-lg font-bold text-slate-900 tracking-tight"
            >
              Sesi Belajar Saya
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau status pendaftaran dan kelola sesi belajar yang Anda
              bimbing
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={onClose}
            className="min-w-10 min-h-10 shrink-0 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 p-1 mx-5 mt-4 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
          <button
            type="button"
            onClick={() => setTab("joined")}
            className={`py-2 font-semibold rounded-lg transition-all ${
              tab === "joined"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sesi yang Diikuti ({data.joined.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("hosted")}
            className={`py-2 font-semibold rounded-lg transition-all ${
              tab === "hosted"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sesi Diselenggarakan ({data.hosted.length})
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {error && (
            <LoadError
              message="Sesi Anda belum dapat dimuat."
              onRetry={loadSessions}
              isRetrying={loading}
              hasStaleData={hasLoaded}
            />
          )}
          {loading && (
            <div role="status" className="space-y-3 text-xs text-slate-500">
              <p>Memuat data sesi belajar Anda...</p>
              {!hasLoaded && (
                <div
                  aria-hidden="true"
                  className="space-y-3 motion-safe:animate-pulse"
                >
                  {[0, 1, 2].map((placeholder) => (
                    <div
                      key={placeholder}
                      className="rounded-xl bg-slate-100 p-4 space-y-3 border border-slate-200/60"
                    >
                      <div className="h-3 w-1/3 rounded bg-slate-200" />
                      <div className="h-4 w-2/3 rounded bg-slate-200" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {items.length === 0
            ? hasLoaded &&
              !loading &&
              !error && (
                <div className="py-12 text-center text-xs text-slate-500">
                  {tab === "joined"
                    ? "Anda belum mendaftar di sesi belajar mana pun."
                    : "Anda belum menyelenggarakan sesi belajar."}
                </div>
              )
            : items.map((g) => (
                <article
                  key={g.id}
                  className="relative p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {g.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(g.start_time).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">
                      <button
                        type="button"
                        aria-label={`Lihat sesi ${g.title}`}
                        onClick={() => {
                          onSelectGroup(g);
                          onClose();
                        }}
                        className="text-left cursor-pointer after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-blue-600"
                      >
                        {g.title}
                      </button>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {tab === "joined" &&
                      (g.user_membership === "accepted" ? (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle className="w-3 h-3" />
                          Diterima
                        </Badge>
                      ) : g.user_membership === "pending" ? (
                        <Badge variant="warning" className="text-xs">
                          <Clock3 className="w-3 h-3" />
                          Menunggu
                        </Badge>
                      ) : (
                        <Badge variant="neutral" className="text-xs">
                          {g.user_membership}
                        </Badge>
                      ))}

                    <Badge variant="neutral">
                      {g.current_members} / {g.max_capacity} Peserta
                    </Badge>
                  </div>
                </article>
              ))}
        </div>
      </div>
    </Modal>
  );
}
