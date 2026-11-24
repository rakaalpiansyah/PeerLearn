import React from "react";
import {
  Search,
  BookOpen,
  Sparkles,
  Video,
  MapPin,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";

export function CatalogFilterBar({
  isAuthenticated,
  search,
  onSearchChange,
  onSearchSubmit,
  catalogView,
  onCatalogViewChange,
  recommendationsCount,
  onFetchRecommendations,
  format,
  onFormatChange,
  category,
  onCategoryChange,
  visibleCategories,
  isCategoriesExpanded,
  onToggleCategories,
  hiddenCategoryCount,
}) {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Jelajahi Sesi Belajar Komunitas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pilih kelompok belajar sesuai mata kuliah, program studi, dan jadwal
            Anda
          </p>
        </div>

        {/* Search bar */}
        <form
          onSubmit={onSearchSubmit}
          className="relative w-full sm:w-72 md:w-80 lg:w-96"
        >
          <input
            type="text"
            placeholder="Cari topik atau materi kuliah..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 placeholder:text-slate-400 shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Unified Filter & Mode Control Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {isAuthenticated ? (
            <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-full sm:w-fit">
              <button
                type="button"
                onClick={() => onCatalogViewChange("all")}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  catalogView === "all"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Semua Sesi</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onCatalogViewChange("recommendations");
                  onFetchRecommendations();
                }}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  catalogView === "recommendations"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-current" />
                <span className="sm:hidden">Rekomendasi</span>
                <span className="hidden sm:inline">
                  Direkomendasikan Untuk Anda
                </span>
                {recommendationsCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                      catalogView === "recommendations"
                        ? "bg-white/20 text-white"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {recommendationsCount}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
              Filter Program Studi & Format Sesi
            </span>
          )}

          {catalogView === "all" && (
            <div className="grid grid-cols-3 sm:inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0 w-full sm:w-fit">
              <button
                type="button"
                onClick={() => onFormatChange("all")}
                className={`min-h-[32px] px-3 py-1 text-xs font-medium rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  format === "all"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => onFormatChange("online")}
                className={`min-h-[32px] px-3 py-1 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  format === "online"
                    ? "bg-white text-emerald-800 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Video className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Daring</span>
              </button>
              <button
                type="button"
                onClick={() => onFormatChange("offline")}
                className={`min-h-[32px] px-3 py-1 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  format === "offline"
                    ? "bg-white text-emerald-800 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Luring</span>
              </button>
            </div>
          )}
        </div>

        {/* Collapsible Category Chips */}
        {catalogView === "all" && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            {visibleCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  category === cat
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "bg-slate-50 text-slate-700 border border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/40"
                }`}
              >
                {cat}
              </button>
            ))}

            <button
              type="button"
              onClick={onToggleCategories}
              aria-expanded={isCategoriesExpanded}
              className="min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50/80 border border-emerald-200 hover:bg-emerald-100/80 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              {isCategoriesExpanded ? (
                <>
                  <span>Ringkas Kategori</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Semua Kategori (+{hiddenCategoryCount})</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
