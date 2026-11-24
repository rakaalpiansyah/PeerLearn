import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, CheckCircle, Clock3, Users, Check, XCircle } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { LoadError } from "../ui/LoadError";
import { Modal } from "../ui/Modal";
import { membershipApi, cohostApi, groupApi } from "../../api/client";

export function MySessionsModal({ isOpen, onClose, onSelectGroup }) {
  const [tab, setTab] = useState("joined"); // 'joined' | 'hosted'
  const [data, setData] = useState({ hosted: [], joined: [] });
  const [cohostInvitations, setCohostInvitations] = useState([]);
  const [busyCohostId, setBusyCohostId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const requestSequence = useRef(0);

  const loadSessions = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);

    // Muat undangan Co-Tutor secara terpisah (non-blocking) agar tidak menahan render sesi utama
    cohostApi
      .listMyInvitations()
      .then((cohostRes) => {
        if (requestId !== requestSequence.current) return;
        if (cohostRes?.success && Array.isArray(cohostRes.data)) {
          setCohostInvitations(cohostRes.data);
        }
      })
      .catch(() => {
        // Silent fallback
      });

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

  const handleRespondCohost = async (groupId, status) => {
    setBusyCohostId(groupId);
    try {
      const res = await cohostApi.respond(groupId, status);
      if (res?.success) {
        await loadSessions();
      }
    } catch {
      // Fail gracefully
    } finally {
      setBusyCohostId(null);
    }
  };

  const handleOpenCohostGroup = async (groupId) => {
    setBusyCohostId(groupId);
    try {
      const res = await groupApi.getByID(groupId);
      if (res?.success && res.data) {
        onSelectGroup(res.data);
        onClose();
      }
    } catch {
      // Fail gracefully
    } finally {
      setBusyCohostId(null);
    }
  };

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
            className="min-w-10 min-h-10 shrink-0 inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
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
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-bold"
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
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sesi Diselenggarakan ({data.hosted.length})
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Co-Tutor Invitations & Active Co-Tutor Roles */}
          {cohostInvitations.length > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                <Users className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Undangan & Peran Co-Tutor ({cohostInvitations.length})
                </span>
              </div>

              <div className="space-y-2">
                {cohostInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-lg bg-white border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            inv.status === "accepted" ? "success" : "warning"
                          }
                          className="text-[10px]"
                        >
                          {inv.status === "accepted"
                            ? "Co-Tutor Aktif"
                            : "Undangan Co-Tutor"}
                        </Badge>
                        {inv.start_time && (
                          <span className="text-[11px] text-slate-500">
                            {new Date(inv.start_time).toLocaleDateString(
                              "id-ID",
                              { day: "numeric", month: "short" },
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {inv.group_title || "Sesi Belajar"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {inv.status === "invited" ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            isLoading={busyCohostId === inv.group_id}
                            onClick={() =>
                              handleRespondCohost(inv.group_id, "accepted")
                            }
                          >
                            <Check className="w-3.5 h-3.5" />
                            Terima
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busyCohostId === inv.group_id}
                            onClick={() =>
                              handleRespondCohost(inv.group_id, "declined")
                            }
                            className="text-rose-600 hover:bg-rose-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Tolak
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          isLoading={busyCohostId === inv.group_id}
                          onClick={() => handleOpenCohostGroup(inv.group_id)}
                          className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                        >
                          Buka Sesi
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  className="relative p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral" className="text-[10px]">
                        {g.category}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(g.start_time).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 hover:text-emerald-800 transition-colors">
                      <button
                        type="button"
                        aria-label={`Lihat sesi ${g.title}`}
                        onClick={() => {
                          onSelectGroup(g);
                          onClose();
                        }}
                        className="text-left cursor-pointer after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-emerald-700"
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

                    {tab === "hosted" &&
                      (g.status === "pending_approval" ? (
                        <Badge variant="warning" className="text-xs">
                          <Clock3 className="w-3 h-3" />
                          Menunggu ACC
                        </Badge>
                      ) : g.status === "rejected" ? (
                        <Badge variant="danger" className="text-xs">
                          Perlu Revisi
                        </Badge>
                      ) : g.status === "open" ? (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle className="w-3 h-3" />
                          Tayang
                        </Badge>
                      ) : g.status === "cancelled" ? (
                        <Badge variant="danger" className="text-xs">
                          Dibatalkan
                        </Badge>
                      ) : null)}

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
