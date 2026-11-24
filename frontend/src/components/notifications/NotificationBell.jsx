import React, { useState, useEffect, useCallback, useRef } from "react";
import { Bell, CheckCheck, RefreshCw, AlertCircle, Inbox } from "lucide-react";
import { notificationApi } from "../../api/client";

function formatNotifTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function NotificationBell({
  onOpenGroupById,
  onOpenSupport,
  refreshTrigger = 0,
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const containerRef = useRef(null);
  const hasLoadedRef = useRef(false);

  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const res = await notificationApi.list({ limit: 25 });
      if (!res?.success) {
        throw new Error(res?.message || "Gagal memuat notifikasi.");
      }
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unread_count || 0);
      setError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(err?.message || "Gagal memuat daftar notifikasi.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await fetchNotifications({ silent: hasLoadedRef.current });
    };
    run();
  }, [fetchNotifications, refreshTrigger]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications({ silent: true });
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchNotifications({ silent: notifications.length > 0 });
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await notificationApi.markAllRead();
      if (res?.success !== false) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch {
      // Keep current state cleanly if request fails
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = async (item) => {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await notificationApi.markRead(item.id);
      } catch {
        // Navigation still proceeds
      }
    }

    setOpen(false);
    if (item.related_group_id) {
      onOpenGroupById?.(item.related_group_id);
    } else if (item.type === "support_reply") {
      onOpenSupport?.();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifikasi"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        title="Notifikasi"
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-700 text-white text-[10px] font-bold leading-none inline-flex items-center justify-center tabular-nums"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Daftar notifikasi"
          className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Notifikasi
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 tabular-nums">
                  {unreadCount} baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-4 space-y-3" aria-label="Memuat notifikasi">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5 animate-pulse">
                    <div className="h-3 w-2/3 rounded bg-slate-200" />
                    <div className="h-2.5 w-full rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-center space-y-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 mx-auto" />
                <p className="text-xs text-slate-700">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchNotifications()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Muat Ulang
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <Inbox className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-medium text-slate-700">
                  Belum ada notifikasi baru.
                </p>
                <p className="text-[11px] text-slate-500">
                  Pembaruan status sesi, pendaftaran, dan balasan admin akan muncul di sini.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-2.5 ${
                    item.is_read
                      ? "bg-white hover:bg-slate-50 text-slate-900"
                      : "bg-emerald-50 hover:bg-emerald-100/80 text-emerald-950"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                      item.is_read ? "bg-transparent" : "bg-emerald-700"
                    }`}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs font-bold leading-snug ${
                          item.is_read ? "text-slate-800" : "text-emerald-950"
                        }`}
                      >
                        {item.title}
                      </p>
                      <span
                        className={`text-[10px] shrink-0 tabular-nums ${
                          item.is_read ? "text-slate-500" : "text-emerald-800"
                        }`}
                      >
                        {formatNotifTime(item.created_at)}
                      </span>
                    </div>
                    <p
                      className={`text-[11px] leading-relaxed line-clamp-2 ${
                        item.is_read ? "text-slate-600" : "text-emerald-900"
                      }`}
                    >
                      {item.message}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
