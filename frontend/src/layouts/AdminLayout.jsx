import React from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  MessageSquareText,
  ShieldAlert,
  ExternalLink,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { UserAvatar } from "../components/ui/UserAvatar";
import { useAuth } from "../context/useAuth";

const NAV_ITEMS = [
  {
    id: "overview",
    label: "Ringkasan",
    mobileLabel: "Ringkasan",
    icon: LayoutDashboard,
    badgeKey: null,
  },
  {
    id: "approvals",
    label: "Verifikasi Sesi",
    mobileLabel: "ACC Sesi",
    icon: ClipboardCheck,
    badgeKey: "pendingApprovals",
  },
  {
    id: "support",
    label: "Pesan Mahasiswa",
    mobileLabel: "Pesan",
    icon: MessageSquareText,
    badgeKey: "openThreads",
  },
  {
    id: "moderation",
    label: "Laporan & Moderasi",
    mobileLabel: "Moderasi",
    icon: ShieldAlert,
    badgeKey: "pendingModeration",
  },
];

export function AdminLayout({
  children,
  activeTab = "approvals",
  onTabChange,
  counts = {},
  isBackendOnline = false,
  onPreviewStudentCatalog,
}) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-700 focus:text-white focus:font-semibold focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Lewati ke konten admin
      </a>

      {/* Top Institutional Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 truncate">
                  PeerLearn Admin
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isBackendOnline ? "bg-emerald-600" : "bg-amber-500"
                    }`}
                    aria-hidden="true"
                  />
                  Ruang Kendali UIN SGD
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 truncate">
                Kurasi Sesi, Layanan Mahasiswa, dan Penegakan Etika Akademik
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onPreviewStudentCatalog && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPreviewStudentCatalog}
                className="min-h-[40px] border-slate-300 text-slate-700 hover:bg-slate-50 text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="hidden sm:inline">Pratinjau Katalog</span>
                <span className="sm:hidden">Katalog</span>
              </Button>
            )}

            <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <UserAvatar user={user} size="sm" />
              <div className="min-w-0 max-w-[180px]">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.full_name || "Administrator"}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {user?.email || "Tim Admin UIN SGD"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              aria-label="Keluar dari akun admin"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-slate-100 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              title="Keluar"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden xl:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        <aside
          aria-label="Navigasi ruang admin"
          className="hidden lg:flex lg:w-64 xl:w-72 shrink-0 flex-col justify-between border-r border-slate-200 bg-white px-4 py-6"
        >
          <div className="space-y-6">
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Menu Operasional
              </p>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const count = item.badgeKey ? counts[item.badgeKey] || 0 : 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange && onTabChange(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`w-full min-h-[44px] flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                        isActive
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? "text-emerald-700" : "text-slate-500"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badgeKey && count > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums shrink-0 ${
                            item.id === "moderation"
                              ? "bg-rose-100 text-rose-800"
                              : item.id === "approvals"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-blue-100 text-blue-900"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <p className="text-xs font-bold text-slate-900">
                Antrean Kerja Bersama
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Seluruh pengajuan sesi, laporan, dan pesan bantuan mahasiswa
                dapat ditangani oleh admin mana pun yang sedang bertugas.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-0.5 px-2">
            <p className="font-semibold text-slate-700">
              UIN Sunan Gunung Djati Bandung
            </p>
            <p>Portal Kurasi & Moderasi Akademik</p>
          </div>
        </aside>

        {/* Workspace Content */}
        <main
          id="admin-main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-10 focus:outline-none"
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Navigasi seluler admin"
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white border-t border-slate-200 shadow-[0_-4px_20px_-4px_rgba(15,23,42,0.08)] px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] grid grid-cols-4 gap-1"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const count = item.badgeKey ? counts[item.badgeKey] || 0 : 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange && onTabChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative min-h-[48px] px-1 flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                isActive
                  ? "bg-emerald-50 text-emerald-900"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`w-4 h-4 shrink-0 ${
                  isActive ? "text-emerald-700" : "text-slate-500"
                }`}
              />
              <span className="truncate max-w-full">{item.mobileLabel}</span>
              {item.badgeKey && count > 0 && (
                <span className="absolute top-1 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
