import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  BookOpen,
  Sparkles,
  ArrowRight,
  PlusCircle,
  GraduationCap,
  Users,
  Video,
  MapPin,
  ShieldCheck,
  Award,
  Calendar,
  ListOrdered,
  AlertTriangle,
  UserX,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { UserAvatar } from "../components/ui/UserAvatar";
import { GroupCard } from "../components/groups/GroupCard";
import { LoadError } from "../components/ui/LoadError";
import { groupApi, systemApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = [
  "Semua",
  "Teknologi",
  "Teknik Elektro",
  "Teknik Lingkungan",
  "Matematika",
  "Fisika",
  "Kimia",
  "Biologi",
  "Agroteknologi",
  "Sains Data",
  "Desain",
  "Bahasa",
  "Soft Skills",
];

const PRIMARY_CATEGORIES = [
  "Semua",
  "Teknologi",
  "Teknik Elektro",
  "Teknik Lingkungan",
  "Matematika",
];

const PAGE_SIZE = 6;

export function HomePage({
  onStatusUpdate,
  onOpenAuth,
  onOpenSkills,
  onOpenProfile,
  onOpenCreateGroup,
  onOpenGroupDetail,
  onOpenTutorSummary,
  onOpenPublicProfile,
}) {
  const { user, isAuthenticated } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState(false);
  const groupsRequest = useRef(0);
  const [category, setCategory] = useState("Semua");
  const [format, setFormat] = useState("all"); // 'all' | 'online' | 'offline'
  const [search, setSearch] = useState("");
  const [catalogView, setCatalogView] = useState("all"); // 'all' | 'recommendations'
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState(false);
  const recommendationsRequest = useRef(0);

  const fetchGroups = async () => {
    const requestId = ++groupsRequest.current;
    setLoadingGroups(true);
    try {
      const res = await groupApi.list({
        category: category !== "Semua" ? category : undefined,
        format: format !== "all" ? format : undefined,
        search: search.trim() || undefined,
      });
      if (requestId !== groupsRequest.current) return;
      if (!res.success) throw new Error("Catalog request failed");
      setGroups(res.data || []);
      setGroupsError(false);
    } catch {
      if (requestId === groupsRequest.current) setGroupsError(true);
    } finally {
      if (requestId === groupsRequest.current) setLoadingGroups(false);
    }
  };

  const fetchRecommendations = async () => {
    if (!isAuthenticated) return;
    const requestId = ++recommendationsRequest.current;
    setLoadingRecs(true);
    try {
      const res = await groupApi.getRecommendations();
      if (requestId !== recommendationsRequest.current) return;
      if (!res.success) throw new Error("Recommendations request failed");
      setRecommendations(res.data || []);
      setRecommendationsError(false);
    } catch {
      if (requestId === recommendationsRequest.current)
        setRecommendationsError(true);
    } finally {
      if (requestId === recommendationsRequest.current) setLoadingRecs(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await systemApi.getHealth();
      if (res.success) {
        onStatusUpdate(true);
      }
    } catch {
      onStatusUpdate(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchGroups();
    return () => {
      groupsRequest.current += 1;
    };
  }, [category, format]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecommendations();
    }
    return () => {
      recommendationsRequest.current += 1;
    };
  }, [isAuthenticated, user?.skills]);

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchGroups();
  };

  const masteredSkills =
    user?.skills?.filter((s) => s.skill_type === "mastered") || [];
  const learningSkills =
    user?.skills?.filter((s) => s.skill_type === "learning") || [];

  const visibleCategories = isCategoriesExpanded
    ? CATEGORIES
    : PRIMARY_CATEGORIES.includes(category)
      ? PRIMARY_CATEGORIES
      : [...PRIMARY_CATEGORIES, category];

  const hiddenCategoryCount = CATEGORIES.length - PRIMARY_CATEGORIES.length;
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedGroups = groups.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Account restriction/suspension alerts */}
      {user?.account_status === "restricted" && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-xs"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm text-amber-950">
              Akun Anda Dibatasi Sementara oleh Sistem
            </p>
            <p className="text-amber-800">
              Akun Anda menerima pembatasan sementara karena adanya 3 laporan atau lebih dalam 7 hari terakhir yang sedang ditinjau administrator. Anda belum dapat membuka sesi baru atau bergabung ke sesi lain selama masa peninjauan.
            </p>
            {user.restriction_note && (
              <p className="italic bg-amber-100/70 p-2 rounded-lg border border-amber-200 mt-1">
                Catatan: {user.restriction_note}
              </p>
            )}
          </div>
        </div>
      )}

      {user?.account_status === "suspended" && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3 shadow-xs"
        >
          <UserX className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm text-rose-950">
              Akun Ditangguhkan oleh Administrator
            </p>
            <p className="text-rose-800">
              Akses akun Anda telah dinonaktifkan karena pelanggaran kebijakan komunitas FST.
            </p>
            {user.restriction_note && (
              <p className="italic bg-rose-100/70 p-2 rounded-lg border border-rose-200 mt-1">
                Alasan: {user.restriction_note}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Community Hero & Identity */}
      {isAuthenticated ? (
        <section className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-2xs">
          {/* Top Row: Clean Top-Down Identity Hierarchy */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <UserAvatar
                user={user}
                size="lg"
                className="w-12 h-12 sm:w-14 sm:h-14 text-sm sm:text-base ring-2 ring-emerald-100 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
                    {user.full_name}
                  </h1>
                  <Badge variant="success" className="text-[11px] py-0.5">
                    {user.role === "student" ? (
                      <>
                        <GraduationCap className="w-3 h-3" />
                        Mahasiswa Terverifikasi
                      </>
                    ) : (
                      <>
                        <Users className="w-3 h-3" />
                        Komunitas Kampus
                      </>
                    )}
                  </Badge>
                </div>

                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                  {user.campus_name ||
                    "Fakultas Sains & Teknologi, UIN Sunan Gunung Djati Bandung"}
                </p>

                {user.bio && (
                  <p className="text-xs text-slate-600 leading-relaxed pt-0.5 max-w-2xl">
                    {user.bio}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold inline-flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{user.contribution_points || 0} Poin Tutor</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSkills}
                className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                Atur Keahlian
              </Button>
            </div>
          </div>

          {/* Unified White & Emerald Skills Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3.5 border-t border-slate-100">
            <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Keahlian Membimbing (Tutor)
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200/80">
                  {masteredSkills.length} topik
                </span>
              </div>
              {masteredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {masteredSkills.map((s) => (
                    <span
                      key={s.skill_id}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-600 text-white shadow-2xs"
                    >
                      {s.skill?.name || "Keahlian"}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Belum ada keahlian tutor yang dipilih.{" "}
                  <button
                    type="button"
                    onClick={onOpenSkills}
                    className="text-emerald-700 font-semibold underline underline-offset-2 hover:text-emerald-800 cursor-pointer"
                  >
                    Tambah keahlian
                  </button>
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Target Materi yang Dipelajari
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {learningSkills.length} topik
                </span>
              </div>
              {learningSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {learningSkills.map((s) => (
                    <span
                      key={s.skill_id}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-emerald-900 border border-emerald-200 shadow-2xs"
                    >
                      {s.skill?.name || "Materi"}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Belum ada target materi belajar.{" "}
                  <button
                    type="button"
                    onClick={onOpenSkills}
                    className="text-emerald-700 font-semibold underline underline-offset-2 hover:text-emerald-800 cursor-pointer"
                  >
                    Pilih materi
                  </button>
                </p>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="relative p-6 sm:p-10 lg:p-12 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-center">
            {/* Left Column: Headline, Copy, Dual CTAs, Trust Bar */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                Fakultas Sains & Teknologi — UIN Sunan Gunung Djati Bandung
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Belajar Bareng Rekan <br className="hidden sm:inline" />
                <span className="text-slate-900">Mahasiswa FST, </span>
                <span className="text-emerald-600">Tanpa Biaya.</span>
              </h1>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
                Wadah kolaborasi akademis untuk 8 Program Studi FST UIN Sunan Gunung Djati Bandung. Temukan rekan belajar responsi praktikum laboratorium, bedah tugas koding & riset sains, persiapan UTS/UAS, dan bangun portofolio SKPI.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => onOpenAuth("register")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-6 py-3 font-semibold text-sm sm:text-base"
                >
                  Mulai Belajar Bersama
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    const el = document.getElementById("katalog-sesi");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="border-slate-300 text-slate-800 hover:bg-slate-50 px-6 py-3 font-semibold text-sm sm:text-base shadow-2xs"
                >
                  Jelajahi Katalog
                </Button>
              </div>

              {/* Social Proof Trust Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs">
                <div className="space-y-0.5">
                  <p className="text-sm font-extrabold text-slate-900 tracking-tight">100%</p>
                  <p className="text-[11px] text-slate-500 font-medium">Bebas Biaya</p>
                </div>
                <div className="space-y-0.5 sm:border-l sm:border-slate-200 sm:pl-3">
                  <p className="text-sm font-extrabold text-slate-900 tracking-tight">Daring & Luring</p>
                  <p className="text-[11px] text-slate-500 font-medium">Fleksibel</p>
                </div>
                <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
                  <p className="text-sm font-extrabold text-slate-900 tracking-tight">Verifikasi Email</p>
                  <p className="text-[11px] text-slate-500 font-medium">Resmi Kampus</p>
                </div>
                <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
                  <p className="text-sm font-extrabold text-slate-900 tracking-tight">Portofolio</p>
                  <p className="text-[11px] text-emerald-800 font-semibold">Bukti SKPI</p>
                </div>
              </div>
            </div>

            {/* Right Column: Study Session Card Preview */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm sm:max-w-md">
                <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Teknologi
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50/70 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Pendaftaran Terbuka
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      Algoritma & Struktur Data
                    </h2>
                    <div className="flex items-center gap-2.5 mt-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                        DP
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          Dimas Pratama
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          S1 Teknik Informatika — FST UIN SGD
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                    <div className="flex items-center gap-2 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Sabtu, 14:00 - 16:00 WIB</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <ListOrdered className="w-3.5 h-3.5 text-emerald-600" />
                      Agenda Pembahasan
                    </p>
                    <ul className="text-xs text-slate-600 space-y-1.5 pl-5 list-disc marker:text-emerald-600">
                      <li>Pembahasan konsep rekursi & dynamic programming</li>
                      <li>Latihan bedah soal & live code review</li>
                      <li>Tanya jawab persiapan ujian kuliah</li>
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Kuota Peserta
                    </span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      4 / 5 Terisi
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Explore & Filter Catalog */}
      <section id="katalog-sesi" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Jelajahi Sesi Belajar Komunitas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih kelompok belajar sesuai mata kuliah, program studi, dan jadwal Anda
            </p>
          </div>

          {/* Search bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative w-full sm:w-72 md:w-80 lg:w-96"
          >
            <input
              type="text"
              placeholder="Cari topik atau materi kuliah..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 placeholder:text-slate-400 shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>
        </div>

        {/* Unified Filter & Mode Control Bar */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Catalog Mode Tabs (All vs Smart Recommendations) */}
            {isAuthenticated ? (
              <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-full sm:w-fit">
                <button
                  type="button"
                  onClick={() => setCatalogView("all")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    catalogView === "all"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Semua Sesi</span>
                </button>
                <button
                  type="button"
                  aria-label="Direkomendasikan Untuk Anda"
                  onClick={() => {
                    setCatalogView("recommendations");
                    fetchRecommendations();
                  }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    catalogView === "recommendations"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-current" />
                  <span className="sm:hidden">Rekomendasi</span>
                  <span className="hidden sm:inline">Direkomendasikan Untuk Anda</span>
                  {recommendations.length > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                        catalogView === "recommendations"
                          ? "bg-white/20 text-white"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {recommendations.length}
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

            {/* Format Toggle (All / Online / Offline) */}
            {catalogView === "all" && (
              <div className="grid grid-cols-3 sm:inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0 w-full sm:w-fit">
                <button
                  type="button"
                  onClick={() => setFormat("all")}
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
                  onClick={() => setFormat("online")}
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
                  onClick={() => setFormat("offline")}
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

          {/* Collapsible Category Chips (No Horizontal Overflow!) */}
          {catalogView === "all" && (
            <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              {visibleCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    category === cat
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-50 text-slate-700 border border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/40"
                  }`}
                >
                  {cat}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsCategoriesExpanded((prev) => !prev)}
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

        {catalogView === "recommendations" ? (
          /* Smart Recommendations View */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5 text-xs text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  Sesi berikut dicocokkan otomatis berdasarkan target materi belajar Anda dan keahlian tutor penyelenggara.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSkills}
                className="shrink-0 text-xs border-emerald-300 bg-white hover:bg-emerald-100/50 text-emerald-800 self-start sm:self-auto"
              >
                Perbarui Minat Belajar
              </Button>
            </div>

            {recommendationsError && (
              <LoadError
                message="Rekomendasi belum dapat dimuat."
                onRetry={fetchRecommendations}
                isRetrying={loadingRecs}
                hasStaleData={recommendations.length > 0}
              />
            )}
            {loadingRecs && (
              <p role="status" className="text-sm text-slate-500">
                {recommendations.length > 0
                  ? "Memperbarui rekomendasi. Menampilkan data terakhir sementara."
                  : "Memuat rekomendasi sesi belajar..."}
              </p>
            )}
            {loadingRecs && recommendations.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-56 rounded-2xl bg-white border border-slate-200 animate-pulse p-5 space-y-3"
                  >
                    <div className="w-20 h-4 bg-slate-200 rounded"></div>
                    <div className="w-3/4 h-5 bg-slate-200 rounded"></div>
                    <div className="w-full h-12 bg-slate-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : recommendationsError &&
              recommendations.length === 0 ? null : learningSkills.length ===
              0 ? (
              <div className="py-14 text-center rounded-2xl bg-white border border-slate-200 p-8 space-y-4 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900">
                    Belum Ada Minat Belajar yang Ditentukan
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tentukan topik materi kuliah yang ingin Anda pelajari agar
                    sistem dapat menemukan tutor rekan sebaya yang tepat.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenSkills}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <BookOpen className="w-4 h-4" />
                  Atur Materi Belajar
                </Button>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="py-14 text-center rounded-2xl bg-white border border-slate-200 p-8 space-y-4 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900">
                    Belum Ada Sesi yang Cocok
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Belum ada kelompok belajar aktif untuk materi yang Anda cari
                    (
                    {learningSkills
                      .map((s) => s.skill?.name)
                      .filter(Boolean)
                      .join(", ")}
                    ). Buka sesi baru atau ajak rekan kampus!
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenCreateGroup}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <PlusCircle className="w-4 h-4" />
                  Buka Sesi Belajar Topik Ini
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {recommendations.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onClick={() => onOpenGroupDetail(group)}
                    onViewProfile={onOpenPublicProfile}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* General Catalog View with Pagination */
          <div className="space-y-5">
            {groupsError && (
              <LoadError
                message="Sesi belajar belum dapat dimuat."
                onRetry={fetchGroups}
                isRetrying={loadingGroups}
                hasStaleData={groups.length > 0}
              />
            )}
            {loadingGroups && (
              <p role="status" className="text-sm text-slate-500">
                {groups.length > 0
                  ? "Memperbarui katalog sesi. Menampilkan data terakhir sementara."
                  : "Memuat sesi belajar..."}
              </p>
            )}
            {loadingGroups && groups.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-56 rounded-2xl bg-white border border-slate-200 animate-pulse p-5 space-y-3"
                  >
                    <div className="w-20 h-4 bg-slate-200 rounded"></div>
                    <div className="w-3/4 h-5 bg-slate-200 rounded"></div>
                    <div className="w-full h-12 bg-slate-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : groupsError && groups.length === 0 ? null : groups.length ===
              0 ? (
              <div className="py-14 text-center rounded-2xl bg-white border border-slate-200 p-8 space-y-4 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-slate-900">
                    Belum Ada Sesi Belajar di Kategori Ini
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tidak ada sesi yang cocok dengan kriteria pencarian atau
                    filter Anda saat ini.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCategory("Semua");
                    setFormat("all");
                    setSearch("");
                  }}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Reset Semua Filter
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {paginatedGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onClick={() => onOpenGroupDetail(group)}
                      onViewProfile={onOpenPublicProfile}
                    />
                  ))}
                </div>

                {/* Pagination Bar when sessions exceed PAGE_SIZE */}
                {groups.length > PAGE_SIZE && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80 text-xs text-slate-600">
                    <span>
                      Menampilkan{" "}
                      <strong className="text-slate-900">
                        {(safeCurrentPage - 1) * PAGE_SIZE + 1}–
                        {Math.min(safeCurrentPage * PAGE_SIZE, groups.length)}
                      </strong>{" "}
                      dari{" "}
                      <strong className="text-slate-900">{groups.length}</strong>{" "}
                      sesi belajar
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={safeCurrentPage <= 1}
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className="px-2.5 py-1 min-h-[34px] text-xs"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Sebelumnya
                      </Button>

                      <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold">
                        {safeCurrentPage} / {totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="px-2.5 py-1 min-h-[34px] text-xs"
                      >
                        Berikutnya
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* 3 Pillars of Community Integrity & Campus Values */}
      <section id="komitmen-integritas" className="space-y-4 pt-6 border-t border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Komitmen Integritas Komunitas Belajar Sebaya
          </h2>
          <p className="text-xs text-slate-500">
            Prinsip utama interaksi dan pendampingan akademik mahasiswa di platform PeerLearn
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                100% Bebas Biaya & Nirlaba
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                Diinisiasi oleh sesama rekan mahasiswa atas dasar kepedulian akademik, tanpa pungutan biaya belajar apapun.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Verifikasi Identitas Kampus
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                Menghubungkan rekan belajar satu almamater dan sekitarnya menggunakan email institusi terpercaya (.ac.id).
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Portofolio Kontribusi (SKPI)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                Setiap dedikasi tutor diakui resmi dan dapat dicetak sebagai bukti Surat Keterangan Pendamping Ijazah.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
