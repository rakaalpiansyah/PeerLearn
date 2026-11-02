import React from "react";
import {
  GraduationCap,
  LogIn,
  UserPlus,
  LogOut,
  BookOpen,
  PlusCircle,
  Calendar,
  Award,
  ShieldAlert,
} from "lucide-react";
import { Button } from "../ui/Button";
import { UserAvatar } from "../ui/UserAvatar";
import { useAuth } from "../../context/AuthContext";

export function Navbar({
  isBackendOnline,
  onOpenAuth,
  onOpenSkills,
  onOpenProfile,
  onOpenCreateGroup,
  onOpenMySessions,
  onOpenTutorSummary,
  onOpenModeration,
}) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-16 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-extrabold tracking-tight text-slate-900 leading-none block truncate">
                PeerLearn
              </span>
              <span className="text-[11px] font-medium text-slate-500 leading-tight block truncate mt-0.5">
                FST UIN SGD Bandung
              </span>
            </div>
          </div>

          {/* Center Nav Links (Desktop) */}
          <nav
            aria-label="Navigasi utama"
            className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600"
          >
            <a
              href="#katalog-sesi"
              className="hover:text-emerald-700 transition-colors"
            >
              Jelajahi Sesi
            </a>
            <a
              href="#komitmen-integritas"
              className="hover:text-emerald-700 transition-colors"
            >
              Tentang Komunitas
            </a>
            <button
              type="button"
              onClick={onOpenTutorSummary}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Panduan SKPI
            </button>
          </nav>

          {/* Actions */}
          <nav
            aria-label="Navigasi akun"
            className="flex items-center gap-1.5 sm:gap-2 shrink-0"
          >
            {isAuthenticated ? (
              <>
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onOpenCreateGroup}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Buka Sesi
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenMySessions}
                    className="border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Sesi Saya
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onOpenSkills}
                    className="text-slate-700 hover:bg-slate-100"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    Keahlian
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenTutorSummary}
                    className="border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    SKPI
                  </Button>

                  {user?.role === "admin" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenModeration}
                      className="border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 text-rose-800 gap-1.5"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      Moderasi
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-1 sm:gap-2 pl-1.5 sm:pl-2 md:border-l border-slate-200">
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    aria-label={`Profil ${user?.full_name || "saya"}`}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  >
                    <UserAvatar user={user} size="sm" />
                    <div className="hidden lg:block">
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {user?.full_name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {user?.role === "student"
                          ? user?.campus_name || "Mahasiswa"
                          : user?.role === "admin"
                            ? "Administrator"
                            : "Komunitas Kampus"}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    aria-label="Keluar"
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    title="Keluar"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenAuth("login")}
                  className="text-slate-700 hover:bg-slate-100"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Masuk
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenAuth("register")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Daftar
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {isAuthenticated && (
        <nav
          aria-label="Navigasi seluler"
          className={`fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_-4px_rgba(15,23,42,0.08)] px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] grid ${
            user?.role === "admin" ? "grid-cols-5" : "grid-cols-4"
          } gap-1`}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenMySessions}
            className="min-h-[48px] px-1 text-slate-700 hover:bg-slate-100 flex-col gap-1 text-[11px] font-semibold rounded-xl"
          >
            <Calendar
              aria-hidden="true"
              className="w-4 h-4 shrink-0 text-emerald-600"
            />
            <span className="truncate">Sesi Saya</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenCreateGroup}
            className="min-h-[48px] px-1 text-slate-700 hover:bg-slate-100 flex-col gap-1 text-[11px] font-semibold rounded-xl"
          >
            <PlusCircle
              aria-hidden="true"
              className="w-4 h-4 shrink-0 text-emerald-600"
            />
            <span className="truncate">Buka Sesi</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSkills}
            className="min-h-[48px] px-1 text-slate-700 hover:bg-slate-100 flex-col gap-1 text-[11px] font-semibold rounded-xl"
          >
            <BookOpen
              aria-hidden="true"
              className="w-4 h-4 shrink-0 text-emerald-600"
            />
            <span className="truncate">Keahlian</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenTutorSummary}
            className="min-h-[48px] px-1 text-slate-700 hover:bg-slate-100 flex-col gap-1 text-[11px] font-semibold rounded-xl"
          >
            <Award
              aria-hidden="true"
              className="w-4 h-4 shrink-0 text-emerald-600"
            />
            <span className="truncate">SKPI</span>
          </Button>
          {user?.role === "admin" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenModeration}
              className="min-h-[48px] px-1 text-rose-800 hover:bg-rose-50/70 flex-col gap-1 text-[11px] font-semibold rounded-xl"
            >
              <ShieldAlert
                aria-hidden="true"
                className="w-4 h-4 shrink-0 text-rose-600"
              />
              <span className="truncate">Moderasi</span>
            </Button>
          )}
        </nav>
      )}
    </>
  );
}
