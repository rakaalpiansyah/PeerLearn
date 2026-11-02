import React from "react";
import { GraduationCap } from "lucide-react";

export function Footer({ onOpenGuide }) {
  return (
    <footer className="w-full border-t border-slate-200 bg-white pt-8 pb-24 md:pb-8 text-xs text-slate-600">
      <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 pb-5 border-b border-slate-100 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-sm block leading-tight">
                PeerLearn
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kolaborasi Belajar Sebaya Mahasiswa FST UIN SGD Bandung
              </p>
            </div>
          </div>

          <nav
            aria-label="Tautan pedoman dan bantuan"
            className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:gap-5 text-xs font-medium text-slate-600 w-full sm:w-auto"
          >
            <button
              type="button"
              onClick={() => onOpenGuide && onOpenGuide("ethics")}
              className="min-h-[36px] sm:min-h-0 text-center hover:text-emerald-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
            >
              Etika Belajar Sebaya
            </button>
            <button
              type="button"
              onClick={() => onOpenGuide && onOpenGuide("skpi")}
              className="min-h-[36px] sm:min-h-0 text-center hover:text-emerald-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
            >
              Panduan SKPI
            </button>
            <button
              type="button"
              onClick={() => onOpenGuide && onOpenGuide("safety")}
              className="min-h-[36px] sm:min-h-0 text-center hover:text-emerald-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
            >
              Keamanan Komunitas
            </button>
            <button
              type="button"
              onClick={() => onOpenGuide && onOpenGuide("help")}
              className="min-h-[36px] sm:min-h-0 text-center hover:text-emerald-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
            >
              Pusat Bantuan
            </button>
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] text-slate-500 text-center sm:text-left">
          <p className="font-medium text-slate-600">
            © 2026 PeerLearn — Fakultas Sains & Teknologi
          </p>
          <p className="text-slate-400">
            UIN Sunan Gunung Djati Bandung
          </p>
        </div>
      </div>
    </footer>
  );
}
